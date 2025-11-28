// finance.service.js
import { prisma } from '../config/prismaClient.js';

const UNCATEGORIZED_NAME = 'Uncategorized';

// ============ HELPER ============

async function getOrCreateUncategorized(userId, type) {
  let category = await prisma.category.findFirst({
    where: { userId, name: UNCATEGORIZED_NAME, type },
  });

  if (!category) {
    category = await prisma.category.create({
      data: { userId, name: UNCATEGORIZED_NAME, type },
    });
  }

  return category;
}

// ============ TRANSACTIONS ============

export async function getTransactions(userId, { from, to, type, categoryId, skip = 0, take = 50 }) {
  const where = { userId };

  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }

  if (type) where.type = type;
  if (categoryId) where.categoryId = Number(categoryId);

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' },
      skip,
      take,
    }),
    prisma.transaction.count({ where }),
  ]);

  return { transactions, total };
}

export async function createTransaction(userId, data) {
  const { type, amount, categoryId, note, date } = data;

  return prisma.transaction.create({
    data: {
      userId,
      type,
      amount,
      categoryId: categoryId || null,
      note,
      date: date ? new Date(date) : new Date(),
    },
    include: { category: true },
  });
}

export async function updateTransaction(userId, id, data) {
  const existing = await prisma.transaction.findFirst({
    where: { id, userId },
  });

  if (!existing) throw new Error('Transaction not found');

  return prisma.transaction.update({
    where: { id },
    data: {
      type: data.type,
      amount: data.amount,
      categoryId: data.categoryId,
      note: data.note,
      date: data.date ? new Date(data.date) : undefined,
    },
    include: { category: true },
  });
}

export async function deleteTransaction(userId, id) {
  const existing = await prisma.transaction.findFirst({
    where: { id, userId },
  });

  if (!existing) throw new Error('Transaction not found');

  return prisma.transaction.delete({ where: { id } });
}

// ============ CATEGORIES ============

export async function getCategories(userId, type = null) {
  const where = { userId };
  if (type) where.type = type;

  return prisma.category.findMany({
    where,
    orderBy: { name: 'asc' },
  });
}

export async function createCategory(userId, data) {
  const { name, type } = data;

  // Check for duplicate
  const existing = await prisma.category.findFirst({
    where: { userId, name, type },
  });

  if (existing) throw new Error('Category already exists');

  return prisma.category.create({
    data: { userId, name, type },
  });
}

export async function updateCategory(userId, id, data) {
  const existing = await prisma.category.findFirst({
    where: { id, userId },
  });

  if (!existing) throw new Error('Category not found');

  // Prevent renaming Uncategorized
  if (existing.name === UNCATEGORIZED_NAME) {
    throw new Error('Cannot modify Uncategorized category');
  }

  return prisma.category.update({
    where: { id },
    data: { name: data.name },
  });
}

export async function deleteCategory(userId, id) {
  const existing = await prisma.category.findFirst({
    where: { id, userId },
    include: { transactions: true },
  });

  if (!existing) throw new Error('Category not found');

  // Prevent deleting Uncategorized
  if (existing.name === UNCATEGORIZED_NAME) {
    throw new Error('Cannot delete Uncategorized category');
  }

  // Move transactions to Uncategorized
  if (existing.transactions.length > 0) {
    const uncategorized = await getOrCreateUncategorized(userId, existing.type);

    await prisma.transaction.updateMany({
      where: { categoryId: id },
      data: { categoryId: uncategorized.id },
    });
  }

  // Delete associated budget if exists
  await prisma.budget.deleteMany({ where: { categoryId: id } });

  return prisma.category.delete({ where: { id } });
}

// ============ BUDGETS ============

export async function getBudgets(userId) {
  return prisma.budget.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { category: { name: 'asc' } },
  });
}

export async function upsertBudget(userId, data) {
  const { categoryId, monthlyLimit, alertThreshold = 80 } = data;

  // Verify category belongs to user and is expense type
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });

  if (!category) throw new Error('Category not found');
  if (category.type !== 'expense') throw new Error('Budgets can only be set for expense categories');

  return prisma.budget.upsert({
    where: { categoryId },
    update: { monthlyLimit, alertThreshold },
    create: { userId, categoryId, monthlyLimit, alertThreshold },
    include: { category: true },
  });
}

export async function deleteBudget(userId, id) {
  const existing = await prisma.budget.findFirst({
    where: { id, userId },
  });

  if (!existing) throw new Error('Budget not found');

  return prisma.budget.delete({ where: { id } });
}

// ============ SUMMARY ============

export async function getFinanceSummary(userId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Get monthly totals
  const monthlyTransactions = await prisma.transaction.groupBy({
    by: ['type'],
    where: {
      userId,
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    _sum: { amount: true },
  });

  const income = monthlyTransactions.find(t => t.type === 'income')?._sum?.amount || 0;
  const expenses = monthlyTransactions.find(t => t.type === 'expense')?._sum?.amount || 0;
  const balance = Number(income) - Number(expenses);

  // Get budget alerts
  const budgets = await prisma.budget.findMany({
    where: { userId },
    include: { category: true },
  });

  const budgetAlerts = [];

  for (const budget of budgets) {
    const spent = await prisma.transaction.aggregate({
      where: {
        userId,
        categoryId: budget.categoryId,
        type: 'expense',
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amount: true },
    });

    const spentAmount = Number(spent._sum?.amount || 0);
    const limitAmount = Number(budget.monthlyLimit);
    const percentUsed = limitAmount > 0 ? Math.round((spentAmount / limitAmount) * 100) : 0;

    if (percentUsed >= budget.alertThreshold) {
      budgetAlerts.push({
        categoryId: budget.categoryId,
        categoryName: budget.category.name,
        spent: spentAmount,
        limit: limitAmount,
        percentUsed,
        exceeded: percentUsed >= 100,
      });
    }
  }

  // Get expenses by category for the month
  const expensesByCategory = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: {
      userId,
      type: 'expense',
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    _sum: { amount: true },
  });

  // Enrich with category names
  const categoryIds = expensesByCategory.map(e => e.categoryId).filter(Boolean);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
  });

  const categoryMap = Object.fromEntries(categories.map(c => [c.id, c.name]));

  const expensesBreakdown = expensesByCategory.map(e => ({
    categoryId: e.categoryId,
    categoryName: e.categoryId ? categoryMap[e.categoryId] || 'Unknown' : 'Uncategorized',
    amount: Number(e._sum?.amount || 0),
  }));

  return {
    income: Number(income),
    expenses: Number(expenses),
    balance,
    budgetAlerts,
    expensesBreakdown,
    period: {
      from: startOfMonth,
      to: endOfMonth,
    },
  };
}
