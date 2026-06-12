import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatGroq } from '@langchain/groq';

export type LLMProvider = 'gemini' | 'groq' | 'openai' | 'ollama';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string;
  modelName: string;
  temperature: number;
  maxTokens?: number;
}

export class UniversalLLM {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  createInstance() {
    switch (this.config.provider) {
      case 'gemini':
        return new ChatGoogleGenerativeAI({
          model: this.config.modelName || 'gemini-pro',
          temperature: this.config.temperature,
          apiKey: this.config.apiKey || process.env.GEMINI_API_KEY,
        });

      case 'groq':
        return new ChatGroq({
          model: this.config.modelName || 'llama3-8b-8192',
          temperature: this.config.temperature,
          apiKey: this.config.apiKey || process.env.GROQ_API_KEY,
        });

      case 'openai':
        // Legacy fallback
        const { ChatOpenAI } = require('@langchain/openai');
        return new ChatOpenAI({
          modelName: this.config.modelName || 'gpt-4o-mini',
          temperature: this.config.temperature,
          openAIApiKey: this.config.apiKey || process.env.OPENAI_API_KEY,
        });

      case 'ollama':
        // Local Ollama instance
        const { ChatOllama } = require('@langchain/ollama');
        return new ChatOllama({
          model: this.config.modelName || 'llama2',
          temperature: this.config.temperature,
          baseUrl: 'http://localhost:11434',
        });

      default:
        throw new Error(`Unsupported LLM provider: ${this.config.provider}`);
    }
  }
}

// Default configurations for different use cases
export const LLM_CONFIGS = {
  // Research Agent - needs analytical capabilities
  research: {
    provider: (process.env.LLM_PROVIDER as LLMProvider) || 'gemini',
    modelName: process.env.LLM_PROVIDER === 'gemini' ? 'gemini-pro' : 
              process.env.LLM_PROVIDER === 'groq' ? 'mixtral-8x7b-32768' : 'gpt-4o-mini',
    temperature: 0.3,
  },

  // Decisioning Agent - needs logical reasoning
  decisioning: {
    provider: (process.env.LLM_PROVIDER as LLMProvider) || 'gemini', 
    modelName: process.env.LLM_PROVIDER === 'gemini' ? 'gemini-pro' :
              process.env.LLM_PROVIDER === 'groq' ? 'llama3-70b-8192' : 'gpt-4o-mini',
    temperature: 0.2,
  },

  // Execution Agent - needs creative content generation
  execution: {
    provider: (process.env.LLM_PROVIDER as LLMProvider) || 'gemini',
    modelName: process.env.LLM_PROVIDER === 'gemini' ? 'gemini-pro' :
              process.env.LLM_PROVIDER === 'groq' ? 'llama3-8b-8192' : 'gpt-4o-mini', 
    temperature: 0.7,
  },
} as const;

// Helper function to create LLM instance
export function createLLM(type: keyof typeof LLM_CONFIGS) {
  const config = LLM_CONFIGS[type];
  const llm = new UniversalLLM(config);
  return llm.createInstance();
}