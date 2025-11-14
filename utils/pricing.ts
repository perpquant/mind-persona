// A map of model names to their pricing per 1 million tokens (input/output).
// These are example prices and should be updated with the latest official figures.
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
    'gemini-2.5-pro': { input: 3.50, output: 10.50 },
    'gemini-2.5-flash': { input: 0.35, output: 1.05 },
    'gemini-flash-latest': { input: 0.35, output: 1.05 },
    // Image models are often priced per-image, but we can create a token-based approximation.
    // This is a simplified example.
    'gemini-2.5-flash-image': { input: 0.00, output: 0.0025 }, 
    'default': { input: 0.35, output: 1.05 }
};

/**
 * Calculates the estimated cost of a Gemini API call.
 * @param model - The name of the model used.
 * @param promptTokens - The number of tokens in the input prompt.
 * @param candidateTokens - The number of tokens in the generated response.
 * @returns The estimated cost in USD.
 */
export const calculateCost = (model: string, promptTokens: number, candidateTokens: number): number => {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['default'];
    const inputCost = (promptTokens / 1_000_000) * pricing.input;
    const outputCost = (candidateTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
};
