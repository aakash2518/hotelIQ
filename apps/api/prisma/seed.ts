import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hoteliq';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 6 Target cities
const cities = [
  { name: 'Paris', country: 'France' },
  { name: 'Dubai', country: 'UAE' },
  { name: 'Tokyo', country: 'Japan' },
  { name: 'Barcelona', country: 'Spain' },
  { name: 'New York', country: 'USA' },
  { name: 'Bali', country: 'Indonesia' },
];

// 5 Hotels per city = 30 hotels total
const hotelsData = [
  // Paris
  { name: 'Palace Vendôme', city: 'Paris', country: 'France', starRating: 5 },
  { name: 'Hotel Le Marais', city: 'Paris', country: 'France', starRating: 4 },
  { name: 'Eiffel Boutique', city: 'Paris', country: 'France', starRating: 3 },
  { name: 'Budget Inn Paris', city: 'Paris', country: 'France', starRating: 2 },
  { name: 'Parisian Backpacker Hostel', city: 'Paris', country: 'France', starRating: 1 },
  // Dubai
  { name: 'Burj View Hotel', city: 'Dubai', country: 'UAE', starRating: 5 },
  { name: 'Marina Suites', city: 'Dubai', country: 'UAE', starRating: 4 },
  { name: 'Desert Rose Inn', city: 'Dubai', country: 'UAE', starRating: 3 },
  { name: 'Dubai Budget Stay', city: 'Dubai', country: 'UAE', starRating: 2 },
  { name: 'Deira Oasis Rooms', city: 'Dubai', country: 'UAE', starRating: 1 },
  // Tokyo
  { name: 'Tokyo Palace', city: 'Tokyo', country: 'Japan', starRating: 5 },
  { name: 'Shinjuku Grand', city: 'Tokyo', country: 'Japan', starRating: 4 },
  { name: 'Akihabara Inn', city: 'Tokyo', country: 'Japan', starRating: 3 },
  { name: 'Capsule & Co', city: 'Tokyo', country: 'Japan', starRating: 2 },
  { name: 'Asakusa Ryokan', city: 'Tokyo', country: 'Japan', starRating: 1 },
  // Barcelona
  { name: 'Barcelona Palace', city: 'Barcelona', country: 'Spain', starRating: 5 },
  { name: 'Gothic Quarter Hotel', city: 'Barcelona', country: 'Spain', starRating: 4 },
  { name: 'Camp Nou Suites', city: 'Barcelona', country: 'Spain', starRating: 3 },
  { name: 'Barcelona Beach Stay', city: 'Barcelona', country: 'Spain', starRating: 2 },
  { name: 'Ramblas Backpacker rooms', city: 'Barcelona', country: 'Spain', starRating: 1 },
  // New York
  { name: 'The Plaza NYC', city: 'New York', country: 'USA', starRating: 5 },
  { name: 'Manhattan View', city: 'New York', country: 'USA', starRating: 4 },
  { name: 'Brooklyn Boutique', city: 'New York', country: 'USA', starRating: 3 },
  { name: 'NYC Budget Inn', city: 'New York', country: 'USA', starRating: 2 },
  { name: 'Broadway Hostel NYC', city: 'New York', country: 'USA', starRating: 1 },
  // Bali
  { name: 'Seminyak Villas', city: 'Bali', country: 'Indonesia', starRating: 5 },
  { name: 'Ubud Jungle Resort', city: 'Bali', country: 'Indonesia', starRating: 4 },
  { name: 'Kuta Beach Hotel', city: 'Bali', country: 'Indonesia', starRating: 3 },
  { name: 'Bali Backpackers', city: 'Bali', country: 'Indonesia', starRating: 2 },
  { name: 'Denpasar Eco Lodge', city: 'Bali', country: 'Indonesia', starRating: 1 },
];

const sources = ['booking.com', 'expedia', 'hotels.com'];

/**
 * Calculates a base price based on star rating.
 */
function getBasePrice(starRating: number): number {
  switch (starRating) {
    case 5: return 500;
    case 4: return 300;
    case 3: return 180;
    case 2: return 90;
    default: return 45;
  }
}

