// Simple in-memory feature flag system
const FLAGS: Record<string, boolean | number | string> = {
  USE_ANTHROPIC_FALLBACK: true,
  ENABLE_FEEDBACK_LOOP: true,
  ENABLE_MULTI_CHANNEL: true,
  MAX_AGENT_RETRIES: 3,
  ENABLE_VECTOR_SEARCH: true,
  CACHE_EMBEDDINGS: true,
  DEBUG_AGENT_RESPONSES: false,
  MOCK_EXTERNAL_APIS: false,
};

export function getFlag(name: string): boolean | number | string | undefined {
  return FLAGS[name];
}

export function setFlag(name: string, value: boolean | number | string): void {
  FLAGS[name] = value;
}

export function getAllFlags(): Record<string, boolean | number | string> {
  return { ...FLAGS };
}

export function resetFlags(): void {
  // Reset to defaults
  FLAGS.USE_ANTHROPIC_FALLBACK = true;
  FLAGS.ENABLE_FEEDBACK_LOOP = true;
  FLAGS.ENABLE_MULTI_CHANNEL = true;
  FLAGS.MAX_AGENT_RETRIES = 3;
  FLAGS.ENABLE_VECTOR_SEARCH = true;
  FLAGS.CACHE_EMBEDDINGS = true;
  FLAGS.DEBUG_AGENT_RESPONSES = false;
  FLAGS.MOCK_EXTERNAL_APIS = false;
}

// Anthropic fallback implementation
export async function callLLMWithFallback<T>(
  primaryCall: () => Promise<T>,
  fallbackCall: () => Promise<T>,
  operationName: string = 'llm_call'
): Promise<T> {
  try {
    // Try primary call (OpenAI)
    return await primaryCall();
  } catch (error) {
    console.error(`Primary LLM call failed for ${operationName}:`, error);
    
    // Check if fallback is enabled
    if (getFlag('USE_ANTHROPIC_FALLBACK')) {
      try {
        console.log(`Using Anthropic fallback for ${operationName}`);
        return await fallbackCall();
      } catch (fallbackError) {
        console.error(`Fallback LLM call also failed for ${operationName}:`, fallbackError);
        throw new Error(`Both primary and fallback LLM calls failed for ${operationName}`);
      }
    } else {
      throw error;
    }
  }
}

// Retry logic with configurable attempts
export async function retryWithFlag<T>(
  operation: () => Promise<T>,
  operationName: string = 'operation'
): Promise<T> {
  const maxRetries = getFlag('MAX_AGENT_RETRIES') as number || 3;
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        console.error(`Operation ${operationName} failed after ${maxRetries} attempts:`, error);
        throw error;
      }
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.warn(`Operation ${operationName} failed on attempt ${attempt}, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}