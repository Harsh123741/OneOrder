import { 
  users, flights, seats, services, orders, bookingHistory, passengers, cartItems,
  loyaltyTiers, loyaltyBundles, pointsTransactions, tierHistory, dynamicPricing, fareHolds,
  type User, type InsertUser, type Flight, type InsertFlight,
  type Seat, type InsertSeat, type Service, type InsertService,
  type Order, type InsertOrder, type BookingHistory, type InsertBookingHistory,
  type Passenger, type InsertPassenger, type CartItem, type InsertCartItem,
  type LoyaltyTier, type InsertLoyaltyTier,
  type LoyaltyBundle, type InsertLoyaltyBundle, type PointsTransaction, type InsertPointsTransaction,
  type TierHistory, type InsertTierHistory, type DynamicPricing, type FareHold
} from "@shared/schema";
import bcrypt from "bcrypt";
import { db } from "./db";
import { eq, and, gte, lte, ilike, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  // Flight methods
  searchFlights(criteria: {
    from: string;
    to: string;
    departureDate: string;
    returnDate?: string;
    passengers: number;
    class: string;
  }): Promise<Flight[]>;
  getFlight(id: number): Promise<Flight | undefined>;
  createFlight(flight: InsertFlight): Promise<Flight>;
  
  // Seat methods
  getFlightSeats(flightId: number): Promise<Seat[]>;
  getSeat(id: number): Promise<Seat | undefined>;
  updateSeatAvailability(id: number, isAvailable: boolean): Promise<Seat | undefined>;
  createSeat(seat: InsertSeat): Promise<Seat>;
  
  // Service methods
  getServices(phase?: string): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  updateServiceInventory(id: number, inventory: number): Promise<Service | undefined>;
  reserveServiceInventory(id: number, quantity: number): Promise<Service | undefined>;
  restoreServiceInventory(id: number, quantity: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  
  // Order methods
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
  getUserOrders(userId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, updates: Partial<Order>): Promise<Order | undefined>;
  updateOrderStatus(id: number, status: string, paymentStatus: string): Promise<Order | undefined>;
  cancelOrder(id: number): Promise<Order | undefined>;
  removeServiceFromOrder(orderId: number, serviceId: number): Promise<Order | undefined>;
  addServiceToOrder(orderId: number, service: any): Promise<Order | undefined>;
  
  // Wallet methods
  updateWalletBalance(userId: number, amount: number): Promise<User | undefined>;
  addWalletTransaction(userId: number, amount: number, type: 'credit' | 'debit', description: string): Promise<void>;
  
  // Booking history methods
  createBookingHistory(history: InsertBookingHistory): Promise<BookingHistory>;
  getUserBookingHistory(userId: number): Promise<BookingHistory[]>;
  
  // Passenger methods
  getPassenger(id: number): Promise<Passenger | undefined>;
  getUserPassengers(userId: number): Promise<Passenger[]>;
  createPassenger(passenger: InsertPassenger): Promise<Passenger>;
  updatePassenger(id: number, updates: Partial<Passenger>): Promise<Passenger | undefined>;
  deletePassenger(id: number): Promise<boolean>;
  
  // Cart methods
  getUserCartItems(userId: number): Promise<CartItem[]>;
  addCartItem(cartItem: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: number, updates: Partial<CartItem>): Promise<CartItem | undefined>;
  removeCartItem(id: number): Promise<boolean>;
  clearUserCart(userId: number): Promise<void>;
  
  // Loyalty methods
  getLoyaltyTiers(): Promise<LoyaltyTier[]>;
  getLoyaltyTier(tierName: string): Promise<LoyaltyTier | undefined>;
  getLoyaltyBundles(tierName: string, phase?: string): Promise<LoyaltyBundle[]>;
  updateUserLoyaltyStats(userId: number, order: Order, flight: Flight): Promise<void>;
  getUserLoyaltyStatus(userId: number): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeMockData();
  }

  private async initializeMockData() {
    // Check if data already exists to avoid duplicates
    const existingFlights = await db.select().from(flights).limit(1);
    if (existingFlights.length > 0) {
      return; // Data already exists, skip initialization
    }
    // Create sample flights
    const sampleFlights: InsertFlight[] = [
      {
        flightNumber: "SL1234",
        airline: "SkyLink Airlines",
        departureAirport: "JFK",
        arrivalAirport: "LAX",
        departureTime: new Date("2024-12-15T08:30:00Z"),
        arrivalTime: new Date("2024-12-15T11:00:00Z"),
        duration: "5h 30m",
        aircraft: "Boeing 737-800",
        stops: 0,
        stopAirports: [],
        price: "299.00",
        availableSeats: 150,
        totalSeats: 180,
        class: "economy"
      },
      {
        flightNumber: "SL789",
        airline: "SkyLink Airlines",
        departureAirport: "JFK",
        arrivalAirport: "LAX",
        departureTime: new Date("2024-12-15T14:45:00Z"),
        arrivalTime: new Date("2024-12-15T17:00:00Z"),
        duration: "5h 15m",
        aircraft: "Boeing 737-800",
        stops: 0,
        stopAirports: [],
        price: "329.00",
        availableSeats: 120,
        totalSeats: 180,
        class: "economy"
      },
      {
        flightNumber: "DL456",
        airline: "Delta Airlines",
        departureAirport: "JFK",
        arrivalAirport: "LAX",
        departureTime: new Date("2024-12-15T06:15:00Z"),
        arrivalTime: new Date("2024-12-15T11:00:00Z"),
        duration: "7h 45m",
        aircraft: "Boeing 757-200",
        stops: 1,
        stopAirports: ["ORD"],
        price: "249.00",
        availableSeats: 95,
        totalSeats: 150,
        class: "economy"
      }
    ];

    // Create flights asynchronously if they don't exist
    for (const flight of sampleFlights) {
      try {
        await this.createFlight(flight);
      } catch (error: any) {
        // Ignore duplicate key errors since we have unique constraints
        if (!error.message?.includes('duplicate key')) {
          console.error('Error creating flight:', error);
        }
      }
    }

    // Create sample services across all phases
    const sampleServices: InsertService[] = [
      // Booking Phase Services
      {
        name: "Priority Boarding",
        description: "Skip the line and board before general passengers",
        category: "boarding",
        phase: "booking",
        price: "25.00",
        inventory: 50,
        tag: "recommended",
        isActive: true
      },
      {
        name: "Extra Baggage",
        description: "Additional 23kg checked baggage allowance",
        category: "baggage",
        phase: "booking",
        price: "35.00",
        inventory: 30,
        tag: "only_few_left",
        isActive: true
      },
      {
        name: "Travel Insurance",
        description: "Complete coverage for trip cancellation and medical",
        category: "insurance",
        phase: "booking",
        price: "49.00",
        inventory: 100,
        tag: "recommended",
        isActive: true
      },
      {
        name: "Lounge Access",
        description: "Premium lounge with food, drinks, and WiFi",
        category: "lounge",
        phase: "booking",
        price: "65.00",
        inventory: 15,
        tag: "filling_fast",
        isActive: true
      },
      {
        name: "Meal Pre-booking",
        description: "Choose your preferred meal from our menu",
        category: "meal",
        phase: "booking",
        price: "18.00",
        inventory: 80,
        tag: "",
        isActive: true
      },
      {
        name: "Fast Track Security",
        description: "Skip regular security lines at the airport",
        category: "security",
        phase: "booking",
        price: "29.00",
        inventory: 40,
        tag: "",
        isActive: true
      },
      {
        name: "Flexible Ticket",
        description: "Change your flight without fees",
        category: "flexibility",
        phase: "booking",
        price: "75.00",
        inventory: 100,
        tag: "peace_of_mind",
        isActive: true
      },

      // Pre-Boarding Phase Services
      {
        name: "Early Check-in",
        description: "Check in 48 hours before departure",
        category: "check_in",
        phase: "pre_boarding",
        price: "15.00",
        inventory: 80,
        tag: "convenience",
        isActive: true
      },
      {
        name: "Excess Baggage",
        description: "Additional baggage beyond standard allowance",
        category: "baggage",
        phase: "pre_boarding",
        price: "50.00",
        inventory: 25,
        tag: "limited",
        isActive: true
      },
      {
        name: "Special Assistance",
        description: "Wheelchair or mobility assistance",
        category: "assistance",
        phase: "pre_boarding",
        price: "0.00",
        inventory: 20,
        tag: "complimentary",
        isActive: true
      },
      {
        name: "Pet Travel",
        description: "In-cabin pet transportation",
        category: "pet",
        phase: "pre_boarding",
        price: "125.00",
        inventory: 5,
        tag: "very_limited",
        isActive: true
      },
      {
        name: "Wi-Fi Access",
        description: "High-speed internet throughout your journey",
        category: "connectivity",
        phase: "pre_boarding",
        price: "19.00",
        inventory: 150,
        tag: "popular",
        isActive: true
      },

      // In-Flight Phase Services
      {
        name: "Premium Cabin Upgrade",
        description: "Upgrade to business class seating",
        category: "upgrade",
        phase: "in_flight",
        price: "299.00",
        inventory: 4,
        tag: "luxury",
        isActive: true
      },
      {
        name: "Gourmet Meal",
        description: "Chef-prepared premium dining experience",
        category: "dining",
        phase: "in_flight",
        price: "45.00",
        inventory: 30,
        tag: "premium",
        isActive: true
      },
      {
        name: "Duty-Free Shopping",
        description: "Pre-order duty-free items for collection",
        category: "shopping",
        phase: "in_flight",
        price: "0.00",
        inventory: 100,
        tag: "tax_free",
        isActive: true
      },
      {
        name: "Entertainment Upgrade",
        description: "Premium movies and shows selection",
        category: "entertainment",
        phase: "in_flight",
        price: "12.00",
        inventory: 75,
        tag: "entertainment",
        isActive: true
      },
      {
        name: "Power Outlet Access",
        description: "Guaranteed power outlet at your seat",
        category: "power",
        phase: "in_flight",
        price: "8.00",
        inventory: 60,
        tag: "essential",
        isActive: true
      },

      // Arrival Phase Services
      {
        name: "Meet & Assist Arrival",
        description: "Personal assistance upon landing",
        category: "assistance",
        phase: "arrival",
        price: "85.00",
        inventory: 15,
        tag: "vip",
        isActive: true
      },
      {
        name: "Priority Baggage",
        description: "First baggage off the plane",
        category: "baggage",
        phase: "arrival",
        price: "35.00",
        inventory: 40,
        tag: "time_saver",
        isActive: true
      },
      {
        name: "Ground Transportation",
        description: "Pre-booked taxi or car service",
        category: "transport",
        phase: "arrival",
        price: "65.00",
        inventory: 20,
        tag: "convenient",
        isActive: true
      },
      {
        name: "Immigration Fast Track",
        description: "Skip immigration queues",
        category: "immigration",
        phase: "arrival",
        price: "55.00",
        inventory: 12,
        tag: "express",
        isActive: true
      },
      {
        name: "Hotel Booking Assistance",
        description: "Help finding and booking accommodation",
        category: "accommodation",
        phase: "arrival",
        price: "25.00",
        inventory: 30,
        tag: "helpful",
        isActive: true
      },
      {
        name: "Travel SIM Card",
        description: "Local SIM card with data plan",
        category: "connectivity",
        phase: "arrival",
        price: "35.00",
        inventory: 50,
        tag: "stay_connected",
        isActive: true
      }
    ];

    // Create services asynchronously if they don't exist
    for (const service of sampleServices) {
      try {
        await this.createService(service);
      } catch (error: any) {
        // Ignore duplicate key errors since we have unique constraints
        if (!error.message?.includes('duplicate key') && error.code !== '23505') {
          console.error('Error creating service:', error);
        }
      }
    }

    // Create sample seats for flights
    const seatTypes = ["economy", "premium_economy", "business", "first"];
    const seatClasses = ["window", "aisle", "middle"];
    
    for (let flightId = 1; flightId <= 3; flightId++) {
      // Economy seats (rows 10-30)
      for (let row = 10; row <= 30; row++) {
        const seats = ["A", "B", "C", "D", "E", "F"];
        seats.forEach((letter, index) => {
          const isExtraLegroom = row === 12; // Exit row
          const seatClass = index === 0 || index === 5 ? "window" : 
                           index === 1 || index === 4 ? "aisle" : "middle";
          
          this.createSeat({
            flightId,
            seatNumber: `${row}${letter}`,
            seatType: "economy",
            seatClass,
            isAvailable: Math.random() > 0.3, // 70% available
            isExtraLegroom,
            price: isExtraLegroom ? "45.00" : "0.00"
          });
        });
      }
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Generate a unique salt for each user to ensure unique password hashes
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(insertUser.password, saltRounds);
    
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  // Flight methods
  async searchFlights(criteria: {
    from: string;
    to: string;
    departureDate: string;
    returnDate?: string;
    passengers: number;
    class: string;
  }): Promise<Flight[]> {
    // Get flights and calculate available seats
    const allFlights = await db.select().from(flights);
    
    const flightsWithSeats = await Promise.all(
      allFlights.map(async (flight) => {
        // Count available seats for this flight
        const availableSeats = await db.select({
          count: sql<number>`count(*)`
        }).from(seats).where(
          and(
            eq(seats.flightId, flight.id),
            eq(seats.isAvailable, true)
          )
        );
        
        return {
          ...flight,
          availableSeats: availableSeats[0]?.count || 0
        };
      })
    );
    
    return flightsWithSeats.filter(
      (flight) => flight.availableSeats >= criteria.passengers &&
        flight.departureAirport.toLowerCase().includes(criteria.from.toLowerCase()) &&
        flight.arrivalAirport.toLowerCase().includes(criteria.to.toLowerCase())
    );
  }

  async getFlight(id: number): Promise<Flight | undefined> {
    const [flight] = await db.select().from(flights).where(eq(flights.id, id));
    return flight || undefined;
  }

  async createFlight(insertFlight: InsertFlight): Promise<Flight> {
    const [flight] = await db
      .insert(flights)
      .values(insertFlight)
      .returning();
    return flight;
  }

  // Seat methods
  async getFlightSeats(flightId: number): Promise<Seat[]> {
    return await db.select().from(seats).where(eq(seats.flightId, flightId));
  }

  async getSeat(id: number): Promise<Seat | undefined> {
    const [seat] = await db.select().from(seats).where(eq(seats.id, id));
    return seat || undefined;
  }

  async updateSeatAvailability(id: number, isAvailable: boolean): Promise<Seat | undefined> {
    const [seat] = await db
      .update(seats)
      .set({ isAvailable })
      .where(eq(seats.id, id))
      .returning();
    
    if (seat) {
      console.log(`Seat availability updated: seatId ${id} (${seat.seatNumber}) -> ${isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}`);
    } else {
      console.log(`Failed to update seat availability: seatId ${id} not found`);
    }
    
    return seat || undefined;
  }

  async createSeat(insertSeat: InsertSeat): Promise<Seat> {
    const [seat] = await db
      .insert(seats)
      .values(insertSeat)
      .returning();
    return seat;
  }

  // Service methods
  async getServices(phase?: string): Promise<Service[]> {
    if (phase) {
      return await db.select().from(services).where(
        and(eq(services.isActive, true), eq(services.phase, phase))
      );
    }
    return await db.select().from(services).where(eq(services.isActive, true));
  }

  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service || undefined;
  }

  async updateServiceInventory(id: number, inventory: number): Promise<Service | undefined> {
    const [service] = await db
      .update(services)
      .set({ inventory })
      .where(eq(services.id, id))
      .returning();
    return service || undefined;
  }

  async restoreServiceInventory(serviceId: number, quantity: number): Promise<void> {
    try {
      const service = await this.getService(serviceId);
      if (service && service.inventory !== null) {
        const newInventory = (service.inventory || 0) + quantity;
        await this.updateServiceInventory(serviceId, newInventory);
        console.log(`Restored service ${serviceId} inventory by ${quantity} to ${newInventory}`);
      }
    } catch (error) {
      console.error('Error restoring service inventory:', error);
    }
  }

  async reserveServiceInventory(id: number, quantity: number): Promise<Service | undefined> {
    const service = await this.getService(id);
    if (!service || service.inventory < quantity) {
      throw new Error(`Insufficient inventory for service ${id}`);
    }
    
    const newInventory = service.inventory - quantity;
    return await this.updateServiceInventory(id, newInventory);
  }

  async restoreServiceInventory(id: number, quantity: number): Promise<Service | undefined> {
    const service = await this.getService(id);
    if (!service) return undefined;
    
    const newInventory = service.inventory + quantity;
    return await this.updateServiceInventory(id, newInventory);
  }

  async createService(insertService: InsertService): Promise<Service> {
    const [service] = await db
      .insert(services)
      .values(insertService)
      .returning();
    return service;
  }

  // Order methods
  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
    
    if (!order) return undefined;

    return order;
  }

  async getUserOrders(userId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.userId, userId));
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const orderNumber = `SL${Date.now().toString().slice(-6)}`;
    
    // Create order with pending status - do NOT reserve seats/services yet
    const [order] = await db
      .insert(orders)
      .values({
        ...insertOrder,
        orderNumber,
        status: "pending",
        paymentStatus: "pending",
        assignedSeats: [], // Empty until payment is completed
      })
      .returning();
    return order;
  }

  // New method to complete payment and reserve seats/services
  async completeOrderPayment(orderId: number, paymentDetails: any): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) return undefined;

    if ((order.status !== "pending" && order.status !== "pending_payment") || order.paymentStatus !== "pending") {
      throw new Error("Order is not in pending payment status");
    }

    console.log(`Completing payment for order ${order.orderNumber} - reserving seats and services`);
    
    // Now reserve seats for all passengers
    let assignedSeats: any[] = [];
    if (order.flightId && order.passengerInfo) {
      const passengers = order.passengerInfo as any[];
      const availableSeats = await this.getFlightSeats(order.flightId);
      const economySeats = availableSeats.filter(seat => 
        seat.isAvailable && seat.seatType === 'economy' && !seat.isExtraLegroom
      );
      
      if (economySeats.length < passengers.length) {
        throw new Error("Not enough available seats for all passengers");
      }

      // Randomly assign seats to passengers
      const shuffledSeats = [...economySeats].sort(() => Math.random() - 0.5);
      assignedSeats = passengers.map((passenger, index) => ({
        passengerId: index,
        passengerName: `${passenger.firstName} ${passenger.lastName}`,
        seatId: shuffledSeats[index]?.id,
        seatNumber: shuffledSeats[index]?.seatNumber,
        seatType: shuffledSeats[index]?.seatType,
        seatClass: shuffledSeats[index]?.seatClass
      }));
      
      // Mark seats as unavailable
      for (const seatAssignment of assignedSeats) {
        if (seatAssignment.seatId) {
          await this.updateSeatAvailability(seatAssignment.seatId, false);
          console.log(`Reserved seat: ${seatAssignment.seatNumber} for passenger: ${seatAssignment.passengerName}`);
        }
      }
    }

    // Update service inventory for selected services
    if (order.selectedServices && Array.isArray(order.selectedServices)) {
      for (const service of order.selectedServices as any[]) {
        // Parse service ID to integer if it's a string like "service-3"
        let serviceId = service.id;
        if (typeof serviceId === 'string' && serviceId.startsWith('service-')) {
          serviceId = parseInt(serviceId.replace('service-', ''));
        } else if (typeof serviceId === 'string') {
          serviceId = parseInt(serviceId);
        }
        
        if (!isNaN(serviceId)) {
          const serviceData = await this.getService(serviceId);
          if (serviceData && serviceData.inventory !== null) {
            const newInventory = Math.max(0, (serviceData.inventory || 0) - (service.quantity || 1));
            await this.updateServiceInventory(serviceId, newInventory);
            console.log(`Updated service inventory: ${service.name} -> ${newInventory}`);
          }
        } else {
          console.log(`Skipping invalid service ID: ${service.id}`);
        }
      }
    }

    // Update passenger-specific services inventory
    if (order.passengerInfo && Array.isArray(order.passengerInfo)) {
      for (const passenger of order.passengerInfo as any[]) {
        if (passenger.services && Array.isArray(passenger.services)) {
          for (const service of passenger.services) {
            // Parse service ID to integer if it's a string like "service-3"
            let serviceId = service.id;
            if (typeof serviceId === 'string' && serviceId.startsWith('service-')) {
              serviceId = parseInt(serviceId.replace('service-', ''));
            } else if (typeof serviceId === 'string') {
              serviceId = parseInt(serviceId);
            }
            
            if (!isNaN(serviceId)) {
              const serviceData = await this.getService(serviceId);
              if (serviceData && serviceData.inventory !== null) {
                const newInventory = Math.max(0, (serviceData.inventory || 0) - (service.quantity || 1));
                await this.updateServiceInventory(serviceId, newInventory);
                console.log(`Updated passenger service inventory: ${service.name} -> ${newInventory}`);
              }
            } else {
              console.log(`Skipping invalid passenger service ID: ${service.id}`);
            }
          }
        }
      }
    }
    
    // Update order status to confirmed with payment details
    const [updatedOrder] = await db
      .update(orders)
      .set({ 
        status: "confirmed",
        paymentStatus: "paid",
        canCheckIn: true,
        assignedSeats,
        paymentMethod: paymentDetails.paymentMethod,
        paymentDetails: paymentDetails,
      })
      .where(eq(orders.id, orderId))
      .returning();
    
    return updatedOrder;
  }

  async updateOrder(id: number, updates: any): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set(updates)
      .where(eq(orders.id, id))
      .returning();
    return order || undefined;
  }

  async updateOrderStatus(id: number, status: string, paymentStatus: string): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({ 
        status, 
        paymentStatus
      })
      .where(eq(orders.id, id))
      .returning();
    return order || undefined;
  }

  async cancelOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return undefined;
    
    console.log(`Cancelling order ${order.orderNumber} - restoring seat availability`);
    
    // Restore seat availability if seats were assigned
    if (order.seatId) {
      console.log(`Restoring single seat availability for seatId: ${order.seatId}`);
      await this.updateSeatAvailability(order.seatId, true);
    }
    
    // Restore multi-passenger seat availability
    if (order.assignedSeats && Array.isArray(order.assignedSeats)) {
      const assignedSeats = order.assignedSeats as any[];
      console.log(`Restoring ${assignedSeats.length} assigned seats:`, assignedSeats.map(s => ({ seatId: s.seatId, seatNumber: s.seatNumber })));
      for (const seatAssignment of assignedSeats) {
        if (seatAssignment.seatId) {
          await this.updateSeatAvailability(seatAssignment.seatId, true);
          console.log(`Restored seat availability for seatId: ${seatAssignment.seatId} (${seatAssignment.seatNumber})`);
        }
      }
    }
    
    const [updatedOrder] = await db
      .update(orders)
      .set({ 
        status: "cancelled",
        paymentStatus: "refunded"
      })
      .where(eq(orders.id, id))
      .returning();
    
    // Add refund to user wallet
    if (order.userId) {
      const user = await this.getUser(order.userId);
      if (user) {
        const newBalance = (parseFloat(user.walletBalance || "0") + parseFloat(order.total)).toFixed(2);
        await this.updateUser(order.userId, { walletBalance: newBalance });
      }
    }
    
    return updatedOrder;
  }

  async removeServiceFromOrder(orderId: number, serviceId: number): Promise<Order | undefined> {
    const order = await this.getOrder(orderId);
    if (!order || !order.selectedServices) return undefined;

    const services = order.selectedServices as any[];
    const serviceIndex = services.findIndex((s: any) => s.id === serviceId);
    
    if (serviceIndex === -1) return undefined;

    const removedService = services[serviceIndex];
    const updatedServices = services.filter((s: any) => s.id !== serviceId);
    
    // Recalculate totals
    const servicePrice = parseFloat(removedService.price) * (removedService.quantity || 1);
    const newSubtotal = parseFloat(order.subtotal) - servicePrice;
    const newTaxes = newSubtotal * 0.12;
    const newTotal = newSubtotal + newTaxes;

    const [updatedOrder] = await db
      .update(orders)
      .set({
        selectedServices: updatedServices,
        subtotal: newSubtotal.toFixed(2),
        taxes: newTaxes.toFixed(2),
        total: newTotal.toFixed(2),
      })
      .where(eq(orders.id, orderId))
      .returning();

    return updatedOrder || undefined;
  }

  async addServiceToOrder(orderId: number, service: any): Promise<Order | undefined> {
    const order = await this.getOrder(orderId);
    if (!order) return undefined;

    const currentServices = (order.selectedServices as any[]) || [];
    const updatedServices = [...currentServices, service];
    
    // Calculate new totals
    const servicePrice = parseFloat(service.price) * (service.quantity || 1);
    const newSubtotal = parseFloat(order.subtotal) + servicePrice;
    const newTaxes = newSubtotal * 0.12;
    const newTotal = newSubtotal + newTaxes;

    const [updatedOrder] = await db
      .update(orders)
      .set({
        selectedServices: updatedServices,
        subtotal: newSubtotal.toFixed(2),
        taxes: newTaxes.toFixed(2),
        total: newTotal.toFixed(2),
      })
      .where(eq(orders.id, orderId))
      .returning();

    return updatedOrder || undefined;
  }

  async updateWalletBalance(userId: number, amount: number): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;

    const currentBalance = parseFloat(user.walletBalance || "0.00");
    const newBalance = currentBalance + amount;

    const [updatedUser] = await db
      .update(users)
      .set({ walletBalance: newBalance.toFixed(2) })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser || undefined;
  }

  async addWalletTransaction(userId: number, amount: number, type: 'credit' | 'debit', description: string): Promise<void> {
    // Log the transaction
    console.log(`Wallet ${type}: User ${userId}, Amount: ${amount.toFixed(2)}, Description: ${description}`);
    
    // Update the wallet balance in the database
    const adjustedAmount = type === 'credit' ? amount : -amount;
    await this.updateWalletBalance(userId, adjustedAmount);
  }

  // Booking history methods
  async createBookingHistory(insertHistory: InsertBookingHistory): Promise<BookingHistory> {
    const [history] = await db
      .insert(bookingHistory)
      .values({
        ...insertHistory,
        timestamp: new Date(),
      })
      .returning();
    return history;
  }

  async getUserBookingHistory(userId: number): Promise<BookingHistory[]> {
    return await db.select().from(bookingHistory).where(eq(bookingHistory.userId, userId));
  }

  // Passenger methods
  async getPassenger(id: number): Promise<Passenger | undefined> {
    const [passenger] = await db.select().from(passengers).where(eq(passengers.id, id));
    return passenger || undefined;
  }

  async getUserPassengers(userId: number): Promise<Passenger[]> {
    return await db.select().from(passengers).where(eq(passengers.userId, userId));
  }

  async createPassenger(insertPassenger: InsertPassenger): Promise<Passenger> {
    const [passenger] = await db
      .insert(passengers)
      .values({
        ...insertPassenger,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return passenger;
  }

  async updatePassenger(id: number, updates: Partial<Passenger>): Promise<Passenger | undefined> {
    const [updatedPassenger] = await db
      .update(passengers)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(passengers.id, id))
      .returning();
    return updatedPassenger || undefined;
  }

  async deletePassenger(id: number): Promise<boolean> {
    const result = await db.delete(passengers).where(eq(passengers.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Loyalty Tier Methods
  async getLoyaltyTiers(): Promise<LoyaltyTier[]> {
    return await db.select().from(loyaltyTiers).where(eq(loyaltyTiers.isActive, true)).orderBy(loyaltyTiers.priority);
  }

  async getLoyaltyTier(tierName: string): Promise<LoyaltyTier | undefined> {
    const [tier] = await db.select().from(loyaltyTiers).where(eq(loyaltyTiers.tierName, tierName));
    return tier || undefined;
  }

  async createLoyaltyTier(insertTier: InsertLoyaltyTier): Promise<LoyaltyTier> {
    const [tier] = await db
      .insert(loyaltyTiers)
      .values(insertTier)
      .returning();
    return tier;
  }

  // Loyalty Bundle Methods
  async getLoyaltyBundles(tierName?: string, phase?: string): Promise<LoyaltyBundle[]> {
    let query = db.select().from(loyaltyBundles).where(eq(loyaltyBundles.isActive, true));
    
    if (tierName) {
      query = query.where(eq(loyaltyBundles.tierName, tierName));
    }
    
    if (phase) {
      query = query.where(eq(loyaltyBundles.phase, phase));
    }
    
    return await query;
  }

  async createLoyaltyBundle(insertBundle: InsertLoyaltyBundle): Promise<LoyaltyBundle> {
    const [bundle] = await db
      .insert(loyaltyBundles)
      .values(insertBundle)
      .returning();
    return bundle;
  }

  // Points Transaction Methods
  async createPointsTransaction(insertTransaction: InsertPointsTransaction): Promise<PointsTransaction> {
    const [transaction] = await db
      .insert(pointsTransactions)
      .values(insertTransaction)
      .returning();
    return transaction;
  }

  async getUserPointsTransactions(userId: number): Promise<PointsTransaction[]> {
    return await db.select().from(pointsTransactions)
      .where(eq(pointsTransactions.userId, userId))
      .orderBy(desc(pointsTransactions.createdAt));
  }

  // Tier History Methods
  async createTierHistory(insertHistory: InsertTierHistory): Promise<TierHistory> {
    const [history] = await db
      .insert(tierHistory)
      .values(insertHistory)
      .returning();
    return history;
  }

  async getUserTierHistory(userId: number): Promise<TierHistory[]> {
    return await db.select().from(tierHistory)
      .where(eq(tierHistory.userId, userId))
      .orderBy(desc(tierHistory.upgradeDate));
  }

  // Loyalty System Business Logic
  async calculateTierEligibility(userId: number): Promise<{ suggestedTier: string; qualified: boolean; progressToNext: any }> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');

    const tiers = await this.getLoyaltyTiers();
    const currentTier = tiers.find(t => t.tierName === user.loyaltyTier) || tiers[0];
    
    // Find the highest tier the user qualifies for
    let qualifiedTier = tiers[0]; // Default to lowest tier
    
    for (const tier of tiers.reverse()) { // Check from highest to lowest
      const qualifiesPoints = user.loyaltyPoints >= tier.minPoints;
      const qualifiesMiles = user.totalMilesFlown >= tier.minMiles;
      const qualifiesSpend = parseFloat(user.totalSpent) >= parseFloat(tier.minSpend);
      
      if (qualifiesPoints || qualifiesMiles || qualifiesSpend) {
        qualifiedTier = tier;
        break;
      }
    }

    // Calculate progress to next tier
    const nextTierIndex = tiers.findIndex(t => t.tierName === qualifiedTier.tierName) + 1;
    const nextTier = nextTierIndex < tiers.length ? tiers[nextTierIndex] : null;
    
    let progressToNext = null;
    if (nextTier) {
      progressToNext = {
        tierName: nextTier.tierName,
        displayName: nextTier.displayName,
        pointsNeeded: Math.max(0, nextTier.minPoints - user.loyaltyPoints),
        milesNeeded: Math.max(0, nextTier.minMiles - user.totalMilesFlown),
        spendNeeded: Math.max(0, parseFloat(nextTier.minSpend) - parseFloat(user.totalSpent)),
        progressPercentage: Math.max(
          (user.loyaltyPoints / nextTier.minPoints) * 100,
          (user.totalMilesFlown / nextTier.minMiles) * 100,
          (parseFloat(user.totalSpent) / parseFloat(nextTier.minSpend)) * 100
        )
      };
    }

    return {
      suggestedTier: qualifiedTier.tierName,
      qualified: qualifiedTier.tierName !== user.loyaltyTier,
      progressToNext
    };
  }

  async updateUserLoyaltyStats(userId: number, order: Order, flight: Flight): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    // Calculate miles earned (simplified - in reality would use flight distance)
    const milesEarned = Math.round(parseFloat(flight.price) * 2); // 2 miles per dollar spent
    
    // Calculate points earned with tier multiplier
    const tier = await this.getLoyaltyTier(user.loyaltyTier);
    const multiplier = tier ? parseFloat(tier.multiplier) : 1.0;
    const basePoints = Math.round(parseFloat(order.total) * 10); // 10 points per dollar
    const pointsEarned = Math.round(basePoints * multiplier);

    // Update user loyalty stats
    await this.updateUser(userId, {
      loyaltyPoints: user.loyaltyPoints + pointsEarned,
      totalMilesFlown: user.totalMilesFlown + milesEarned,
      totalSpent: (parseFloat(user.totalSpent) + parseFloat(order.total)).toFixed(2),
      lifetimeMiles: user.lifetimeMiles + milesEarned,
    });

    // Create points transaction record
    await this.createPointsTransaction({
      userId,
      orderId: order.id,
      transactionType: 'earned',
      points: pointsEarned,
      description: `Points earned from booking ${order.orderNumber}`,
      multiplier: multiplier.toFixed(2),
      basePoints,
    });

    // Check for tier upgrade
    const eligibility = await this.calculateTierEligibility(userId);
    if (eligibility.qualified) {
      await this.upgradeUserTier(userId, eligibility.suggestedTier);
    }
  }

  async upgradeUserTier(userId: number, newTier: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user || user.loyaltyTier === newTier) return;

    const previousTier = user.loyaltyTier;
    
    // Update user tier
    await this.updateUser(userId, {
      loyaltyTier: newTier,
      tierAnniversary: new Date(),
    });

    // Record tier history
    await this.createTierHistory({
      userId,
      previousTier,
      newTier,
      qualificationMethod: 'points', // Simplified
      qualificationValue: user.loyaltyPoints,
      isDowngrade: false,
    });

    // Award tier upgrade bonus points
    const bonusPoints = this.getTierUpgradeBonus(newTier);
    if (bonusPoints > 0) {
      await this.updateUser(userId, {
        loyaltyPoints: user.loyaltyPoints + bonusPoints,
      });

      await this.createPointsTransaction({
        userId,
        transactionType: 'bonus',
        points: bonusPoints,
        description: `Tier upgrade bonus for reaching ${newTier} status`,
        multiplier: '1.00',
        basePoints: bonusPoints,
      });
    }
  }

  private getTierUpgradeBonus(tierName: string): number {
    const bonuses: { [key: string]: number } = {
      'silver': 2500,
      'gold': 5000,
      'platinum': 10000,
      'diamond': 25000,
    };
    return bonuses[tierName] || 0;
  }

  async getBundleDiscountForTier(tierName: string, phase: string = 'booking'): Promise<{bundles: LoyaltyBundle[], totalDiscount: number}> {
    const bundles = await this.getLoyaltyBundles(tierName, phase);
    const totalDiscount = bundles.reduce((sum, bundle) => {
      return sum + (bundle.isComplimentary ? 100 : parseFloat(bundle.discountPercentage));
    }, 0);
    
    return { bundles, totalDiscount };
  }

  // Cart management methods
  async getUserCartItems(userId: number): Promise<CartItem[]> {
    return await db.select().from(cartItems)
      .where(eq(cartItems.userId, userId))
      .orderBy(cartItems.createdAt);
  }

  async addCartItem(insertCartItem: InsertCartItem): Promise<CartItem> {
    // Check if item already exists (by itemId for same user)
    const existingItem = await db.select().from(cartItems)
      .where(and(
        eq(cartItems.userId, insertCartItem.userId),
        eq(cartItems.itemId, insertCartItem.itemId)
      ))
      .limit(1);

    if (existingItem.length > 0) {
      // Update quantity if item exists
      const [updatedItem] = await db
        .update(cartItems)
        .set({
          quantity: existingItem[0].quantity + (insertCartItem.quantity || 1),
          price: insertCartItem.price, // Update price in case it changed
          updatedAt: new Date(),
        })
        .where(eq(cartItems.id, existingItem[0].id))
        .returning();
      return updatedItem;
    } else {
      // Insert new item
      const [newItem] = await db
        .insert(cartItems)
        .values({
          ...insertCartItem,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return newItem;
    }
  }

  async updateCartItem(id: number, updates: Partial<CartItem>): Promise<CartItem | undefined> {
    const [updatedItem] = await db
      .update(cartItems)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(cartItems.id, id))
      .returning();
    return updatedItem || undefined;
  }

  async removeCartItem(id: number): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async clearUserCart(userId: number): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.userId, userId));
  }
}

export const storage = new DatabaseStorage();
