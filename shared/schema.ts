import { pgTable, text, serial, integer, boolean, timestamp, decimal, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  dateOfBirth: text("date_of_birth"),
  nationality: text("nationality"),
  passportNumber: text("passport_number"),
  passportExpiry: text("passport_expiry"),
  // Address Information
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country"),
  // Payment Information (encrypted/hashed)
  savedCards: json("saved_cards").array(), // Array of encrypted card details
  walletBalance: decimal("wallet_balance", { precision: 10, scale: 2 }).default("0.00"),
  // Loyalty Program Information
  loyaltyTier: text("loyalty_tier").default("bronze"), // bronze, silver, gold, platinum, diamond
  loyaltyPoints: integer("loyalty_points").default(0),
  totalMilesFlown: integer("total_miles_flown").default(0),
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).default("0.00"),
  memberSince: timestamp("member_since").defaultNow(),
  tierAnniversary: timestamp("tier_anniversary").defaultNow(),
  lifetimeMiles: integer("lifetime_miles").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const flights = pgTable("flights", {
  id: serial("id").primaryKey(),
  flightNumber: text("flight_number").notNull(),
  airline: text("airline").notNull(),
  departureAirport: text("departure_airport").notNull(),
  arrivalAirport: text("arrival_airport").notNull(),
  departureTime: timestamp("departure_time").notNull(),
  arrivalTime: timestamp("arrival_time").notNull(),
  duration: text("duration").notNull(),
  aircraft: text("aircraft").notNull(),
  stops: integer("stops").default(0),
  stopAirports: text("stop_airports").array(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  availableSeats: integer("available_seats").notNull(),
  totalSeats: integer("total_seats").notNull(),
  class: text("class").notNull(),
});

export const seats = pgTable("seats", {
  id: serial("id").primaryKey(),
  flightId: integer("flight_id").references(() => flights.id),
  seatNumber: text("seat_number").notNull(),
  seatType: text("seat_type").notNull(), // economy, premium_economy, business, first
  seatClass: text("seat_class").notNull(), // window, aisle, middle
  isAvailable: boolean("is_available").default(true),
  isExtraLegroom: boolean("is_extra_legroom").default(false),
  price: decimal("price", { precision: 10, scale: 2 }).default("0.00"),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  phase: text("phase").notNull(), // booking, pre_boarding, in_flight, arrival
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  inventory: integer("inventory").notNull(),
  tag: text("tag"), // recommended, filling_fast, only_few_left
  isActive: boolean("is_active").default(true),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  orderNumber: text("order_number").notNull().unique(),
  status: text("status").notNull(), // pending, confirmed, cancelled, completed
  flightId: integer("flight_id").references(() => flights.id),
  seatId: integer("seat_id").references(() => seats.id),
  assignedSeats: json("assigned_seats").array(), // Array of seat assignments per passenger
  passengerInfo: json("passenger_info").array(), // Array of traveler details
  selectedServices: json("selected_services").array(), // service IDs and details
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxes: decimal("taxes", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull().default("credit_card"), // credit_card, paypal, wallet, bank_transfer
  paymentStatus: text("payment_status").notNull(), // pending, paid, refunded
  canCheckIn: boolean("can_check_in").default(false),
  isCheckedIn: boolean("is_checked_in").default(false),
  checkInTime: timestamp("check_in_time"),
  // Loyalty Program Integration
  loyaltyTierAtBooking: text("loyalty_tier_at_booking"),
  pointsEarned: integer("points_earned").default(0),
  milesEarned: integer("miles_earned").default(0),
  loyaltyBundles: json("loyalty_bundles").array(), // Applied loyalty bundles
  tierDiscounts: json("tier_discounts").array(), // Applied tier-based discounts
  complimentaryServices: json("complimentary_services").array(), // Free services due to tier
  createdAt: timestamp("created_at").defaultNow(),
});

export const passengers = pgTable("passengers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  dateOfBirth: text("date_of_birth"),
  gender: text("gender"),
  nationality: text("nationality"),
  passportNumber: text("passport_number"),
  passportExpiry: text("passport_expiry"),
  // Travel preferences
  seatPreference: text("seat_preference"), // window, aisle, middle
  mealPreference: text("meal_preference"),
  specialRequests: text("special_requests"),
  // Additional info
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  emergencyContactRelation: text("emergency_contact_relation"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const bookingHistory = pgTable("booking_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  serviceId: integer("service_id").references(() => services.id),
  orderId: integer("order_id").references(() => orders.id),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Loyalty Tiers Configuration
export const loyaltyTiers = pgTable("loyalty_tiers", {
  id: serial("id").primaryKey(),
  tierName: text("tier_name").notNull().unique(), // bronze, silver, gold, platinum, diamond
  displayName: text("display_name").notNull(), // Bronze Member, Silver Elite, etc.
  minPoints: integer("min_points").notNull(),
  minMiles: integer("min_miles").notNull(),
  minSpend: decimal("min_spend", { precision: 10, scale: 2 }).notNull(),
  color: text("color").notNull(), // hex color for UI
  benefits: json("benefits").notNull(), // Array of benefit objects
  multiplier: decimal("multiplier", { precision: 3, scale: 2 }).default("1.00"), // Points earning multiplier
  priority: integer("priority").notNull(), // Lower number = higher priority
  isActive: boolean("is_active").default(true),
});

// Service Bundles for Loyalty Tiers
export const loyaltyBundles = pgTable("loyalty_bundles", {
  id: serial("id").primaryKey(),
  tierName: text("tier_name").notNull().references(() => loyaltyTiers.tierName),
  bundleName: text("bundle_name").notNull(),
  description: text("description").notNull(),
  serviceIds: json("service_ids").notNull(), // Array of service IDs included
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).default("0.00"),
  isComplimentary: boolean("is_complimentary").default(false),
  phase: text("phase").notNull(), // booking, pre_boarding, in_flight, arrival
  isActive: boolean("is_active").default(true),
});

// Points Transactions History
export const pointsTransactions = pgTable("points_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  orderId: integer("order_id").references(() => orders.id),
  transactionType: text("transaction_type").notNull(), // earned, redeemed, expired, bonus
  points: integer("points").notNull(), // Positive for earned, negative for redeemed
  description: text("description").notNull(),
  multiplier: decimal("multiplier", { precision: 3, scale: 2 }).default("1.00"),
  basePoints: integer("base_points").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tier Progression History
export const tierHistory = pgTable("tier_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  previousTier: text("previous_tier"),
  newTier: text("new_tier").notNull(),
  qualificationMethod: text("qualification_method").notNull(), // points, miles, spend
  qualificationValue: integer("qualification_value").notNull(),
  upgradeDate: timestamp("upgrade_date").defaultNow(),
  isDowngrade: boolean("is_downgrade").default(false),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  walletBalance: true,
  loyaltyPoints: true,
  totalMilesFlown: true,
  totalSpent: true,
  memberSince: true,
  tierAnniversary: true,
  lifetimeMiles: true,
  createdAt: true,
});

export const insertFlightSchema = createInsertSchema(flights).omit({
  id: true,
});

export const insertSeatSchema = createInsertSchema(seats).omit({
  id: true,
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  orderNumber: true,
  createdAt: true,
});

export const insertBookingHistorySchema = createInsertSchema(bookingHistory).omit({
  id: true,
  timestamp: true,
});

export const insertPassengerSchema = createInsertSchema(passengers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLoyaltyTierSchema = createInsertSchema(loyaltyTiers).omit({
  id: true,
});

export const insertLoyaltyBundleSchema = createInsertSchema(loyaltyBundles).omit({
  id: true,
});

export const insertPointsTransactionSchema = createInsertSchema(pointsTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertTierHistorySchema = createInsertSchema(tierHistory).omit({
  id: true,
  upgradeDate: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Flight = typeof flights.$inferSelect;
export type InsertFlight = z.infer<typeof insertFlightSchema>;
export type Seat = typeof seats.$inferSelect;
export type InsertSeat = z.infer<typeof insertSeatSchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type BookingHistory = typeof bookingHistory.$inferSelect;
export type InsertBookingHistory = z.infer<typeof insertBookingHistorySchema>;
export type Passenger = typeof passengers.$inferSelect;
export type InsertPassenger = z.infer<typeof insertPassengerSchema>;
export type LoyaltyTier = typeof loyaltyTiers.$inferSelect;
export type InsertLoyaltyTier = z.infer<typeof insertLoyaltyTierSchema>;
export type LoyaltyBundle = typeof loyaltyBundles.$inferSelect;
export type InsertLoyaltyBundle = z.infer<typeof insertLoyaltyBundleSchema>;
export type PointsTransaction = typeof pointsTransactions.$inferSelect;
export type InsertPointsTransaction = z.infer<typeof insertPointsTransactionSchema>;
export type TierHistory = typeof tierHistory.$inferSelect;
export type InsertTierHistory = z.infer<typeof insertTierHistorySchema>;

// Additional schemas for frontend
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const flightSearchSchema = z.object({
  from: z.string().min(1, "Please select departure airport"),
  to: z.string().min(1, "Please select arrival airport"),
  departureDate: z.string().min(1, "Please select departure date"),
  returnDate: z.string().optional(),
  passengers: z.number().min(1).max(9),
  class: z.enum(["economy", "premium_economy", "business", "first"]),
  tripType: z.enum(["round_trip", "one_way", "multi_city"]),
});

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type FlightSearchData = z.infer<typeof flightSearchSchema>;