async function main() {
  console.log('🌱 Starting rich database seeding...');

  // Clear existing database tables in correct dependency order
  await prisma.hotelPrice.deleteMany();
  await prisma.hotelEmbedding.deleteMany();
  await prisma.hotel.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.agentLog.deleteMany();

  console.log('✨ Cleared existing tables');

  // 1. Create Hotels
  const hotels = [];
  for (const hotelInfo of hotelsData) {
    const hotel = await prisma.hotel.create({
      data: {
        name: hotelInfo.name,
        city: hotelInfo.city,
        country: hotelInfo.country,
        starRating: hotelInfo.starRating,
      },
    });
    hotels.push(hotel);
  }
  console.log(`✓ Created ${hotels.length} hotels`);

  // 2. Create Price records: 90 days of daily prices per hotel
  let priceCount = 0;
  const priceRecords = [];
  const now = new Date();

  console.log('⚡ Generating 90 days of prices per hotel...');

  for (const hotel of hotels) {
    const basePrice = getBasePrice(hotel.starRating);

    for (let day = 0; day < 90; day++) {
      const recordedAt = new Date(now.getTime() - (89 - day) * 24 * 60 * 60 * 1000);
      const dayOfWeek = recordedAt.getDay(); // 0 = Sunday, 6 = Saturday

      // Weekend prices are higher (Friday & Saturday)
      let price = basePrice;
      if (dayOfWeek === 5 || dayOfWeek === 6) {
        price *= 1.25; // 25% higher on weekends
      }

      // Flash sales - 20-30% drops occurring every 15 days
      const isFlashSale = day % 15 === 0;
      if (isFlashSale) {
        price *= 0.75; // 25% drop
      }

      // Add small daily random variation (-3% to +3%)
      const variation = 1 + (Math.random() * 0.06 - 0.03);
      price = Math.round(price * variation * 100) / 100;

      // Choose a source at random
      const source = sources[day % sources.length];
      
      const checkIn = new Date(recordedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      const checkOut = new Date(checkIn.getTime() + 2 * 24 * 60 * 60 * 1000);

      priceRecords.push({
        hotelId: hotel.id,
        source,
        priceUSD: price,
        checkIn,
        checkOut,
        recordedAt,
      });
    }
  }

  // Bulk create in chunks to avoid overwhelming postgres memory bounds
  const chunkSize = 1000;
  for (let i = 0; i < priceRecords.length; i += chunkSize) {
    const chunk = priceRecords.slice(i, i + chunkSize);
    await prisma.hotelPrice.createMany({
      data: chunk,
    });
    priceCount += chunk.length;
  }
  console.log(`✓ Created ${priceCount} price records`);

  // 3. Create Campaigns (8 pre-seeded campaigns)
  const campaigns = [
    // 3 Completed (with metrics)
    {
      name: 'Paris Luxury Summer Getaway',
      targetCity: 'Paris',
      targetSegment: 'luxury',
      channel: 'email',
      content: 'Experience Paris in Style! Enjoy 25% off luxury hotel suites this summer. Book today to lock in premium rates at Palace Vendôme and other top stays.',
      status: 'completed',
      metrics: { sent: 4500, opened: 1850, clicked: 390, converted: 92 },
      agentDecision: { reasoning: 'Paris luxury pricing dropped below 90-day moving average. Selected email as historical high-ROI channel for luxury travelers.', confidence: 0.89, expectedCTR: 7.8 },
      createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
    },
    {
      name: 'Dubai Flash Deals',
      targetCity: 'Dubai',
      targetSegment: 'budget',
      channel: 'push',
      content: 'Burj Views for Less! Dubai hotels starting from just $45/night. Tap now to secure this limited flash deal.',
      status: 'completed',
      metrics: { sent: 12000, opened: 4800, clicked: 890, converted: 198 },
      agentDecision: { reasoning: 'Identified abnormal 30% drop in budget tier Dubai listings. Selected push notification to create booking urgency.', confidence: 0.92, expectedCTR: 6.5 },
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    },
    {
      name: 'Tokyo Family Spring Promotion',
      targetCity: 'Tokyo',
      targetSegment: 'family',
      channel: 'email',
      content: 'Cherry Blossoms and Comfort! Family rooms in Tokyo with complimentary breakfast and kids-stay-free packages. Plan your vacation now.',
      status: 'completed',
      metrics: { sent: 3200, opened: 1280, clicked: 240, converted: 48 },
      agentDecision: { reasoning: 'Seasonal cherry blossom demand coming up. Historic data shows family segments prefer email details.', confidence: 0.81, expectedCTR: 7.0 },
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
    // 3 Active (recent, no metrics or pending metrics)
    {
      name: 'Barcelona Beach Escape',
      targetCity: 'Barcelona',
      targetSegment: 'family',
      channel: 'push',
      content: 'Escape to Barcelona! Beautiful family suites with sea views are 20% off. Tap to view deals.',
      status: 'active',
      agentDecision: { reasoning: 'Weekend rates dropped slightly below seasonal expectations. Recommending family segment targeted push.', confidence: 0.78, expectedCTR: 5.2 },
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      name: 'Bali Backpacker Promo',
      targetCity: 'Bali',
      targetSegment: 'budget',
      channel: 'sms',
      content: 'Bali calling! Budget beach rooms starting at $20/night. Book now: hoteliq.com/bali',
      status: 'active',
      agentDecision: { reasoning: 'Extreme price drop detected in Bali budget hostels. Selected SMS channel for quick direct conversions.', confidence: 0.85, expectedCTR: 9.0 },
      createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
    },
    {
      name: 'NYC Autumn Luxury Special',
      targetCity: 'New York',
      targetSegment: 'luxury',
      channel: 'email',
      content: 'Experience New York Autumn. Save 20% on upscale hotels in Manhattan. Enjoy exclusive lounge access and late check-outs.',
      status: 'active',
      agentDecision: { reasoning: 'Corporate luxury listings showing weekend rate cuts. Recommended targeted email blast.', confidence: 0.83, expectedCTR: 6.8 },
      createdAt: new Date(now.getTime() - 30 * 60 * 1000), // 30 mins ago
    },
    // 2 Draft
    {
      name: 'Tokyo Ryokan Culture Experience',
      targetCity: 'Tokyo',
      targetSegment: 'luxury',
      channel: 'email',
      content: 'Immerse Yourself in Tokyo Tradition. Experience authentic ryokans and luxury spas at 15% off.',
      status: 'draft',
      agentDecision: { reasoning: 'Drafting campaign for potential luxury traveler target in Tokyo.', confidence: 0.65, expectedCTR: 5.0 },
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      name: 'Dubai Luxury Getaway',
      targetCity: 'Dubai',
      targetSegment: 'luxury',
      channel: 'push',
      content: 'Ultimate Dubai Luxury. Stay at the Burj View Hotel with spa discounts.',
      status: 'draft',
      agentDecision: { reasoning: 'Pre-planning luxury campaign for future Dubai rate adjustments.', confidence: 0.70, expectedCTR: 4.8 },
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const campaign of campaigns) {
    await prisma.campaign.create({ data: campaign });
  }
  console.log(`✓ Seeded ${campaigns.length} campaigns`);

  // 4. Create Agent Logs (15 pre-seeded: 5 research, 5 decisioning, 5 execution)
  const agentLogs = [
    // 5 Research logs
    {
      agentName: 'research',
      action: 'analyze_market_trends',
      input: { query: 'Find luxury opportunities' },
      output: { insights: 'Detected 22% drop in Paris luxury hotel rates. Dubai remains highly active.', topOpportunities: [{ city: 'Paris', reason: 'Palace Vendôme price drops', priceDropPct: 22 }] },
      latencyMs: 1240,
      tokenCost: 480,
      confidence: 0.88,
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      agentName: 'research',
      action: 'analyze_market_trends',
      input: { query: 'Analyze Asian hotel price reductions' },
      output: { insights: 'Tokyo budget capsule hotels show a 15% price drop. Bali rates are stable.', topOpportunities: [{ city: 'Tokyo', reason: 'Capsule & Co room discounts', priceDropPct: 15 }] },
      latencyMs: 980,
      tokenCost: 390,
      confidence: 0.81,
      createdAt: new Date(now.getTime() - 2.5 * 24 * 60 * 60 * 1000),
    },
    {
      agentName: 'research',
      action: 'analyze_market_trends',
      input: { query: 'Find beach hotel anomalies' },
      output: { insights: 'Bali backpacker listings have plummeted by 32% due to off-season. Exceptional value.', topOpportunities: [{ city: 'Bali', reason: 'Widespread budget tier price cuts', priceDropPct: 32 }] },
      latencyMs: 1550,
      tokenCost: 610,
      confidence: 0.94,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      agentName: 'research',
      action: 'analyze_market_trends',
      input: { query: 'Detect European discount trends' },
      output: { insights: 'Barcelona hotels are offering 18% cuts for family rooms over weekends.', topOpportunities: [{ city: 'Barcelona', reason: 'Camp Nou Suites group rates drop', priceDropPct: 18 }] },
      latencyMs: 1100,
      tokenCost: 450,
      confidence: 0.85,
      createdAt: new Date(now.getTime() - 1.5 * 24 * 60 * 60 * 1000),
    },
    {
      agentName: 'research',
      action: 'analyze_market_trends',
      input: { query: 'Standard market opportunity check' },
      output: { insights: 'New York mid-tier listings are showing 20% drops for Autumn seasonal specials.', topOpportunities: [{ city: 'New York', reason: 'Brooklyn Boutique weekend packages', priceDropPct: 20 }] },
      latencyMs: 1350,
      tokenCost: 520,
      confidence: 0.87,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },

    // 5 Decisioning logs
    {
      agentName: 'decisioning',
      action: 'recommend_campaign',
      input: { opportunities: [{ city: 'Paris', priceDropPct: 22 }] },
      output: { recommendedCity: 'Paris', targetSegment: 'luxury', channel: 'email', reasoning: 'Highest historical conversion for Paris luxury segments when prices drop > 20%.' },
      latencyMs: 1890,
      tokenCost: 650,
      confidence: 0.90,
      createdAt: new Date(now.getTime() - 2.9 * 24 * 60 * 60 * 1000),
    },
    {
      agentName: 'decisioning',
      action: 'recommend_campaign',
      input: { opportunities: [{ city: 'Tokyo', priceDropPct: 15 }] },
      output: { recommendedCity: 'Tokyo', targetSegment: 'family', channel: 'email', reasoning: 'Tokyo family travel shows strong response rate to spring promotions.' },
      latencyMs: 2200,
      tokenCost: 810,
      confidence: 0.84,
      createdAt: new Date(now.getTime() - 2.4 * 24 * 60 * 60 * 1000),
    },
    {
      agentName: 'decisioning',
      action: 'recommend_campaign',
      input: { opportunities: [{ city: 'Bali', priceDropPct: 32 }] },
      output: { recommendedCity: 'Bali', targetSegment: 'budget', channel: 'sms', reasoning: 'SMS targeting returns high conversion scores for budget travelers looking for instant bookings.' },
      latencyMs: 1750,
      tokenCost: 720,
      confidence: 0.95,
      createdAt: new Date(now.getTime() - 1.9 * 24 * 60 * 60 * 1000),
    },
    {
      agentName: 'decisioning',
      action: 'recommend_campaign',
      input: { opportunities: [{ city: 'Barcelona', priceDropPct: 18 }] },
      output: { recommendedCity: 'Barcelona', targetSegment: 'family', channel: 'push', reasoning: 'Mobile push campaigns have highest CTR for Barcelona family bookings.' },
      latencyMs: 2050,
      tokenCost: 690,
      confidence: 0.86,
      createdAt: new Date(now.getTime() - 1.4 * 24 * 60 * 60 * 1000),
    },
    {
      agentName: 'decisioning',
      action: 'recommend_campaign',
      input: { opportunities: [{ city: 'New York', priceDropPct: 20 }] },
      output: { recommendedCity: 'New York', targetSegment: 'luxury', channel: 'email', reasoning: 'Email channel is highly preferred by NYC luxury business customers.' },
      latencyMs: 2400,
      tokenCost: 780,
      confidence: 0.89,
      createdAt: new Date(now.getTime() - 0.9 * 24 * 60 * 60 * 1000),
    },

    // 5 Execution logs
    {
      agentName: 'execution',
      action: 'generate_campaign_content',
      input: { city: 'Paris', segment: 'luxury', channel: 'email' },
      output: { status: 'sent', recipients: 4500, hasSubject: true },
      latencyMs: 820,
      tokenCost: 200,
      confidence: 1.0,
      createdAt: new Date(now.getTime() - 2.8 * 24 * 60 * 60 * 1000),
    },
    {
      agentName: 'execution',
      action: 'generate_campaign_content',
      input: { city: 'Tokyo', segment: 'family', channel: 'email' },
      output: { status: 'sent', recipients: 3200, hasSubject: true },
      latencyMs: 780,
      tokenCost: 180,
      confidence: 1.0,
      createdAt: new Date(now.getTime() - 2.3 * 24 * 60 * 60 * 1000),
    },
    {
      agentName: 'execution',
      action: 'generate_campaign_content',
      input: { city: 'Bali', segment: 'budget', channel: 'sms' },
      output: { status: 'sent', recipients: 8500, hasSubject: false },
      latencyMs: 640,
      tokenCost: 120,
      confidence: 1.0,
      createdAt: new Date(now.getTime() - 1.8 * 24 * 60 * 60 * 1000),
    },
    {
      agentName: 'execution',
      action: 'generate_campaign_content',
      input: { city: 'Barcelona', segment: 'family', channel: 'push' },
      output: { status: 'sent', recipients: 11000, hasSubject: false },
      latencyMs: 710,
      tokenCost: 150,
      confidence: 1.0,
      createdAt: new Date(now.getTime() - 1.3 * 24 * 60 * 60 * 1000),
    },
    {
      agentName: 'execution',
      action: 'generate_campaign_content',
      input: { city: 'New York', segment: 'luxury', channel: 'email' },
      output: { status: 'sent', recipients: 6000, hasSubject: true },
      latencyMs: 910,
      tokenCost: 220,
      confidence: 1.0,
      createdAt: new Date(now.getTime() - 0.8 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const log of agentLogs) {
    await prisma.agentLog.create({ data: log });
  }
  console.log(`✓ Seeded ${agentLogs.length} agent execution logs`);

  console.log('🎉 Seed completed successfully!');
  console.log(`📊 Summary: ${hotels.length} hotels, ${priceCount} prices, ${campaigns.length} campaigns, ${agentLogs.length} agent logs.`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
