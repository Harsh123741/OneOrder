import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { dynamicPricingService } from "./dynamic-pricing";
import { insertUserSchema, loginSchema, flightSearchSchema, insertOrderSchema, insertCartItemSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware for authentication
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
}

export async function registerRoutes(app: Express): Promise<Server> {

  // Create draft order endpoint for checkout
  app.post("/api/orders/create-draft", authenticateToken, async (req: any, res) => {
    try {
      const orderData = req.body;
      orderData.userId = req.user.userId;
      orderData.status = "pending_payment";
      orderData.paymentStatus = "pending";
      orderData.canCheckIn = false;

      // Generate order number
      const orderNumber = 'SL' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      orderData.orderNumber = orderNumber;

      // Handle passenger-specific services from cart
      if (orderData.items && Array.isArray(orderData.items)) {
        const serviceItems = orderData.items.filter((item: any) => item.type === 'service');
        const passengerInfo = orderData.passengerInfo || [];

        // Group services by passenger
        const servicesByPassenger: { [key: number]: any[] } = {};
        const generalServices: any[] = [];

        serviceItems.forEach((item: any) => {
          if (item.passengerId !== undefined && item.passengerId !== null) {
            if (!servicesByPassenger[item.passengerId]) {
              servicesByPassenger[item.passengerId] = [];
            }
            servicesByPassenger[item.passengerId].push({
              id: item.id,
              name: item.name,
              price: parseFloat(item.price),
              quantity: item.quantity || 1,
              description: item.description,
              phase: item.phase
            });
          } else {
            generalServices.push({
              id: item.id,
              name: item.name,
              price: parseFloat(item.price),
              quantity: item.quantity || 1,
              description: item.description,
              phase: item.phase
            });
          }
        });

        // Attribute services to specific passengers
        if (Array.isArray(passengerInfo)) {
          passengerInfo.forEach((passenger: any, index: number) => {
            if (servicesByPassenger[index]) {
              passenger.services = servicesByPassenger[index];
            }
          });
        }

        // Store general services in selectedServices for backward compatibility
        orderData.selectedServices = generalServices;
        orderData.passengerInfo = passengerInfo;
      }

      // Process loyalty bundles if provided
      if (orderData.loyaltyTier && orderData.selectedLoyaltyBundles) {
        const bundles = await storage.getLoyaltyBundles(orderData.loyaltyTier, 'booking');
        const selectedBundles = bundles.filter(bundle => 
          orderData.selectedLoyaltyBundles.includes(bundle.id)
        );

        // Apply loyalty bundle information to order
        orderData.loyaltyTierAtBooking = orderData.loyaltyTier;
        orderData.loyaltyBundles = selectedBundles.map(bundle => bundle.id);

        // Separate complimentary and discounted services
        const complimentaryServices: any[] = [];
        const tierDiscounts: any[] = [];

        selectedBundles.forEach(bundle => {
          if (bundle.isComplimentary) {
            complimentaryServices.push({
              bundleId: bundle.id,
              bundleName: bundle.bundleName,
              serviceIds: bundle.serviceIds,
              description: bundle.description
            });
          } else {
            tierDiscounts.push({
              bundleId: bundle.id,
              bundleName: bundle.bundleName,
              serviceIds: bundle.serviceIds,
              discountPercentage: bundle.discountPercentage,
              description: bundle.description
            });
          }
        });

        orderData.complimentaryServices = complimentaryServices;
        orderData.tierDiscounts = tierDiscounts;
      }

      // Calculate subtotal and taxes
      const total = parseFloat(orderData.total);
      const subtotal = parseFloat((total / 1.12).toFixed(2));
      const taxes = parseFloat((total - subtotal).toFixed(2));

      orderData.subtotal = subtotal;
      orderData.taxes = taxes;
      orderData.total = total;

      const order = await storage.createOrder(orderData);
      res.json(order);
    } catch (error: any) {
      console.error("Error creating draft order:", error);
      res.status(500).json({ error, message: error.message });
    }
  });

  // Payment processing endpoint for completing orders
  app.post("/api/orders/:orderNumber/complete-payment", authenticateToken, async (req: any, res) => {
    try {
      const { orderNumber } = req.params;
      const { paymentMethod, paymentDetails } = req.body;

      const order = await storage.getOrderByNumber(orderNumber);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Ensure user owns the order
      if (order.userId !== req.user.userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if order is in pending payment status
      if ((order.status !== "pending" && order.status !== "pending_payment") || order.paymentStatus !== "pending") {
        return res.status(400).json({ error: "Order is not pending payment" });
      }

      // Check if payment window is still valid (30 minutes from order creation)
      const orderCreatedAt = new Date(order.createdAt);
      const currentTime = new Date();
      const timeDifferenceInMinutes = (currentTime.getTime() - orderCreatedAt.getTime()) / (1000 * 60);

      if (timeDifferenceInMinutes > 30) {
        // Mark the order as expired
        await storage.updateOrder(order.id, { 
          status: "order_expired", 
          paymentStatus: "expired" 
        });
        return res.status(400).json({ 
          error: "Payment window expired", 
          message: "This order has expired. Payment must be completed within 30 minutes of order creation. Please create a new booking."
        });
      }

      // Validate wallet balance if using wallet payment
      if (paymentMethod === "wallet") {
        const user = await storage.getUser(req.user.userId);
        if (!user || parseFloat(user.walletBalance || "0") < parseFloat(order.total)) {
          return res.status(400).json({ error: "Insufficient wallet balance" });
        }

        // Deduct from wallet
        await storage.addWalletTransaction(
          req.user.userId, 
          parseFloat(order.total), 
          'debit', 
          `Payment for order ${order.orderNumber}`
        );
      }

      // Complete payment and reserve seats/services using new method
      const updatedOrder = await storage.completeOrderPayment(order.id, {
        paymentMethod,
        paymentDetails
      });

      if (!updatedOrder) {
        return res.status(500).json({ error: "Failed to complete payment and reserve seats" });
      }

      // Update loyalty stats when payment is completed
      if (order.userId && order.flightId) {
        const flight = await storage.getFlight(order.flightId);
        if (flight) {
          await storage.updateUserLoyaltyStats(order.userId, order, flight);
        }
      }

      // Record booking with dynamic pricing service
      if (order.flightId) {
        try {
          // Calculate passenger count for flight booking
          const passengerCount = Array.isArray(order.passengerInfo) ? order.passengerInfo.length : 1;

          // Record flight booking (affects pricing and inventory)
          await dynamicPricingService.recordBooking('flight', order.flightId, passengerCount);

          // Record service bookings if any
          if (order.selectedServices && Array.isArray(order.selectedServices)) {
            for (const service of order.selectedServices) {
              if (service.id) {
                await dynamicPricingService.recordBooking('service', service.id, service.quantity || 1);
              }
            }
          }

          // Record passenger-specific service bookings
          if (Array.isArray(order.passengerInfo)) {
            for (const passenger of order.passengerInfo) {
              if (passenger.services && Array.isArray(passenger.services)) {
                for (const service of passenger.services) {
                  if (service.id) {
                    await dynamicPricingService.recordBooking('service', service.id, service.quantity || 1);
                  }
                }
              }
            }
          }

          console.log(`Dynamic pricing updated for flight ${order.flightId} with ${passengerCount} passengers`);
        } catch (pricingError) {
          console.error("Error updating dynamic pricing:", pricingError);
          // Don't fail the order if pricing update fails
        }
      }

      res.json(updatedOrder);
    } catch (error: any) {
      console.error("Error completing payment:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Check and update expired orders endpoint
  app.post("/api/orders/check-expired", authenticateToken, async (req: any, res) => {
    try {
      const userOrders = await storage.getUserOrders(req.user.userId);
      const currentTime = new Date();
      let updatedCount = 0;

      for (const order of userOrders) {
        if ((order.status === "pending" || order.status === "pending_payment") && order.paymentStatus === "pending") {
          const orderCreatedAt = new Date(order.createdAt);
          const timeDifferenceInMinutes = (currentTime.getTime() - orderCreatedAt.getTime()) / (1000 * 60);

          if (timeDifferenceInMinutes > 30) {
            await storage.updateOrder(order.id, { 
              status: "order_expired", 
              paymentStatus: "expired" 
            });
            updatedCount++;
          }
        }
      }

      res.json({ 
        message: `${updatedCount} orders updated to expired status`,
        updatedCount 
      });
    } catch (error: any) {
      console.error("Error checking expired orders:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get order by number endpoint
  app.get("/api/orders/number/:orderNumber", authenticateToken, async (req: any, res) => {
    try {
      const { orderNumber } = req.params;
      const order = await storage.getOrderByNumber(orderNumber);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Only allow user to view their own orders
      if (order.userId !== req.user.userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(order);
    } catch (error: any) {
      console.error("Error fetching order:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Payment processing endpoint for service modifications
  app.post("/api/orders/payment/services", authenticateToken, async (req: any, res) => {
    try {
      const { orderNumber, services, paymentMethod } = req.body;

      // Process service modification payment
      const order = await storage.getOrderByNumber(orderNumber);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Calculate total for new services
      const total = services.reduce((sum: number, service: any) => sum + parseFloat(service.price), 0);

      // Add services to order
      for (const service of services) {
        await storage.addServiceToOrder(order.id, service);
      }

      res.json({ orderNumber, total, paymentMethod });
    } catch (error: any) {
      console.error("Error processing service payment:", error);
      res.status(500).json({ error: error.message });
    }
  });
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      const user = await storage.createUser(userData);
      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET);

      const { password, ...userResponse } = user;
      res.json({ user: userResponse, token });
    } catch (error) {
      res.status(400).json({ message: "Invalid user data", error });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET);
      const { password: _, ...userResponse } = user;

      res.json({ user: userResponse, token });
    } catch (error) {
      res.status(400).json({ message: "Invalid login data", error });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Flight routes
  app.post("/api/flights/search", async (req, res) => {
    try {
      console.log("Flight search request body:", req.body);

      // Simple validation without schema for now
      const { from, to, departureDate, passengers = 1, class: flightClass = "economy", tripType = "one_way" } = req.body;

      if (!from || !to || !departureDate) {
        return res.status(400).json({ message: "Missing required fields: from, to, departureDate" });
      }

      const searchCriteria = {
        from,
        to,
        departureDate,
        passengers: typeof passengers === 'string' ? parseInt(passengers) : passengers,
        class: flightClass,
        tripType
      };

      console.log("Search criteria:", searchCriteria);
      const flights = await storage.searchFlights(searchCriteria);

      // Get userId if authenticated
      let userId = null;
      try {
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          userId = decoded.userId;
        }
      } catch (e) {
        // Not authenticated, continue with dynamic pricing
      }

      // Integrate dynamic pricing for each flight
      const flightsWithDynamicPricing = await Promise.all(
        flights.map(async (flight) => {
          try {
            // Initialize pricing if it doesn't exist
            await dynamicPricingService.initializeFlightPricing(flight.id, parseFloat(flight.price));

            // Check for active fare hold if user is authenticated
            let fareHoldPrice = null;
            let fareHold = [];
            if (userId) {
              fareHold = await dynamicPricingService.getUserFareHold(userId, flight.id);
              if (fareHold.length > 0) {
                fareHoldPrice = fareHold[0].lockedFarePrice;
              }
            }

            // Get current dynamic price
            const currentPricing = await dynamicPricingService.getCurrentPrice('flight', flight.id);

            if (currentPricing) {
              return {
                ...flight,
                originalPrice: flight.price,
                price: fareHoldPrice || currentPricing.currentPrice, // Use locked price if available
                dynamicPricing: {
                  basePrice: currentPricing.basePrice,
                  currentPrice: currentPricing.currentPrice,
                  demandMultiplier: currentPricing.demandMultiplier,
                  timeMultiplier: currentPricing.timeMultiplier,
                  totalBookings: currentPricing.totalBookings,
                  inventoryLevel: currentPricing.inventoryLevel,
                  lastUpdated: currentPricing.lastUpdated,
                  isLocked: !!fareHoldPrice,
                  userFareHold: fareHold.length > 0 ? fareHold[0] : null // Include fare hold info for this specific user
                }
              };
            }

            return flight;
          } catch (pricingError) {
            console.error(`Dynamic pricing error for flight ${flight.id}:`, pricingError);
            return flight; // Return original flight if pricing fails
          }
        })
      );

      res.json(flightsWithDynamicPricing);
    } catch (error: any) {
      console.error("Flight search error:", error);
      res.status(400).json({ message: "Flight search failed", error: error.message });
    }
  });

  // Get flight by ID
  app.get("/api/flights/:id", async (req, res) => {
    try {
      const flightId = parseInt(req.params.id);
      const flight = await storage.getFlight(flightId);

      if (!flight) {
        return res.status(404).json({ message: "Flight not found" });
      }

      // Get user ID if authenticated for fare hold check
      const token = req.headers.authorization?.split(' ')[1];
      let userId = null;
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          userId = decoded.userId;
        } catch (error) {
          // Token invalid or expired, continue without user ID
        }
      }

      // Check for active fare hold if user is authenticated
      let fareHoldPrice = null;
      let fareHold = [];
      if (userId) {
        fareHold = await dynamicPricingService.getUserFareHold(userId, flight.id);
        if (fareHold.length > 0) {
          fareHoldPrice = fareHold[0].lockedFarePrice;
        }
      }

      // Get current dynamic price
      const currentPricing = await dynamicPricingService.getCurrentPrice('flight', flight.id);

      if (currentPricing) {
        res.json({
          ...flight,
          originalPrice: flight.price,
          price: fareHoldPrice || currentPricing.currentPrice, // Use locked price if available
          dynamicPricing: {
            basePrice: currentPricing.basePrice,
            currentPrice: currentPricing.currentPrice,
            demandMultiplier: currentPricing.demandMultiplier,
            timeMultiplier: currentPricing.timeMultiplier,
            totalBookings: currentPricing.totalBookings,
            inventoryLevel: currentPricing.inventoryLevel,
            lastUpdated: currentPricing.lastUpdated,
            isLocked: !!fareHoldPrice,
            userFareHold: fareHold.length > 0 ? fareHold[0] : null
          }
        });
      } else {
        res.json(flight);
      }
    } catch (error) {
      console.error("Error fetching flight:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/flights/:id/seats", async (req, res) => {
    try {
      const flightId = parseInt(req.params.id);
      const seats = await storage.getFlightSeats(flightId);
      res.json(seats);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Service routes with real-time dynamic pricing
  app.get("/api/services", async (req, res) => {
    try {
      const phase = req.query.phase as string;
      const services = await storage.getServices(phase);

      // Add dynamic pricing to services with real-time updates
      const servicesWithPricing = await Promise.all(
        services.map(async (service) => {
          try {
            // Initialize service pricing if not exists
            await dynamicPricingService.initializeServicePricing(service.id, parseFloat(service.price));

            // Update pricing to get latest market rates
            await dynamicPricingService.updateServicePricing(service.id);

            // Get current pricing
            const pricing = await dynamicPricingService.getServicePrice(service.id);

            if (pricing) {
              const basePrice = parseFloat(pricing.basePrice);
              const currentPrice = parseFloat(pricing.currentPrice);
              const pricingTag = dynamicPricingService.getServicePricingTag(pricing);

              return {
                ...service,
                basePrice: basePrice.toFixed(2),
                price: currentPrice.toFixed(2), // Use dynamic pricing as the displayed price
                dynamicPricing: {
                  basePrice,
                  currentPrice,
                  demandMultiplier: parseFloat(pricing.demandMultiplier || "1.0"),
                  inventoryLevel: pricing.inventoryLevel || 100,
                  totalBookings: pricing.totalBookings || 0,
                  lastUpdated: pricing.lastUpdated,
                  pricingTag
                }
              };
            }

            return service;
          } catch (pricingError) {
            console.error(`Service pricing error for service ${service.id}:`, pricingError);
            return service;
          }
        })
      );

      res.json(servicesWithPricing);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/services/:id", async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const service = await storage.getService(serviceId);

      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }

      try {
        // Get dynamic pricing for individual service
        await dynamicPricingService.initializeServicePricing(serviceId, parseFloat(service.price));
        const pricing = await dynamicPricingService.getServicePrice(serviceId);

        if (pricing) {
          const basePrice = parseFloat(pricing.basePrice);
          const currentPrice = parseFloat(pricing.currentPrice);
          const pricingTag = dynamicPricingService.getServicePricingTag(pricing);

          const serviceWithPricing = {
            ...service,
            basePrice: basePrice.toFixed(2),
            price: currentPrice.toFixed(2),
            dynamicPricing: {
              basePrice,
              currentPrice,
              demandMultiplier: parseFloat(pricing.demandMultiplier || "1.0"),
              inventoryLevel: pricing.inventoryLevel || 100,
              totalBookings: pricing.totalBookings || 0,
              lastUpdated: pricing.lastUpdated,
              pricingTag
            }
          };

          return res.json(serviceWithPricing);
        }
      } catch (pricingError) {
        console.error(`Service pricing error for service ${serviceId}:`, pricingError);
      }

      res.json(service);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Order routes  
  app.post("/api/orders", authenticateToken, async (req: any, res) => {
    try {
      const { passengers, selectedServices, ...orderData } = req.body;

      // Generate order number
      const orderNumber = 'SL' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

      // Ensure passengers is properly formatted as array
      const passengerArray = Array.isArray(passengers) ? passengers : (passengers ? [passengers] : []);

      let finalOrderData = {
        ...orderData,
        userId: req.user.userId,
        orderNumber,
        passengerInfo: passengerArray, // Store as array for multi-passenger support
        selectedServices: selectedServices || []
      };

      // Calculate proper pricing including flight cost and multiple passengers
      if (finalOrderData.flightId) {
        const flight = await storage.getFlight(finalOrderData.flightId);
        if (flight) {
          const passengerCount = Math.max(1, passengerArray.length);
          let basePrice = parseFloat(flight.price) * passengerCount; // Flight cost × passengers

          // Add seat prices if selected
          if (finalOrderData.seatIds && Array.isArray(finalOrderData.seatIds)) {
            for (const seatId of finalOrderData.seatIds) {
              if (seatId) {
                const seat = await storage.getSeat(seatId);
                if (seat && seat.price) {
                  basePrice += parseFloat(seat.price);
                }
              }
            }
          }

          // Add services price
          let servicesPrice = 0;
          if (selectedServices && Array.isArray(selectedServices)) {
            servicesPrice = selectedServices.reduce((sum: number, service: any) => {
              return sum + (parseFloat(service.price) * (service.quantity || 1));
            }, 0);
          }

          // Calculate totals
          const subtotal = basePrice + servicesPrice;
          const taxes = subtotal * 0.12;
          const total = subtotal + taxes;

          // Update order data with correct pricing
          finalOrderData.subtotal = subtotal.toFixed(2);
          finalOrderData.taxes = taxes.toFixed(2);
          finalOrderData.total = total.toFixed(2);
        }
      }

      const order = await storage.createOrder(finalOrderData);

      // Update seat availability if seats are selected
      if (finalOrderData.seatIds && Array.isArray(finalOrderData.seatIds)) {
        for (const seatId of finalOrderData.seatIds) {
          if (seatId) {
            await storage.updateSeatAvailability(seatId, false);
          }
        }
      }

      // Create booking history entries for services
      if (selectedServices && Array.isArray(selectedServices)) {
        for (const service of selectedServices) {
          await storage.createBookingHistory({
            userId: req.user.userId,
            serviceId: service.id,
            orderId: order.id,
          });
        }
      }

      console.log(`Order ${orderNumber} created with ${passengerArray.length} passenger(s)`);
      res.json(order);
    } catch (error: any) {
      console.error("Order creation error:", error);
      res.status(500).json({ message: "Failed to create order", details: error.message });
    }
  });

  // Add services to existing order (After Booking Services)
  app.post("/api/orders/:orderNumber/add-services", authenticateToken, async (req: any, res) => {
    try {
      const { orderNumber } = req.params;
      const { services, paymentMethod = 'online_booking' } = req.body;

      if (!services || !Array.isArray(services) || services.length === 0) {
        return res.status(400).json({ message: "Services are required" });
      }

      const order = await storage.getOrderByNumber(orderNumber);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Ensure user owns the order
      if (order.userId !== req.user.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Calculate additional service costs
      let additionalServicesPrice = 0;
      const validatedServices = [];

      for (const service of services) {
        const serviceData = await storage.getService(service.id);
        if (!serviceData || !serviceData.isActive) {
          return res.status(400).json({ message: `Service ${service.id} not found or inactive` });
        }

        const quantity = service.quantity || 1;
        additionalServicesPrice += parseFloat(serviceData.price) * quantity;

        validatedServices.push({
          id: serviceData.id,
          name: serviceData.name,
          price: parseFloat(serviceData.price),
          quantity: quantity,
          passengerId: service.passengerId // Preserve passenger ID
        });

        // Create booking history entry
        await storage.createBookingHistory({
          userId: req.user.userId,
          serviceId: serviceData.id,
          orderId: order.id,
        });
      }

      // Calculate total cost with taxes
      const taxAmount = additionalServicesPrice * 0.12;
      const totalCost = additionalServicesPrice + taxAmount;

      // Validate payment method
      const validPaymentMethods = ['online_booking', 'bank_transfer', 'upi', 'credit_card', 'debit_card'];
      if (!validPaymentMethods.includes(paymentMethod)) {
        return res.status(400).json({ 
          message: "Invalid payment method", 
          validMethods: validPaymentMethods 
        });
      }

      // Group services by passenger ID for multi-passenger orders
      const servicesByPassenger = {};
      for (const service of validatedServices) {
        const passengerId = service.passengerId || 0;
        if (!servicesByPassenger[passengerId]) {
          servicesByPassenger[passengerId] = [];
        }
        servicesByPassenger[passengerId].push(service);
      }

      let updatedOrder = null;

      // Handle multi-passenger orders
      if (order.passengerInfo && Array.isArray(order.passengerInfo)) {
        const passengers = order.passengerInfo as any[];

        // Add services to specific passengers
        for (const [passengerIndex, passengerServices] of Object.entries(servicesByPassenger)) {
          const index = parseInt(passengerIndex);
          if (passengers[index]) {
            if (!passengers[index].services) {
              passengers[index].services = [];
            }

            // Check for duplicate services for this passenger
            const existingPassengerServices = passengers[index].services || [];
            const existingServiceIds = existingPassengerServices.map((s: any) => s.id);
            const duplicateServices = (passengerServices as any[]).filter(s => existingServiceIds.includes(s.id));

            if (duplicateServices.length > 0) {
              return res.status(400).json({ 
                message: `Some services are already added for passenger ${index + 1}`, 
                duplicateServices: duplicateServices.map(s => s.name)
              });
            }

            passengers[index].services = [...existingPassengerServices, ...passengerServices];
          }
        }

        updatedOrder = await storage.updateOrder(order.id, {
          passengerInfo: passengers
        });
      } else {
        // Handle single passenger or legacy orders
        const existingServices = order.selectedServices as any[] || [];
        const existingServiceIds = existingServices.map((s: any) => s.id);
        const duplicateServices = validatedServices.filter(s => existingServiceIds.includes(s.id));

        if (duplicateServices.length > 0) {
          return res.status(400).json({ 
            message: "Some services are already added to this order", 
            duplicateServices: duplicateServices.map(s => s.name)
          });
        }

        const updatedServices = [...existingServices, ...validatedServices];
        updatedOrder = await storage.updateOrder(order.id, {
          selectedServices: updatedServices
        });
      }

      // Process payment (simulated - in real system would integrate with payment gateway)
      // Only deduct from wallet if payment method is 'wallet'
      if (paymentMethod === 'wallet') {
        await storage.addWalletTransaction(req.user.userId, totalCost, 'debit', `Payment via ${paymentMethod} for additional services on order ${orderNumber}`);
      } else {
        // For other payment methods (bank_transfer, credit_card, etc.), just log the transaction
        console.log(`Payment processed: User ${req.user.userId}, Amount: ${totalCost.toFixed(2)}, Method: ${paymentMethod}, Description: Payment for additional services on order ${orderNumber}`);
      }

      // Update order totals
      const currentSubtotal = parseFloat(```tool_code
order.subtotal);
      const newSubtotal = currentSubtotal + additionalServicesPrice;
      const newTaxes = parseFloat(order.taxes) + taxAmount;
      const newTotal = parseFloat(order.total) + totalCost;

      updatedOrder = await storage.updateOrder(order.id, {
        subtotal: newSubtotal.toFixed(2),
        taxes: newTaxes.toFixed(2),
        total: newTotal.toFixed(2),
      });

      res.json({
        success: true,
        message: `${services.length} service(s) added and payment processed`,
        order: updatedOrder,
        addedServices: validatedServices,
        paymentDetails: {
          method: paymentMethod,
          amount: totalCost.toFixed(2),
          services: additionalServicesPrice.toFixed(2),
          taxes: taxAmount.toFixed(2)
        }
      });
    } catch (error) {
      console.error("Add services error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Remove service from existing order with refund
  app.post("/api/orders/:orderNumber/remove-service", authenticateToken, async (req: any, res) => {
    try {
      const { orderNumber } = req.params;
      const { serviceId, passengerId } = req.body;

      if (!serviceId) {
        return res.status(400).json({ message: "Service ID is required" });
      }

      const order = await storage.getOrderByNumber(orderNumber);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Ensure user owns the order
      if (order.userId !== req.user.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      let serviceToRemove = null;
      let updatedOrder = null;

      // Handle passenger-specific service removal for multi-passenger orders
      if (passengerId !== undefined && order.passengerInfo && Array.isArray(order.passengerInfo)) {
        const passengers = order.passengerInfo as any[];
        const passenger = passengers[passengerId];

        if (!passenger || !passenger.services || !Array.isArray(passenger.services)) {
          return res.status(404).json({ message: "Service not found for this passenger" });
        }

        serviceToRemove = passenger.services.find((s: any) => s.id === serviceId);
        if (!serviceToRemove) {
          return res.status(404).json({ message: "Service not found for this passenger" });
        }

        // Remove service from passenger's services
        passenger.services = passenger.services.filter((s: any) => s.id !== serviceId);

        // Update the order with modified passenger info
        updatedOrder = await storage.updateOrder(order.id, {
          passengerInfo: passengers
        });
      } else {
        // Handle single passenger or legacy orders
        const services = order.selectedServices as any[];
        serviceToRemove = services?.find((s: any) => s.id === serviceId);

        if (!serviceToRemove) {
          return res.status(404).json({ message: "Service not found in this order" });
        }

        // Remove service from order
        updatedOrder = await storage.removeServiceFromOrder(order.id, serviceId);
      }

      if (!updatedOrder || !serviceToRemove) {
        return res.status(500).json({ message: "Failed to remove service" });
      }

      // Calculate refund amount
      const servicePrice = parseFloat(serviceToRemove.price) * (serviceToRemove.quantity || 1);
      const taxRefund = servicePrice * 0.12;
      const totalRefund = servicePrice + taxRefund;

      // Update order totals (subtract the removed service cost)
      const newSubtotal = parseFloat(updatedOrder.subtotal) - servicePrice;
      const newTaxes = newSubtotal * 0.12;
      const newTotal = newSubtotal + newTaxes;

      await storage.updateOrder(order.id, {
        subtotal: newSubtotal.toFixed(2),
        taxes: newTaxes.toFixed(2),
        total: newTotal.toFixed(2),
      });

      // Process refund to wallet
      await storage.addWalletTransaction(req.user.userId, totalRefund, 'credit', `Refund for removed service: ${serviceToRemove.name} from order ${orderNumber}`);

      res.json({
        success: true,
        message: `Service "${serviceToRemove.name}" removed and refunded`,
        order: updatedOrder,
        refundDetails: {
          serviceName: serviceToRemove.name,
          servicePrice: servicePrice.toFixed(2),
          taxRefund: taxRefund.toFixed(2),
          totalRefund: totalRefund.toFixed(2),
          refundMethod: 'wallet'
        }
      });
    } catch (error) {
      console.error("Remove service error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/orders/user/:userId", authenticateToken, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);

      // Ensure user can only access their own orders
      if (userId !== req.user.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const orders = await storage.getUserOrders(userId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Passenger Management Routes
  app.get("/api/passengers", authenticateToken, async (req: any, res) => {
    try {
      const passengers = await storage.getUserPassengers(req.user.userId);
      res.json(passengers);
    } catch (error) {
      console.error("Get passengers error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/passengers", authenticateToken, async (req: any, res) => {
    try {
      const passengerData = {
        ...req.body,
        userId: req.user.userId,
      };

      const passenger = await storage.createPassenger(passengerData);
      res.json(passenger);
    } catch (error) {
      console.error("Create passenger error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/passengers/:id", authenticateToken, async (req: any, res) => {
    try {
      const passengerId = parseInt(req.params.id);

      // Verify passenger belongs to user
      const existingPassenger = await storage.getPassenger(passengerId);
      if (!existingPassenger || existingPassenger.userId !== req.user.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedPassenger = await storage.updatePassenger(passengerId, req.body);
      if (!updatedPassenger) {
        return res.status(404).json({ message: "Passenger not found" });
      }

      res.json(updatedPassenger);
    } catch (error) {
      console.error("Update passenger error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/passengers/:id", authenticateToken, async (req: any, res) => {
    try {
      const passengerId = parseInt(req.params.id);

      // Verify passenger belongs to user
      const existingPassenger = await storage.getPassenger(passengerId);
      if (!existingPassenger || existingPassenger.userId !== req.user.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const deleted = await storage.deletePassenger(passengerId);
      if (!deleted) {
        return res.status(404).json({ message: "Passenger not found" });
      }

      res.json({ success: true, message: "Passenger deleted successfully" });
    } catch (error) {
      console.error("Delete passenger error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/orders/:orderNumber", authenticateToken, async (req: any, res) => {
    try {
      const order = await storage.getOrderByNumber(req.params.orderNumber);

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Ensure user can only access their own orders
      if (order.userId !== req.user.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/orders/:id", authenticateToken, async (req: any, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const updates = req.body;

      const existingOrder = await storage.getOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Ensure user can only update their own orders
      if (existingOrder.userId !== req.user.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const order = await storage.updateOrder(orderId, updates);
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/orders/:id", authenticateToken, async (req: any, res) => {
    try {
      const orderId = parseInt(req.params.id);

      const existingOrder = await storage.getOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Ensure user can only cancel their own orders
      if (existingOrder.userId !== req.user.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const cancelledOrder = await storage.cancelOrder(orderId);
      res.json(cancelledOrder);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User routes
  app.get("/api/users/:id/wallet", authenticateToken, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);

      // Ensure user can only access their own wallet
      if (userId !== req.user.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ walletBalance: user.walletBalance });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/users/:id", authenticateToken, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);

      // Ensure user can only update their own information
      if (userId !== req.user.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateData = req.body;
      const user = await storage.updateUser(userId, updateData);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Check-in routes
  app.post("/api/check-in/eligibility", async (req, res) => {
    try {
      const { orderNumber, lastName } = req.body;

      const order = await storage.getOrderByNumber(orderNumber);
      if (!order) {
        return res.json({ eligible: false, message: "Booking not found" });
      }

      // Check if passenger name matches (support multiple passengers)
      const passengerInfo = typeof order.passengerInfo === 'string' ? JSON.parse(order.passengerInfo) : order.passengerInfo;

      let nameMatch = false;
      if (Array.isArray(passengerInfo)) {
        // Multiple passengers - check if any passenger's last name matches
        nameMatch = passengerInfo.some(passenger => 
          passenger.lastName?.toLowerCase() === lastName.toLowerCase()
        );
      } else if (passengerInfo?.lastName) {
        // Single passenger - check direct match
        nameMatch = passengerInfo.lastName.toLowerCase() === lastName.toLowerCase();
      }

      if (!nameMatch) {
        return res.json({ eligible: false, message: "Passenger name does not match" });
      }

      // Check if already checked in
      if (order.isCheckedIn) {
        return res.json({ eligible: false, message: "Already checked in for this flight" });
      }

      // Check if check-in is allowed (flight must be within 24 hours)
      if (!order.canCheckIn) {
        return res.json({ eligible: false, message: "Check-in not yet available" });
      }

      // Get flight details
      if (order.flightId) {
        const flight = await storage.getFlight(order.flightId);

        if (flight) {
          res.json({ 
            eligible: true, 
            order: { 
              ...order, 
              flight 
            } 
          });
        } else {
          res.json({ eligible: false, message: "Flight information not found" });
        }
      } else {
        res.json({ eligible: false, message: "Flight information not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/check-in/complete", async (req, res) => {
    try {
      const { orderNumber, seatId, passengerSeats, paymentMethod = 'wallet' } = req.body;

      if (!orderNumber) {
        return res.status(400).json({ message: "Order number is required" });
      }

      const order = await storage.getOrderByNumber(orderNumber);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Check if already checked in
      if (order.isCheckedIn) {
        return res.status(400).json({ message: "Already checked in" });
      }

      let totalSeatUpgradeCost = 0;
      let upgradeDetails: any[] = [];
      let assignedSeats: any[] = [];

      // Handle multiple passenger seat assignments
      if (passengerSeats && Object.keys(passengerSeats).length > 0) {
        for (const [passengerIndex, seat] of Object.entries(passengerSeats)) {
          const selectedSeat = await storage.getSeat((seat as any).id);
          if (!selectedSeat || !selectedSeat.isAvailable) {
            return res.status(400).json({ 
              message: `Seat ${(seat as any).seatNumber} is not available for passenger ${parseInt(passengerIndex) + 1}` 
            });
          }

          // Calculate upgrade cost for premium seats
          const seatPrice = parseFloat(selectedSeat.price || '0');
          if (seatPrice > 0) {
            totalSeatUpgradeCost += seatPrice;
            upgradeDetails.push({
              passengerIndex: parseInt(passengerIndex),
              seatNumber: selectedSeat.seatNumber,
              seatType: selectedSeat.seatType,
              seatClass: selectedSeat.seatClass,
              isExtraLegroom: selectedSeat.isExtraLegroom,
              cost: seatPrice
            });
          }

          // Store assigned seat info
          assignedSeats.push({
            passengerId: parseInt(passengerIndex),
            seatId: selectedSeat.id,
            seatNumber: selectedSeat.seatNumber,
            seatType: selectedSeat.seatType,
            seatClass: selectedSeat.seatClass,
            isExtraLegroom: selectedSeat.isExtraLegroom
          });

          // Make seat unavailable
          await storage.updateSeatAvailability(selectedSeat.id, false);
        }

        // Process payment for all seat upgrades
        if (totalSeatUpgradeCost > 0) {
          const taxAmount = totalSeatUpgradeCost * 0.12;
          const totalCost = totalSeatUpgradeCost + taxAmount;

          // Deduct from user wallet
          try {
            await storage.addWalletTransaction(
              order.userId!, 
              totalCost, 
              'debit', 
              `Seat upgrades for ${Object.keys(passengerSeats).length} passengers on order ${orderNumber}`
            );

            // Update order totals with seat upgrade cost
            const newSubtotal = parseFloat(order.subtotal) + totalSeatUpgradeCost;
            const newTaxes = parseFloat(order.taxes) + taxAmount;
            const newTotal = parseFloat(order.total) + totalCost;

            await storage.updateOrder(order.id, {
              subtotal: newSubtotal.toFixed(2),
              taxes: newTaxes.toFixed(2),
              total: newTotal.toFixed(2),
            });
          } catch (paymentError) {
            return res.status(400).json({ 
              message: "Insufficient wallet balance for seat upgrades",
              required: totalCost.toFixed(2),
              upgrades: upgradeDetails
            });
          }
        }
      } else if (seatId) {
        // Handle single seat assignment (legacy support)
        const selectedSeat = await storage.getSeat(seatId);
        if (!selectedSeat || !selectedSeat.isAvailable) {
          return res.status(400).json({ message: "Selected seat is not available" });
        }

        const seatPrice = parseFloat(selectedSeat.price || '0');
        if (seatPrice > 0) {
          totalSeatUpgradeCost = seatPrice;
          upgradeDetails.push({
            seatNumber: selectedSeat.seatNumber,
            seatType: selectedSeat.seatType,
            seatClass: selectedSeat.seatClass,
            isExtraLegroom: selectedSeat.isExtraLegroom,
            cost: seatPrice
          });

          const taxAmount = totalSeatUpgradeCost * 0.12;
          const totalCost = totalSeatUpgradeCost + taxAmount;

          try {
            await storage.addWalletTransaction(
              order.userId!, 
              totalCost, 
              'debit', 
              `Seat upgrade to ${selectedSeat.seatNumber} for order ${orderNumber}`
            );

            const newSubtotal = parseFloat(order.subtotal) + totalSeatUpgradeCost;
            const newTaxes = parseFloat(order.taxes) + taxAmount;
            const newTotal = parseFloat(order.total) + totalCost;

            await storage.updateOrder(order.id, {
              subtotal: newSubtotal.toFixed(2),
              taxes: newTaxes.toFixed(2),
              total: newTotal.toFixed(2),
            });
          } catch (paymentError) {
            return res.status(400).json({ 
              message: "Insufficient wallet balance for seat upgrade",
              required: totalCost.toFixed(2)
            });
          }
        }

        assignedSeats.push({
          passengerId: 0,
          seatId: selectedSeat.id,
          seatNumber: selectedSeat.seatNumber,
          seatType: selectedSeat.seatType,
          seatClass: selectedSeat.seatClass,
          isExtraLegroom: selectedSeat.isExtraLegroom
        });

        if (order.seatId) {
          await storage.updateSeatAvailability(order.seatId, true);
        }
        await storage.updateSeatAvailability(seatId, false);
      }

      // Create update object
      const updates: any = {
        isCheckedIn: true,
        checkInTime: new Date(),
        assignedSeats: assignedSeats
      };

      if (seatId) {
        updates.seatId = seatId;
      }

      const updatedOrder = await storage.updateOrder(order.id, updates);

      res.json({
        success: true,
        message: totalSeatUpgradeCost > 0 ? 
          `Check-in completed with seat upgrades. Charged $${(totalSeatUpgradeCost * 1.12).toFixed(2)} total.` :
          "Check-in completed successfully",
        order: updatedOrder,
        assignedSeats: assignedSeats,
        seatUpgrades: upgradeDetails,
        paymentProcessed: totalSeatUpgradeCost > 0 ? {
          amount: totalSeatUpgradeCost.toFixed(2),
          taxes: (totalSeatUpgradeCost * 0.12).toFixed(2),
          total: (totalSeatUpgradeCost * 1.12).toFixed(2),
          method: paymentMethod
        } : null
      });
    } catch (error) {
      console.error("Check-in error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: "Internal server error", details: errorMessage });
    }
  });

  app.post("/api/check-in/:orderId", async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const { seatId } = req.body;

      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.isCheckedIn) {
        return res.status(400).json({ message: "Already checked in" });
      }

      // Update seat if provided
      if (seatId) {
        const seat = await storage.getSeat(seatId);
        if (!seat || !seat.isAvailable) {
          return res.status(400).json({ message: "Seat not available" });
        }

        // Make old seat available and new seat unavailable
        if (order.seatId) {
          await storage.updateSeatAvailability(order.seatId, true);
        }
        await storage.updateSeatAvailability(seatId, false);
      }

      // Update order to checked in
      const updatedOrder = await storage.updateOrder(orderId, {
        isCheckedIn: true,
        seatId: seatId || order.seatId,
      });

      res.json({ 
        success: true, 
        message: "Check-in successful",
        order: updatedOrder 
      });
    } catch (error) {
      console.error("Check-in error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/:id/booking-history", authenticateToken, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);

      // Ensure user can only access their own history
      if (userId !== req.user.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const history = await storage.getUserBookingHistory(userId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Loyalty System Routes
  app.get("/api/loyalty/tiers", async (req, res) => {
    try {
      const tiers = await storage.getLoyaltyTiers();
      res.json(tiers);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/loyalty/user/:id/status", authenticateToken, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);

      // Ensure user can only access their own loyalty status
      if (userId !== req.user.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const eligibility = await storage.calculateTierEligibility(userId);
      const tier = await storage.getLoyaltyTier(user.loyaltyTier);
      const transactions = await storage.getUserPointsTransactions(userId);
      const tierHistory = await storage.getUserTierHistory(userId);

      res.json({
        currentTier: tier,
        loyaltyPoints: user.loyaltyPoints,
        totalMilesFlown: user.totalMilesFlown,
        totalSpent: user.totalSpent,
        lifetimeMiles: user.lifetimeMiles,
        memberSince: user.memberSince,
        tierAnniversary: user.tierAnniversary,
        eligibility,
        recentTransactions: transactions.slice(0, 10),
        tierHistory: tierHistory.slice(0, 5)
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/loyalty/bundles/:tierName", async (req, res) => {
    try {
      const { tierName } = req.params;
      const { phase } = req.query;

      const bundles = await storage.getLoyaltyBundles(tierName, phase as string);
      res.json(bundles);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/loyalty/discount/:tierName", async (req, res) => {
    try {
      const { tierName } = req.params;
      const { phase = 'booking' } = req.query;

      const discountInfo = await storage.getBundleDiscountForTier(tierName, phase as string);
      res.json(discountInfo);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/loyalty/apply-bundles", authenticateToken, async (req: any, res) => {
    try {
      const { orderNumber, selectedBundles, phase = 'booking' } = req.body;

      if (!orderNumber || !selectedBundles || !Array.isArray(selectedBundles)) {
        return res.status(400).json({ message: "Order number and selected bundles are required" });
      }

      const order = await storage.getOrderByNumber(orderNumber);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Ensure user can only modify their own orders
      if (order.userId !== req.user.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get user's tier bundles
      const availableBundles = await storage.getLoyaltyBundles(user.loyaltyTier, phase);

      // Calculate discounts and complimentary services
      let totalDiscount = 0;
      let complimentaryServices: any[] = [];
      let discountedServices: any[] = [];

      for (const bundleId of selectedBundles) {
        const bundle = availableBundles.find(b => b.id === bundleId);
        if (bundle) {
          if (bundle.isComplimentary) {
            complimentaryServices.push({
              bundleId: bundle.id,
              bundleName: bundle.bundleName,
              serviceIds: bundle.serviceIds,
              description: bundle.description
            });
          } else {
            discountedServices.push({
              bundleId: bundle.id,
              bundleName: bundle.bundleName,
              serviceIds: bundle.serviceIds,
              discountPercentage: bundle.discountPercentage,
              description: bundle.description
            });
            totalDiscount += parseFloat(bundle.discountPercentage);
          }
        }
      }

      // Update order with loyalty bundle information
      const currentLoyaltyBundles = order.loyaltyBundles || [];
      const currentComplimentary = order.complimentaryServices || [];
      const currentTierDiscounts = order.tierDiscounts || [];

      await storage.updateOrder(order.id, {
        loyaltyBundles: [...currentLoyaltyBundles, ...selectedBundles],
        complimentaryServices: [...currentComplimentary, ...complimentaryServices],
        tierDiscounts: [...currentTierDiscounts, ...discountedServices]
      });

      res.json({
        success: true,
        appliedBundles: selectedBundles,
        complimentaryServices,
        discountedServices,
        totalDiscount,
        message: `Applied ${selectedBundles.length} loyalty bundles for ${user.loyaltyTier} tier`
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Cart Management Routes
  app.get("/api/cart", authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.userId;
      const cartItems = await storage.getUserCartItems(userId);
      res.json(cartItems);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/cart/add", authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.userId;
      const cartItemData = insertCartItemSchema.parse({
        ...req.body,
        userId
      });

      const cartItem = await storage.addCartItem(cartItemData);
      res.json(cartItem);
    } catch (error) {
      res.status(400).json({ message: "Invalid cart item data" });
    }
  });

  app.put("/api/cart/:id", authenticateToken, async (req: any, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const updates = req.body;

      const updatedItem = await storage.updateCartItem(itemId, updates);
      if (!updatedItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      res.json(updatedItem);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/cart/clear", authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.userId;
      await storage.clearUserCart(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Clear cart error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/cart/:id", authenticateToken, async (req: any, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const success = await storage.removeCartItem(itemId);

      if (!success) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Remove cart item error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Service dynamic pricing update route
  app.post("/api/services/:id/update-pricing", async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const updatedPricing = await dynamicPricingService.updateServicePricing(serviceId);

      if (!updatedPricing) {
        return res.status(404).json({ message: "Service pricing not found" });
      }

      res.json(updatedPricing);
    } catch (error) {
      console.error("Service pricing update error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Dynamic Pricing Routes
  app.get("/api/pricing/flight/:flightId", async (req, res) => {
    try {
      const flightId = parseInt(req.params.flightId);
      const pricing = await dynamicPricingService.getCurrentPrice('flight', flightId);

      if (!pricing) {
        return res.status(404).json({ message: "Flight pricing not found" });
      }

      res.json(pricing);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/pricing/flights", async (req, res) => {
    try {
      const allPrices = await dynamicPricingService.getAllFlightPrices();
      res.json(allPrices);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Fare Hold Routes
  app.post("/api/fare-hold", authenticateToken, async (req: any, res) => {
    try {
      const { flightId, holdDuration, holdPrice, lockedFarePrice, paymentMethod } = req.body;
      const userId = req.user.userId;

      // Check if user already has an active hold for this flight
      const existingHold = await dynamicPricingService.getUserFareHold(userId, flightId);
      if (existingHold.length > 0) {
        return res.status(400).json({ 
          message: "You already have an active fare hold for this flight" 
        });
      }

      // Use provided holdPrice or calculate default
      const finalHoldPrice = holdPrice || (holdDuration === 24 ? 49.99 : holdDuration === 48 ? 79.99 : 99.99);

      // Validate payment method
      const validPaymentMethods = ['credit_card', 'debit_card', 'bank_transfer', 'wallet'];
      if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
        return res.status(400).json({ 
          message: "Invalid payment method", 
          validMethods: validPaymentMethods 
        });
      }

      // Process payment based on method
      if (paymentMethod === 'wallet') {
        // Check wallet balance and deduct if sufficient
        const user = await storage.getUser(userId);
        if (!user || parseFloat(user.walletBalance) < finalHoldPrice) {
          return res.status(400).json({ 
            message: "Insufficient wallet balance",
            required: finalHoldPrice.toFixed(2),
            available: user?.walletBalance || "0.00"
          });
        }

        // Deduct from wallet
        await storage.updateWalletBalance(userId, -finalHoldPrice);
        await storage.addWalletTransaction(
          userId, 
          finalHoldPrice, 
          'debit', 
          `Fare hold for ${holdDuration} hours - Flight ${flightId}`
        );
      } else {
        // For other payment methods (credit_card, debit_card, bank_transfer), simulate payment processing
        console.log(`Fare hold payment processed: User ${userId}, Amount: ${finalHoldPrice.toFixed(2)}, Method: ${paymentMethod}, Flight: ${flightId}`);

        // In a real system, you would integrate with payment gateways here
        // For now, we'll just log the transaction and proceed
        // You could add specific validation for each payment method here
      }

      const fareHold = await dynamicPricingService.createFareHold(
        userId, 
        flightId, 
        holdDuration, 
        finalHoldPrice,
        lockedFarePrice,
        paymentMethod
      );

      res.json({
        ...fareHold,
        paymentMethod: paymentMethod,
        paymentStatus: 'completed'
      });
    } catch (error) {
      console.error("Fare hold creation error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/fare-hold/:flightId", authenticateToken, async (req: any, res) => {
    try {
      const flightId = parseInt(req.params.flightId);
      const userId = req.user.userId;

      const fareHold = await dynamicPricingService.getUserFareHold(userId, flightId);
      res.json(fareHold.length > 0 ? fareHold[0] : null);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}