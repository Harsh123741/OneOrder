import { db } from "./db";
import { services, dynamicPricing } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedServicePricing() {
  console.log("Seeding service dynamic pricing...");
  
  // Get all services
  const allServices = await db.select().from(services);
  
  for (const service of allServices) {
    const basePrice = parseFloat(service.price);
    
    // Create dynamic pricing entry with realistic inventory and demand
    const inventory = Math.floor(Math.random() * 100) + 20; // 20-120 inventory
    const totalBookings = Math.floor(Math.random() * 80); // 0-80 bookings
    const recentBookings = Math.floor(Math.random() * 20); // 0-20 recent bookings
    
    // Calculate demand multiplier
    let demandMultiplier = 1.0;
    
    // Simulate different demand scenarios
    const scenario = Math.random();
    if (scenario < 0.1) {
      // 10% chance of high demand
      demandMultiplier = 1.4 + Math.random() * 0.4; // 1.4-1.8x
    } else if (scenario < 0.2) {
      // 10% chance of low stock
      demandMultiplier = 1.2 + Math.random() * 0.3; // 1.2-1.5x
    } else if (scenario < 0.4) {
      // 20% chance of moderate demand
      demandMultiplier = 1.05 + Math.random() * 0.15; // 1.05-1.2x
    } else if (scenario < 0.7) {
      // 30% chance of normal price
      demandMultiplier = 0.95 + Math.random() * 0.1; // 0.95-1.05x
    } else {
      // 30% chance of discount
      demandMultiplier = 0.8 + Math.random() * 0.15; // 0.8-0.95x
    }
    
    const currentPrice = Math.round(basePrice * demandMultiplier * 100) / 100;
    
    // Check if pricing already exists
    const existingPricing = await db.select().from(dynamicPricing)
      .where(eq(dynamicPricing.entityId, service.id))
      .limit(1);
    
    if (existingPricing.length === 0) {
      await db.insert(dynamicPricing).values({
        entityType: 'service',
        entityId: service.id,
        basePrice: basePrice.toString(),
        currentPrice: currentPrice.toString(),
        inventoryLevel: inventory,
        demandMultiplier: demandMultiplier.toFixed(3),
        timeMultiplier: "1.000",
        totalBookings,
        recentBookings,
        lastUpdated: new Date(),
        isActive: true
      });
      
      console.log(`Seeded pricing for service ${service.name}: $${basePrice} -> $${currentPrice} (${(demandMultiplier * 100).toFixed(1)}%)`);
    } else {
      console.log(`Pricing already exists for service ${service.name}`);
    }
  }
  
  console.log("Service pricing seeding completed!");
}

// Run if called directly  
if (import.meta.url === `file://${process.argv[1]}`) {
  seedServicePricing().catch(console.error);
}

export { seedServicePricing };