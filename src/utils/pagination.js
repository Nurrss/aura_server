// pagination.js
/**
 * Parse and validate pagination parameters
 * @param {Object} query - Express request query object
 * @returns {Object} - { page, limit, skip, take }
 */
export const parsePaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 50));
  const skip = (page - 1) * limit;
  const take = limit;

  return { page, limit, skip, take };
};

/**
 * Build paginated response with metadata
 * @param {Array} data - Array of items
 * @param {Number} total - Total count of items
 * @param {Number} page - Current page
 * @param {Number} limit - Items per page
 * @returns {Object} - Paginated response object
 */
export const buildPaginatedResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev,
    },
  };
};
