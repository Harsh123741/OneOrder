import { db } from "./db";
import {
  loyaltyTiers, loyaltyBundles,
  type InsertLoyaltyTier, type InsertLoyaltyBundle
} from "@shared/schema";

// Seed loyalty tiers with comprehensive benefits
const loyaltyTiersSeed: InsertLoyaltyTier[] = [
  {
    tierName: "bronze",
    displayName: "Bronze Member",
    minPoints: 0,
    minMiles: 0,
    minSpend: "0.00",
    color: "#CD7F32",
    benefits: [
      { type: "priority", description: "Standard boarding priority" },
      { type: "points", description: "Earn 1x points on all purchases" }
    ],
    multiplier: "1.00",
    priority: 1,
    isActive: true
  },
  {
    tierName: "silver",
    displayName: "Silver Elite",
    minPoints: 25000,
    minMiles: 25000,
    minSpend: "3000.00",
    color: "#C0C0C0",
    benefits: [
      { type: "priority", description: "Priority boarding Zone 3" },
      { type: "points", description: "Earn 1.25x points on all purchases" },
      { type: "baggage", description: "1 free checked bag (50 lbs)" },
      { type: "upgrade", description: "Complimentary seat upgrades when available" }
    ],
    multiplier: "1.25",
    priority: 2,
    isActive: true
  },
  {
    tierName: "gold",
    displayName: "Gold Tier",
    minPoints: 50000,
    minMiles: 50000,
    minSpend: "6000.00",
    color: "#FFD700",
    benefits: [
      { type: "priority", description: "Priority boarding Zone 2" },
      { type: "points", description: "Earn 1.5x points on all purchases" },
      { type: "baggage", description: "2 free checked bags (70 lbs each)" },
      { type: "upgrade", description: "Complimentary premium economy upgrades" },
      { type: "lounge", description: "Lounge access for member" },
      { type: "checkin", description: "Priority check-in and security" }
    ],
    multiplier: "1.50",
    priority: 3,
    isActive: true
  },
  {
    tierName: "platinum",
    displayName: "Platinum Elite",
    minPoints: 75000,
    minMiles: 75000,
    minSpend: "10000.00",
    color: "#E5E4E2",
    benefits: [
      { type: "priority", description: "Priority boarding Zone 1" },
      { type: "points", description: "Earn 1.75x points on all purchases" },
      { type: "baggage", description: "3 free checked bags (70 lbs each)" },
      { type: "upgrade", description: "Complimentary business class upgrades" },
      { type: "lounge", description: "Lounge access for member + 1 guest" },
      { type: "checkin", description: "Dedicated Platinum check-in counters" },
      { type: "support", description: "24/7 dedicated customer service line" }
    ],
    multiplier: "1.75",
    priority: 4,
    isActive: true
  },
  {
    tierName: "diamond",
    displayName: "Diamond Medallion",
    minPoints: 125000,
    minMiles: 125000,
    minSpend: "15000.00",
    color: "#B9F2FF",
    benefits: [
      { type: "priority", description: "First priority boarding" },
      { type: "points", description: "Earn 2x points on all purchases" },
      { type: "baggage", description: "Unlimited free checked bags (70 lbs each)" },
      { type: "upgrade", description: "Complimentary first class upgrades" },
      { type: "lounge", description: "Lounge access for member + guest + premium lounges" },
      { type: "checkin", description: "Dedicated Diamond check-in and first class lanes" },
      { type: "support", description: "Personal dedicated Diamond service representative" },
      { type: "companion", description: "Annual companion certificate" }
    ],
    multiplier: "2.00",
    priority: 5,
    isActive: true
  }
];

