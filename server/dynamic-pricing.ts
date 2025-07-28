import { db } from "./db";
import { dynamicPricing, priceHistory, flights, seats, services, fareHolds } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export class DynamicPricingService {
  // Initialize dynamic pricing for a flight
  async initializeFlightPricing(flightId: number, basePrice: number) {
    const flight = await db.select().from(flights).where(eq(flights.id, flightId)).limit(1);
    if (!flight.length) throw new Error("Flight not found");

    const existingPricing = await db.select().from(dynamicPricing)
      .where(and(
        eq(dynamicPricing.entityType, 'flight'),
        eq(dynamicPricing.entityId, flightId)
      )).limit(1);

    if (existingPricing.length) {
      return existingPricing[0];
    }

    const [pricing] = await db.insert(dynamicPricing).values({
      entityType: 'flight',
      entityId: flightId,
      basePrice: basePrice.toString(),
      currentPrice: basePrice.toString(),
      inventoryLevel: flight[0].availableSeats,
      demandMultiplier: "1.000",
      timeMultiplier: "1.000"
    }).returning();

    return pricing;
  }

  // Initialize dynamic pricing for seats
  async initializeSeatPricing(seatId: number, basePrice: number) {
    const existingPricing = await db.select().from(dynamicPricing)
      .where(and(
        eq(dynamicPricing.entityType, 'seat'),
        eq(dynamicPricing.entityId, seatId)
      )).limit(1);

    if (existingPricing.length) {
      return existingPricing[0];
    }

    const [pricing] = await db.insert(dynamicPricing).values({
      entityType: 'seat',
      entityId: seatId,
      basePrice: basePrice.toString(),
      currentPrice: basePrice.toString(),
      inventoryLevel: 1, // Seats are single inventory
      demandMultiplier: "1.000",
      timeMultiplier: "1.000"
    }).returning();

    return pricing;
  }

  // Initialize dynamic pricing for services
  async initializeServicePricing(serviceId: number, basePrice: number, inventory: number = 100) {
    const existingPricing = await db.select().from(dynamicPricing)
      .where(and(
        eq(dynamicPricing.entityType, 'service'),
        eq(dynamicPricing.entityId, serviceId)
      )).limit(1);

    if (existingPricing.length) {
      return existingPricing[0];
    }

    const [pricing] = await db.insert(dynamicPricing).values({
      entityType: 'service',
      entityId: serviceId,
      basePrice: basePrice.toString(),
      currentPrice: basePrice.toString(),
      inventoryLevel: inventory,
      demandMultiplier: "1.000",
      timeMultiplier: "1.000"
    }).returning();

    return pricing;
  }

  // Update service pricing based on demand
  async updateServicePricing(serviceId: number) {
    const [pricing] = await db.select().from(dynamicPricing)
      .where(and(
        eq(dynamicPricing.entityType, 'service'),
        eq(dynamicPricing.entityId, serviceId)
      )).limit(1);

    if (!pricing) return null;

    // Calculate demand multiplier based on inventory and bookings
    const totalBookings = pricing.totalBookings || 0;
    const inventoryLevel = pricing.inventoryLevel || 100;
    
    // Demand-based pricing logic for services
    let demandMultiplier = 1.0;
    if (inventoryLevel < 10) {
      demandMultiplier = 1.5; // 50% increase when very low stock
    } else if (inventoryLevel < 25) {
      demandMultiplier = 1.3; // 30% increase when low stock
    } else if (totalBookings > 50) {
      demandMultiplier = 1.2; // 20% increase when high demand
    } else if (totalBookings > 20) {
      demandMultiplier = 1.1; // 10% increase when medium demand
    }

    // Random fluctuation for dynamic feel (±5%)
    const fluctuation = (Math.random() - 0.5) * 0.1;
    demandMultiplier += fluctuation;
    demandMultiplier = Math.max(0.8, Math.min(2.0, demandMultiplier)); // Cap between 80% and 200%

    const basePrice = parseFloat(pricing.basePrice);
    const newPrice = Math.round(basePrice * demandMultiplier * 100) / 100;

    // Update pricing
    const [updatedPricing] = await db.update(dynamicPricing)
      .set({
        currentPrice: newPrice.toString(),
        demandMultiplier: demandMultiplier.toFixed(3),
        lastUpdated: new Date()
      })
      .where(eq(dynamicPricing.id, pricing.id))
      .returning();

    // Log price history
    await db.insert(priceHistory).values({
      entityType: 'service',
      entityId: serviceId,
      price: newPrice.toString(),
      timestamp: new Date()
    });

    return updatedPricing;
  }

  // Get pricing tag for service based on demand and inventory
  getServicePricingTag(pricing: any): { tag: string; message: string; variant: 'destructive' | 'default' | 'secondary' } {
    const inventoryLevel = pricing.inventoryLevel || 100;
    const demandMultiplier = parseFloat(pricing.demandMultiplier || "1.0");
    const totalBookings = pricing.totalBookings || 0;

    if (inventoryLevel < 5) {
      return { tag: 'LAST FEW!', message: 'Only few left!', variant: 'destructive' };
    } else if (inventoryLevel < 15) {
      return { tag: 'LOW STOCK', message: 'Limited availability', variant: 'destructive' };
    } else if (demandMultiplier > 1.3) {
      return { tag: 'HIGH DEMAND', message: 'Price increased due to demand', variant: 'destructive' };
    } else if (totalBookings > 30) {
      return { tag: 'POPULAR', message: 'Booking fast', variant: 'secondary' };
    } else if (demandMultiplier < 0.9) {
      return { tag: 'DEAL', message: 'Special price', variant: 'default' };
    }
    
    return { tag: '', message: '', variant: 'default' };
  }

  // Get current service price with dynamic pricing
  async getServicePrice(serviceId: number) {
    const [pricing] = await db.select().from(dynamicPricing)
      .where(and(
        eq(dynamicPricing.entityType, 'service'),
        eq(dynamicPricing.entityId, serviceId)
      )).limit(1);

    if (!pricing) {
      // Initialize if doesn't exist
      const [service] = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
      if (service) {
        return await this.initializeServicePricing(serviceId, parseFloat(service.price));
      }
      return null;
    }

    return pricing;
  }

  // Calculate demand multiplier based on recent bookings and inventory
  calculateDemandMultiplier(totalBookings: number, recentBookings: number, inventoryLevel: number, maxInventory: number): number {
    // Base demand calculation
    const inventoryRatio = 1 - (inventoryLevel / maxInventory);
    const recentDemandFactor = Math.min(recentBookings / 10, 1); // Cap at 10 recent bookings for max effect
    
    // Demand multiplier: 0.8x to 2.0x based on inventory scarcity and recent demand
    const baseMultiplier = 0.8 + (inventoryRatio * 0.6); // 0.8 to 1.4x based on inventory
    const demandBoost = recentDemandFactor * 0.6; // Up to +0.6x boost from recent demand
    
    return Math.min(Math.max(baseMultiplier + demandBoost, 0.8), 2.0);
  }

  // Calculate time-based multiplier (closer to departure = higher price)
  calculateTimeMultiplier(departureTime: Date): number {
    const now = new Date();
    const hoursUntilDeparture = (departureTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilDeparture < 0) return 1.0; // Past departure
    if (hoursUntilDeparture < 6) return 1.8; // Last 6 hours: 1.8x
    if (hoursUntilDeparture < 24) return 1.5; // Last 24 hours: 1.5x
    if (hoursUntilDeparture < 72) return 1.3; // Last 3 days: 1.3x
    if (hoursUntilDeparture < 168) return 1.1; // Last week: 1.1x
    if (hoursUntilDeparture > 720) return 0.9; // More than 30 days: 0.9x
    
    return 1.0; // Standard pricing for 1-4 weeks out
  }

  // Update pricing for a specific entity
  async updatePricing(entityType: string, entityId: number) {
    const pricing = await db.select({
      id: dynamicPricing.id,
      entityType: dynamicPricing.entityType,
      entityId: dynamicPricing.entityId,
      basePrice: dynamicPricing.basePrice,
      currentPrice: dynamicPricing.currentPrice,
      demandMultiplier: dynamicPricing.demandMultiplier,
      timeMultiplier: dynamicPricing.timeMultiplier,
      inventoryLevel: dynamicPricing.inventoryLevel,
      totalBookings: dynamicPricing.totalBookings,
      recentBookings: dynamicPricing.recentBookings,
      lastUpdated: dynamicPricing.lastUpdated,
      isActive: dynamicPricing.isActive
    }).from(dynamicPricing)
      .where(and(
        eq(dynamicPricing.entityType, entityType),
        eq(dynamicPricing.entityId, entityId)
      )).limit(1);

    if (!pricing.length) return null;

    const currentPricing = pricing[0];
    let demandMultiplier = parseFloat(currentPricing.demandMultiplier || "1.000");
    let timeMultiplier = parseFloat(currentPricing.timeMultiplier || "1.000");

    // Update time multiplier for flights
    if (entityType === 'flight') {
      const flight = await db.select().from(flights).where(eq(flights.id, entityId)).limit(1);
      if (flight.length) {
        timeMultiplier = this.calculateTimeMultiplier(new Date(flight[0].departureTime));
      }
    }

    // Calculate new demand multiplier
    if (entityType === 'flight') {
      const flight = await db.select().from(flights).where(eq(flights.id, entityId)).limit(1);
      if (flight.length) {
        const maxInventory = flight[0].totalSeats || 180;
        demandMultiplier = this.calculateDemandMultiplier(
          currentPricing.totalBookings || 0,
          currentPricing.recentBookings || 0,
          currentPricing.inventoryLevel || 0,
          maxInventory
        );
      }
    } else {
      // For seats and services, use simpler demand calculation
      const scarcityFactor = (currentPricing.inventoryLevel || 0) <= 5 ? 1.3 : 1.0;
      const demandFactor = (currentPricing.recentBookings || 0) > 3 ? 1.2 : 1.0;
      demandMultiplier = Math.min(scarcityFactor * demandFactor, 2.0);
    }

    // Calculate new price
    const basePrice = parseFloat(currentPricing.basePrice || "0");
    const newPrice = basePrice * demandMultiplier * timeMultiplier;

    // Update pricing record
    const [updatedPricing] = await db.update(dynamicPricing)
      .set({
        currentPrice: newPrice.toFixed(2),
        demandMultiplier: demandMultiplier.toFixed(3),
        timeMultiplier: timeMultiplier.toFixed(3),
        lastUpdated: new Date()
      })
      .where(eq(dynamicPricing.id, currentPricing.id))
      .returning();

    // Record price history
    await db.insert(priceHistory).values({
      pricingId: currentPricing.id,
      price: newPrice.toFixed(2),
      demandMultiplier: demandMultiplier.toFixed(3),
      timeMultiplier: timeMultiplier.toFixed(3),
      totalBookings: currentPricing.totalBookings || 0
    });

    return updatedPricing;
  }

  // Record a booking and update demand metrics
  async recordBooking(entityType: string, entityId: number, quantity: number = 1) {
    const pricing = await db.select({
      id: dynamicPricing.id,
      entityType: dynamicPricing.entityType,
      entityId: dynamicPricing.entityId,
      basePrice: dynamicPricing.basePrice,
      currentPrice: dynamicPricing.currentPrice,
      demandMultiplier: dynamicPricing.demandMultiplier,
      timeMultiplier: dynamicPricing.timeMultiplier,
      inventoryLevel: dynamicPricing.inventoryLevel,
      totalBookings: dynamicPricing.totalBookings,
      recentBookings: dynamicPricing.recentBookings,
      lastUpdated: dynamicPricing.lastUpdated,
      isActive: dynamicPricing.isActive
    }).from(dynamicPricing)
      .where(and(
        eq(dynamicPricing.entityType, entityType),
        eq(dynamicPricing.entityId, entityId)
      )).limit(1);

    if (!pricing.length) return;

    const currentPricing = pricing[0];
    
    // Update booking metrics
    await db.update(dynamicPricing)
      .set({
        totalBookings: (currentPricing.totalBookings || 0) + quantity,
        recentBookings: (currentPricing.recentBookings || 0) + quantity,
        inventoryLevel: Math.max(0, (currentPricing.inventoryLevel || 0) - quantity)
      })
      .where(eq(dynamicPricing.id, currentPricing.id));

    // Update pricing based on new demand
    return this.updatePricing(entityType, entityId);
  }

  // Reset recent bookings (called hourly to track recent demand)
  async resetRecentBookings() {
    await db.update(dynamicPricing)
      .set({
        recentBookings: 0
      })
      .where(eq(dynamicPricing.isActive, true));
  }

  // Get current price for an entity
  async getCurrentPrice(entityType: string, entityId: number) {
    const pricing = await db.select({
      id: dynamicPricing.id,
      entityType: dynamicPricing.entityType,
      entityId: dynamicPricing.entityId,
      basePrice: dynamicPricing.basePrice,
      currentPrice: dynamicPricing.currentPrice,
      demandMultiplier: dynamicPricing.demandMultiplier,
      timeMultiplier: dynamicPricing.timeMultiplier,
      inventoryLevel: dynamicPricing.inventoryLevel,
      totalBookings: dynamicPricing.totalBookings,
      recentBookings: dynamicPricing.recentBookings,
      lastUpdated: dynamicPricing.lastUpdated,
      isActive: dynamicPricing.isActive
    }).from(dynamicPricing)
      .where(and(
        eq(dynamicPricing.entityType, entityType),
        eq(dynamicPricing.entityId, entityId)
      )).limit(1);

    if (!pricing.length) return null;

    // Update pricing before returning
    const updatedPricing = await this.updatePricing(entityType, entityId);
    return updatedPricing || pricing[0];
  }

  // Get price history for analytics
  async getPriceHistory(entityType: string, entityId: number, hours: number = 24) {
    const pricing = await db.select({
      id: dynamicPricing.id,
      entityType: dynamicPricing.entityType,
      entityId: dynamicPricing.entityId,
      basePrice: dynamicPricing.basePrice,
      currentPrice: dynamicPricing.currentPrice,
      demandMultiplier: dynamicPricing.demandMultiplier,
      timeMultiplier: dynamicPricing.timeMultiplier,
      inventoryLevel: dynamicPricing.inventoryLevel,
      totalBookings: dynamicPricing.totalBookings,
      recentBookings: dynamicPricing.recentBookings,
      lastUpdated: dynamicPricing.lastUpdated,
      isActive: dynamicPricing.isActive
    }).from(dynamicPricing)
      .where(and(
        eq(dynamicPricing.entityType, entityType),
        eq(dynamicPricing.entityId, entityId)
      )).limit(1);

    if (!pricing.length) return [];

    const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
    
    return db.select().from(priceHistory)
      .where(and(
        eq(priceHistory.pricingId, pricing[0].id),
        sql`${priceHistory.timestamp} >= ${cutoffTime}`
      ))
      .orderBy(desc(priceHistory.timestamp));
  }

  // Create fare hold
  async createFareHold(userId: number, flightId: number, holdDuration: number, holdPrice: number, lockedFarePrice?: number, paymentMethod?: string) {
    const currentPricing = await this.getCurrentPrice('flight', flightId);
    if (!currentPricing) throw new Error("Flight pricing not found");

    const expiresAt = new Date(Date.now() + (holdDuration * 60 * 60 * 1000));
    const finalLockedPrice = lockedFarePrice || parseFloat(currentPricing.currentPrice);
    
    const [fareHold] = await db.insert(fareHolds).values({
      userId,
      flightId,
      holdDuration,
      holdPrice: holdPrice.toFixed(2),
      lockedFarePrice: finalLockedPrice.toFixed(2),
      expiresAt
    }).returning();

    return fareHold;
  }

  // Get active fare hold for user and flight
  async getUserFareHold(userId: number, flightId: number) {
    const now = new Date();
    
    return db.select().from(fareHolds)
      .where(and(
        eq(fareHolds.userId, userId),
        eq(fareHolds.flightId, flightId),
        eq(fareHolds.isActive, true),
        eq(fareHolds.isUsed, false),
        sql`${fareHolds.expiresAt} > ${now}`
      ))
      .limit(1);
  }

  // Use fare hold during booking
  async useFareHold(fareHoldId: number) {
    const [updatedHold] = await db.update(fareHolds)
      .set({
        isUsed: true,
        isActive: false
      })
      .where(eq(fareHolds.id, fareHoldId))
      .returning();

    return updatedHold;
  }

  // Get all current prices for flights
  async getAllFlightPrices() {
    const flightPrices = await db.select({
      flightId: dynamicPricing.entityId,
      basePrice: dynamicPricing.basePrice,
      currentPrice: dynamicPricing.currentPrice,
      demandMultiplier: dynamicPricing.demandMultiplier,
      timeMultiplier: dynamicPricing.timeMultiplier,
      totalBookings: dynamicPricing.totalBookings,
      inventoryLevel: dynamicPricing.inventoryLevel,
      lastUpdated: dynamicPricing.lastUpdated
    }).from(dynamicPricing)
      .where(and(
        eq(dynamicPricing.entityType, 'flight'),
        eq(dynamicPricing.isActive, true)
      ));

    return flightPrices;
  }
}

export const dynamicPricingService = new DynamicPricingService();