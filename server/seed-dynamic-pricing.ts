import { dynamicPricingService } from "./dynamic-pricing";
import { db } from "./db";
import { flights, seats, services, dynamicPricing } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedDynamicPricing() {
  console.log("🚀 Seeding dynamic pricing data...");

  try {
    // Get all flights and initialize pricing
    const allFlights = await db.select().from(flights);
    
    for (const flight of allFlights) {
      console.log(`Initializing pricing for flight ${flight.flightNumber}...`);
      await dynamicPricingService.initializeFlightPricing(
        flight.id,
        parseFloat(flight.price)
      );
    }

    // Get all seats and initialize pricing
    const allSeats = await db.select().from(seats);
    
    for (const seat of allSeats) {
      console.log(`Initializing pricing for seat ${seat.seatNumber}...`);
      await dynamicPricingService.initializeSeatPricing(
        seat.id,
        parseFloat(seat.price)
      );
    }

    // Get all services and initialize pricing
    const allServices = await db.select().from(services);
    
    for (const service of allServices) {
      console.log(`Initializing pricing for service ${service.name}...`);
      await dynamicPricingService.initializeServicePricing(
        service.id,
        parseFloat(service.price),
        service.inventory
      );
    }

    // Add a fare hold service if it doesn't exist
    const fareHoldService = await db.select().from(services)
      .where(eq(services.name, 'Fare Hold - 24 Hours'))
      .limit(1);

    if (!fareHoldService.length) {
      console.log("Creating Fare Hold service...");
      const [newService] = await db.insert(services).values({
        name: 'Fare Hold - 24 Hours',
        description: 'Lock your flight price for 24 hours and book later without price increases',
        category: 'booking_protection',
        phase: 'booking',
        price: '49.99',
        inventory: 1000,
        tag: 'recommended',
        isActive: true
      }).returning();

      // Initialize pricing for the new service
      await dynamicPricingService.initializeServicePricing(
        newService.id,
        49.99,
        1000
      );
    }

    // Add 48-hour fare hold service
    const fareHold48Service = await db.select().from(services)
      .where(eq(services.name, 'Fare Hold - 48 Hours'))
      .limit(1);

    if (!fareHold48Service.length) {
      console.log("Creating 48-hour Fare Hold service...");
      const [newService] = await db.insert(services).values({
        name: 'Fare Hold - 48 Hours',
        description: 'Lock your flight price for 48 hours and book later without price increases',
        category: 'booking_protection',
        phase: 'booking',
        price: '79.99',
        inventory: 1000,
        tag: 'popular',
        isActive: true
      }).returning();

      await dynamicPricingService.initializeServicePricing(
        newService.id,
        79.99,
        1000
      );
    }

    // Simulate some demand for testing by updating booking counts
    const flightPricings = await db.select().from(dynamicPricing)
      .where(eq(dynamicPricing.entityType, 'flight'))
      .limit(3);

    for (let i = 0; i < flightPricings.length; i++) {
      const pricing = flightPricings[i];
      // Simulate different demand levels
      const bookingCount = i === 0 ? 8 : i === 1 ? 15 : 3; // Different demand scenarios
      const recentBookings = i === 0 ? 2 : i === 1 ? 5 : 1;
      
      await db.update(dynamicPricing)
        .set({
          totalBookings: bookingCount,
          recentBookings: recentBookings,
          inventoryLevel: pricing.inventoryLevel - bookingCount
        })
        .where(eq(dynamicPricing.id, pricing.id));

      // Update pricing based on demand
      await dynamicPricingService.updatePricing('flight', pricing.entityId);
    }

    console.log("✅ Dynamic pricing seeding completed successfully!");
    
    // Display current pricing status
    const allPricing = await dynamicPricingService.getAllFlightPrices();
    console.log("\n📊 Current Flight Pricing Status:");
    allPricing.forEach(pricing => {
      console.log(`Flight ID ${pricing.flightId}: Base $${pricing.basePrice} → Current $${pricing.currentPrice} (${((parseFloat(pricing.currentPrice) / parseFloat(pricing.basePrice) - 1) * 100).toFixed(1)}% change)`);
    });

  } catch (error) {
    console.error("❌ Error seeding dynamic pricing:", error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDynamicPricing().then(() => {
    console.log("Seeding completed!");
    process.exit(0);
  }).catch(error => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
}

export { seedDynamicPricing };