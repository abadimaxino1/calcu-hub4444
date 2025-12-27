const prisma = require('../db.cjs');

/**
 * AI Service Library
 * Handles prompt templates, versioning, fallback logic, and usage logging.
 */

class AiService {
  /**
   * Execute an AI feature with fallback support
   * @param {string} featureKey - The key of the feature (e.g., 'blog_generation')
   * @param {Object} variables - Variables to inject into the prompt
   * @param {Object} options - Override options (model, provider, etc.)
   */
  async execute(featureKey, variables = {}, options = {}) {
    const startTime = Date.now();
    
    // 1. Get Fallback Rule
    const fallbackRule = await prisma.aiFallbackRule.findUnique({ where: { featureKey } });
    const providers = fallbackRule 
      ? [fallbackRule.primaryProvider, ...JSON.parse(fallbackRule.fallbackChainJson)]
      : ['openai']; // Default to openai if no rule

    // 2. Get Template
    const template = await prisma.aiPromptTemplate.findUnique({ where: { key: featureKey } });
    if (!template) {
      throw new Error(`AI Template not found for feature: ${featureKey}`);
    }

    const versionId = options.versionId || template.activeVersionId;
    if (!versionId) {
      throw new Error(`No active version for AI Template: ${featureKey}`);
    }

    const version = await prisma.aiPromptVersion.findUnique({ where: { id: versionId } });
    if (!version) {
      throw new Error(`AI Template Version not found for template: ${featureKey}`);
    }

    let promptText = version.promptText;
    // Simple variable injection
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      promptText = promptText.replace(regex, variables[key]);
    });

    const modelPrefs = version.modelPreferencesJson ? JSON.parse(version.modelPreferencesJson) : {};
    
    let lastError = null;
    for (const provider of providers) {
      try {
        const result = await this._callProvider(provider, modelPrefs.model || options.model, promptText, options);
        
        const latencyMs = Date.now() - startTime;
        
        // Log usage
        await prisma.aiUsageLog.create({
          data: {
            provider,
            model: result.model,
            featureKey,
            tokensIn: Math.round(result.tokensIn),
            tokensOut: Math.round(result.tokensOut),
            latencyMs,
            estimatedCost: result.estimatedCost,
            userId: options.userId,
            status: 'success'
          }
        });

        return result.text;
      } catch (err) {
        lastError = err;
        console.error(`AI Provider ${provider} failed:`, err.message);
        
        // Log failure
        await prisma.aiUsageLog.create({
          data: {
            provider,
            model: modelPrefs.model || 'unknown',
            featureKey,
            latencyMs: Date.now() - startTime,
            userId: options.userId,
            status: 'error',
            errorCode: err.code || 'UNKNOWN_ERROR'
          }
        });

        // Continue to next provider in fallback chain
      }
    }

    throw new Error(`AI execution failed for all providers. Last error: ${lastError.message}`);
  }

  /**
   * Mock provider call - in a real app, this would call OpenAI/Gemini APIs
   */
  async _callProvider(provider, model, prompt, options) {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock response based on provider
    if (provider === 'fail_test') {
      const err = new Error('Simulated provider failure');
      err.code = 'SIMULATED_FAILURE';
      throw err;
    }

    return {
      text: `[Mock ${provider} response for model ${model}] Generated content for: ${prompt.substring(0, 50)}...`,
      model: model || 'gpt-4o',
      tokensIn: prompt.length / 4,
      tokensOut: 100,
      estimatedCost: 0.002
    };
  }
}

module.exports = new AiService();
