import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { PrismaClient } from './types/prisma';
import { logger } from '@hoteliq/observability';

// Configure free embeddings provider
const getEmbeddingsProvider = () => {
  if (process.env.GEMINI_API_KEY) {
    return new GoogleGenerativeAIEmbeddings({
      model: 'embedding-001', // Gemini's free embedding model
      apiKey: process.env.GEMINI_API_KEY,
    });
  }
  
  // Fallback to OpenAI if available
  if (process.env.OPENAI_API_KEY) {
    const { OpenAIEmbeddings } = require('@langchain/openai');
    return new OpenAIEmbeddings({
      modelName: 'text-embedding-ada-002',
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }
  
  throw new Error('No embedding provider configured. Please set GEMINI_API_KEY or OPENAI_API_KEY');
};

let embeddingsProvider: any = null;

/**
 * Lazy initializer for embeddings provider to prevent errors during compile/build time
 * if API keys are not set yet.
 */
const getEmbeddings = () => {
  if (!embeddingsProvider) {
    embeddingsProvider = getEmbeddingsProvider();
  }
  return embeddingsProvider;
};

/**
 * Generates vector embeddings for a given text input.
 * @param text The input text string.
 * @returns 1536-dimension float vector.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const provider = getEmbeddings();
    const result = await provider.embedQuery(text);
    return result;
  } catch (error) {
    logger.error({ error, textLength: text.length }, 'Failed to generate embedding');
    throw error;
  }
}


export async function embedAllHotels(prisma: PrismaClient): Promise<{ processed: number; errors: number }> {
  const startTime = Date.now();
  let processed = 0;
  let errors = 0;

  try {
    logger.info('Starting hotel embeddings generation');

    // Fetch all HotelEmbedding records where embedding is null or empty
    const hotelEmbeddings = await prisma.hotelEmbedding.findMany({
      where: {
        OR: [
          { embedding: { equals: [] } },
        ],
      },
      include: {
        hotel: true,
      },
    });

    logger.info({ count: hotelEmbeddings.length }, 'Fetched hotel embeddings to process');

    for (const record of hotelEmbeddings) {
      try {
        // Generate embedding for textContent
        const embedding = await generateEmbedding(record.textContent);

        // Update PostgreSQL record with the vector
        await prisma.hotelEmbedding.update({
          where: { id: record.id },
          data: { embedding },
        });

        processed++;
        logger.info(
          {
            hotelId: record.hotelId,
            hotelName: record.hotel.name,
            embeddingDimension: embedding.length,
          },
          'Generated and saved embedding'
        );

        // Add small delay to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        errors++;
        logger.error(
          { error, hotelId: record.hotelId, recordId: record.id },
          'Failed to generate embedding for hotel'
        );
      }
    }

    const duration = Date.now() - startTime;
    logger.info(
      { processed, errors, durationMs: duration },
      'Embedding generation completed'
    );

    return { processed, errors };
  } catch (error) {
    logger.error({ error }, 'Embedding pipeline failed');
    throw error;
  }
}
