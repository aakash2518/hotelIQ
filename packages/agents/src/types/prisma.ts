// Mock Prisma types for development when client is not generated yet

export interface Hotel {
  id: string;
  name: string;
  city: string;
  country: string;
  starRating: number;
  createdAt: Date;
  prices: HotelPrice[];
  embeddings: HotelEmbedding[];
}

export interface HotelPrice {
  id: string;
  hotelId: string;
  hotel: Hotel;
  source: string;
  priceUSD: number;
  checkIn: Date;
  checkOut: Date;
  recordedAt: Date;
}

export interface HotelEmbedding {
  id: string;
  hotelId: string;
  hotel: Hotel;
  embedding: number[];
  textContent: string;
  createdAt: Date;
}

export interface Campaign {
  id: string;
  name: string;
  targetCity: string;
  targetSegment: string;
  channel: string;
  content: string;
  status: string;
  metrics?: any;
  agentDecision?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentLog {
  id: string;
  agentName: string;
  action: string;
  input: any;
  output: any;
  latencyMs: number;
  tokenCost?: number;
  confidence?: number;
  createdAt: Date;
}

// Mock PrismaClient interface
export interface MockPrismaClient {
  hotel: {
    findMany: (args?: any) => Promise<any>;
    findUnique: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
  hotelPrice: {
    findMany: (args?: any) => Promise<any>;
    create: (args: any) => Promise<any>;
  };
  hotelEmbedding: {
    findMany: (args?: any) => Promise<any>;
    findFirst: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
  campaign: {
    findMany: (args?: any) => Promise<any>;
    findUnique: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
  agentLog: {
    findMany: (args?: any) => Promise<any>;
    create: (args: any) => Promise<any>;
  };
  $executeRawUnsafe: (sql: string) => Promise<any>;
}

// Export as PrismaClient for compatibility
export type PrismaClient = MockPrismaClient;