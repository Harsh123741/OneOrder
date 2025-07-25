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
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookingHistory = pgTable("booking_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  serviceId: integer("service_id").references(() => services.id),
  orderId: integer("order_id").references(() => orders.id),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  walletBalance: true,
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