// Seed loyalty bundles with tier-specific discounts and complimentary services
const loyaltyBundlesSeed: InsertLoyaltyBundle[] = [
  // Silver Tier Bundles
  {
    tierName: "silver",
    bundleName: "Silver Baggage Bundle",
    description: "Complimentary additional baggage for Silver members",
    serviceIds: [1, 2], // Additional Baggage service IDs
    discountPercentage: "100.00",
    isComplimentary: true,
    phase: "booking",
    isActive: true
  },
  {
    tierName: "silver",
    bundleName: "Silver Seat Upgrade",
    description: "25% discount on premium seat upgrades",
    serviceIds: [8, 9], // Premium seat service IDs
    discountPercentage: "25.00",
    isComplimentary: false,
    phase: "booking",
    isActive: true
  },

  // Gold Tier Bundles
  {
    tierName: "gold",
    bundleName: "Gold VIP Bundle",
    description: "Complimentary lounge access and priority boarding",
    serviceIds: [6, 7], // Lounge Access and Priority Boarding
    discountPercentage: "100.00",
    isComplimentary: true,
    phase: "booking",
    isActive: true
  },
  {
    tierName: "gold",
    bundleName: "Gold Baggage Plus",
    description: "Complimentary baggage and 50% off excess baggage",
    serviceIds: [1, 2, 14], // Baggage services
    discountPercentage: "50.00",
    isComplimentary: false,
    phase: "pre_boarding",
    isActive: true
  },
  {
    tierName: "gold",
    bundleName: "Gold Dining Bundle",
    description: "50% discount on premium meal selections",
    serviceIds: [5, 16], // Meal services
    discountPercentage: "50.00",
    isComplimentary: false,
    phase: "in_flight",
    isActive: true
  },

  // Platinum Tier Bundles
  {
    tierName: "platinum",
    bundleName: "Platinum Elite Package",
    description: "Complimentary lounge, priority services, and baggage",
    serviceIds: [6, 7, 1, 2, 15], // VIP package
    discountPercentage: "100.00",
    isComplimentary: true,
    phase: "booking",
    isActive: true
  },
  {
    tierName: "platinum",
    bundleName: "Platinum Comfort Bundle",
    description: "75% discount on cabin upgrades and premium services",
    serviceIds: [17, 18, 19], // Cabin upgrade services
    discountPercentage: "75.00",
    isComplimentary: false,
    phase: "in_flight",
    isActive: true
  },
  {
    tierName: "platinum",
    bundleName: "Platinum Arrival VIP",
    description: "Complimentary meet & assist and fast track services",
    serviceIds: [20, 23], // Arrival services
    discountPercentage: "100.00",
    isComplimentary: true,
    phase: "arrival",
    isActive: true
  },

  // Diamond Tier Bundles
  {
    tierName: "diamond",
    bundleName: "Diamond Medallion Elite",
    description: "Complete VIP experience - all premium services complimentary",
    serviceIds: [6, 7, 1, 2, 5, 15, 16, 17, 20, 23], // Premium everything
    discountPercentage: "100.00",
    isComplimentary: true,
    phase: "booking",
    isActive: true
  },
  {
    tierName: "diamond",
    bundleName: "Diamond In-Flight Luxury",
    description: "Complimentary premium dining, entertainment, and cabin upgrades",
    serviceIds: [16, 17, 18, 19], // In-flight luxury
    discountPercentage: "100.00",
    isComplimentary: true,
    phase: "in_flight",
    isActive: true
  },
  {
    tierName: "diamond",
    bundleName: "Diamond Arrival Concierge",
    description: "Full concierge arrival experience",
    serviceIds: [20, 21, 22, 23], // All arrival services
    discountPercentage: "100.00",
    isComplimentary: true,
    phase: "arrival",
    isActive: true
  }
];

export async function seedLoyaltySystem() {
  try {
    console.log("🎯 Seeding loyalty tiers...");
    
    // Clear existing data
    await db.delete(loyaltyBundles);
    await db.delete(loyaltyTiers);
    
    // Insert loyalty tiers
    await db.insert(loyaltyTiers).values(loyaltyTiersSeed);
    console.log(`✅ Created ${loyaltyTiersSeed.length} loyalty tiers`);
    
    // Insert loyalty bundles
    await db.insert(loyaltyBundles).values(loyaltyBundlesSeed);
    console.log(`✅ Created ${loyaltyBundlesSeed.length} loyalty bundles`);
    
    console.log("🎉 Loyalty system seeded successfully!");
    
  } catch (error) {
    console.error("❌ Error seeding loyalty system:", error);
    throw error;
  }
}

// Run seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedLoyaltySystem()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}