import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, flightSearchSchema, insertOrderSchema } from "@shared/schema";
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
      res.status(500).json({ error: error.message });
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

      // Update order status to confirmed
      const updatedOrder = await storage.updateOrder(order.id, {
        status: "confirmed",
        paymentStatus: "paid",
        canCheckIn: true,
        paymentMethod: paymentMethod,
        paymentDetails: paymentDetails,
      });

      res.json(updatedOrder);
    } catch (error: any) {
      console.error("Error completing payment:", error);
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
      const searchCriteria = flightSearchSchema.parse(req.body);
      const flights = await storage.searchFlights(searchCriteria);
      res.json(flights);
    } catch (error) {
      res.status(400).json({ message: "Invalid search criteria", error });
    }
  });

  app.get("/api/flights/:id", async (req, res) => {
    try {
      const flightId = parseInt(req.params.id);
      const flight = await storage.getFlight(flightId);
      
      if (!flight) {
        return res.status(404).json({ message: "Flight not found" });
      }
      
      res.json(flight);
    } catch (error) {
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

  // Service routes
  app.get("/api/services", async (req, res) => {
    try {
      const phase = req.query.phase as string;
      const services = await storage.getServices(phase);
      res.json(services);
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
          quantity: quantity
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
      const currentSubtotal = parseFloat(order.subtotal);
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

  const httpServer = createServer(app);
  return httpServer;
}
