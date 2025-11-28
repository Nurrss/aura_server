import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { ENV } from '../config/env.js';
import logger from '../config/logger.js';

let llmClient = null;
let provider = null;

// Initialize LLM client (OpenAI or Groq)
function initLLM() {
  provider = ENV.LLM_PROVIDER;

  if (provider === 'groq') {
    if (!ENV.GROQ_API_KEY) {
      logger.warn('Groq API key not configured. LLM features will be disabled.');
      return null;
    }
    llmClient = new Groq({
      apiKey: ENV.GROQ_API_KEY,
    });
    logger.info('LLM service initialized with Groq');
  } else if (provider === 'openai') {
    if (!ENV.OPENAI_API_KEY) {
      logger.warn('OpenAI API key not configured. LLM features will be disabled.');
      return null;
    }
    llmClient = new OpenAI({
      apiKey: ENV.OPENAI_API_KEY,
    });
    logger.info('LLM service initialized with OpenAI');
  } else {
    logger.warn('No valid LLM provider configured. LLM features will be disabled.');
    return null;
  }

  return llmClient;
}

/**
 * Call OpenAI API with retry logic
 * @param {Object} options - Options for the API call
 * @param {string} options.prompt - The prompt to send
 * @param {string} options.systemPrompt - System message
 * @param {number} options.temperature - Temperature for generation
 * @param {number} options.maxTokens - Max tokens to generate
 * @param {number} options.retries - Number of retries (default: 3)
 * @returns {Promise<string>} - The generated response
 */
async function callLLM({
  prompt,
  systemPrompt = 'You are a helpful assistant specialized in life planning and goal setting.',
  temperature = ENV.LLM_TEMPERATURE,
  maxTokens = ENV.LLM_MAX_TOKENS,
  retries = 3,
}) {
  if (!llmClient) {
    llmClient = initLLM();
  }

  if (!llmClient) {
    throw new Error('LLM service not available. Please configure API key.');
  }

  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const startTime = Date.now();

      const response = await llmClient.chat.completions.create({
        model: ENV.LLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature,
        max_tokens: maxTokens,
        timeout: 30000, // 30 seconds timeout
      });

      const duration = Date.now() - startTime;
      const tokensUsed = response.usage?.total_tokens || 0;

      logger.info('LLM call successful', {
        provider: ENV.LLM_PROVIDER,
        model: ENV.LLM_MODEL,
        duration,
        tokensUsed,
        attempt,
      });

      return response.choices[0].message.content;
    } catch (error) {
      lastError = error;
      logger.warn(`LLM call failed (attempt ${attempt}/${retries})`, {
        error: error.message,
      });

      if (attempt < retries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  logger.error('LLM call failed after all retries', {
    error: lastError.message,
  });
  throw lastError;
}

/**
 * Generate structured JSON response from LLM
 * @param {Object} options - Options for the API call
 * @param {string} options.prompt - The prompt to send
 * @param {string} options.systemPrompt - System message
 * @param {Object} options.schema - Expected JSON schema (for documentation)
 * @returns {Promise<Object>} - Parsed JSON response
 */
async function callLLMJSON({
  prompt,
  systemPrompt,
  schema,
  temperature = 0.5,
  maxTokens = ENV.LLM_MAX_TOKENS,
}) {
  // Add JSON formatting instruction to prompt
  const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON. No additional text or explanations.`;

  const response = await callLLM({
    prompt: jsonPrompt,
    systemPrompt,
    temperature,
    maxTokens,
  });

  try {
    // Try to extract JSON from response (handles cases where LLM adds extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;
  } catch (error) {
    logger.error('Failed to parse LLM JSON response', {
      error: error.message,
      response: response.substring(0, 200),
    });
    throw new Error(`Failed to parse LLM JSON response: ${error.message}`);
  }
}

/**
 * Generate goals from user input
 * @param {Object} personalityData - User's personality profile
 * @param {Array} lifeAreas - Life areas with current and desired states
 * @returns {Promise<Object>} - Generated goals
 */
async function generateGoals(personalityData, lifeAreas) {
  const systemPrompt = `You are an expert life coach and productivity consultant helping users create achievable 5-year goals.`;

  const prompt = `
User's personality: ${JSON.stringify(personalityData)}

Life areas:
${lifeAreas.map((area, i) => `${i + 1}. ${area.category}
   Current: ${area.currentState}
   Desired: ${area.desiredState}
   Importance: ${area.importance}/5
   Time commitment: ${area.timeCommitment}`).join('\n\n')}

Generate 1-3 specific, measurable goals for each life area that:
1. Bridge the gap from current to desired state
2. Are achievable within 5 years
3. Follow SMART criteria (Specific, Measurable, Achievable, Relevant, Time-bound)
4. Align with the user's personality

Respond with JSON in this exact format:
{
  "goals": [
    {
      "category": "career",
      "title": "Clear, concise goal title",
      "description": "Detailed description of what success looks like",
      "successCriteria": "Specific, measurable criteria for completion",
      "targetYear": 1-5,
      "estimatedWeeklyHours": number,
      "priority": 1-5
    }
  ]
}`;

  return await callLLMJSON({
    prompt,
    systemPrompt,
    temperature: 0.7,
  });
}

/**
 * Generate milestones for a goal
 * @param {Object} goal - The goal object
 * @param {Object} constraints - Time and resource constraints
 * @returns {Promise<Object>} - Generated milestones
 */
async function generateMilestones(goal, constraints = {}) {
  const systemPrompt = `You are a project planning expert breaking down long-term goals into quarterly milestones.`;

  const prompt = `
Goal: ${goal.title}
Description: ${goal.description}
Target year: ${goal.targetYear}
Available time: ${constraints.weeklyHours || 10} hours/week

Create 4-5 quarterly milestones for this goal that:
1. Build progressively toward the goal
2. Each can be completed within 3 months
3. Respect time constraints
4. Include buffer time for unexpected challenges

Respond with JSON in this exact format:
{
  "milestones": [
    {
      "quarter": 1-4,
      "year": 1-5,
      "title": "Milestone title",
      "description": "What will be accomplished",
      "estimatedHours": number,
      "priority": 1-5
    }
  ]
}`;

  return await callLLMJSON({
    prompt,
    systemPrompt,
    temperature: 0.5,
  });
}

/**
 * Generate tasks for a milestone
 * @param {Object} milestone - The milestone object
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Generated tasks
 */
async function generateTasks(milestone, options = {}) {
  const systemPrompt = `You are a task management expert creating actionable daily tasks from milestones.`;

  const prompt = `
Milestone: ${milestone.title}
Description: ${milestone.description}
Due date: ${milestone.dueDate}
Days remaining: ${options.daysRemaining || 30}

Generate 5-10 specific tasks that:
1. Contribute directly to milestone completion
2. Can each be completed in 30-120 minutes
3. Are ordered by logical dependencies
4. Are concrete and actionable

Respond with JSON in this exact format:
{
  "tasks": [
    {
      "title": "Action-oriented task title starting with verb",
      "description": "Clear instructions for completing task",
      "estimatedMinutes": 30-120,
      "priority": "low" | "normal" | "high"
    }
  ]
}`;

  return await callLLMJSON({
    prompt,
    systemPrompt,
    temperature: 0.6,
  });
}

// Named exports for convenience
export { initLLM, callLLM, callLLMJSON, generateGoals, generateMilestones, generateTasks };

// Default export for backward compatibility
export default {
  initLLM,
  callLLM,
  callLLMJSON,
  generateGoals,
  generateMilestones,
  generateTasks,
};
