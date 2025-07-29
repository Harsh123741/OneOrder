# SkyLink Airlines - Full Stack Application

## Overview

SkyLink Airlines is a comprehensive airline industry application built with a modern full-stack architecture. The application provides a complete booking and management system for passengers, service providers, check-in agents, and administrators, mimicking an e-commerce experience for airline services.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom airline-themed design tokens
- **State Management**: Zustand for client-side state (auth, cart)
- **Data Fetching**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript for type safety
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Authentication**: JWT-based authentication with bcrypt for password hashing
- **Session Management**: Express sessions with PostgreSQL session store

### Database Architecture
- **Primary Database**: PostgreSQL (configured for Neon serverless)
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Data Models**: Users, flights, seats, services, orders, and booking history

## Key Components

### User Roles and Functionality
1. **Passengers**: Flight search, booking, seat selection, ancillary services, order management, check-in
2. **Service Providers**: Inventory management for ancillary services
3. **Check-in Agents**: Passenger management, service booking assistance
4. **Administrators**: Financial monitoring, order management, system administration

### Core Features
- **Flight Search & Booking**: Multi-criteria search with direct and connecting flights
- **Seat Selection**: Interactive seat map with different class and availability indicators
- **Ancillary Services**: Phase-based service offerings (booking, pre-boarding, in-flight, arrival)
- **Shopping Cart**: E-commerce-style cart experience with real-time updates
- **Order Management**: Complete order lifecycle from booking to completion
- **Payment Processing**: Integrated checkout with wallet functionality
- **Web Check-in**: Time-based check-in availability

### Service Phases
- **Booking Phase**: Seat selection, priority boarding, baggage, insurance, meals, lounge access
- **Pre-Boarding Phase**: Early check-in, excess baggage, special assistance, Wi-Fi
- **In-Flight Phase**: Cabin upgrades, meals, duty-free, entertainment, power outlets
- **Arrival Phase**: Meet-and-assist, priority baggage, transportation, immigration fast track

## Data Flow

1. **User Authentication**: JWT tokens stored in localStorage, automatic session restoration
2. **Flight Search**: Real-time search with filters and sorting capabilities
3. **Booking Process**: Multi-step workflow (flight → seat → services → checkout)
4. **Cart Management**: Persistent cart state with real-time price calculations
5. **Order Processing**: Complete order lifecycle with status tracking
6. **Service Management**: Dynamic inventory tracking with availability indicators

## External Dependencies

### Core Runtime Dependencies
- **Database**: @neondatabase/serverless for PostgreSQL connectivity
- **Authentication**: bcrypt for password hashing, jsonwebtoken for JWT
- **Validation**: Zod for schema validation across client and server
- **UI Components**: Comprehensive Radix UI component library
- **Date Handling**: date-fns for date manipulation and formatting

### Development Dependencies
- **Build Tools**: Vite with React plugin, esbuild for server bundling
- **Type Checking**: TypeScript with strict configuration
- **Database Tooling**: Drizzle Kit for schema management and migrations

### Styling and Theming
- **CSS Framework**: Tailwind CSS with PostCSS processing
- **Component Styling**: Class Variance Authority for component variants
- **Design System**: Custom airline-themed color palette and design tokens

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds optimized React application to `dist/public`
- **Backend**: esbuild bundles Express server to `dist/index.js`
- **Database**: Drizzle Kit manages schema migrations

### Environment Configuration
- **Development**: Hot reload with Vite dev server and tsx for server
- **Production**: Optimized builds with proper asset handling
- **Database**: Environment-based connection strings with Neon PostgreSQL

### File Structure
- **Shared Code**: Common schemas and types in `/shared` directory
- **Client Code**: React application in `/client` directory
- **Server Code**: Express API in `/server` directory
- **Database**: Migrations in `/migrations` directory

The architecture supports a scalable, maintainable airline management system with clear separation of concerns between client, server, and database layers. The use of TypeScript throughout ensures type safety, while modern tooling provides excellent developer experience and production performance.

## Recent Changes

- Fixed critical application startup issues: CSS configuration, port mismatches, and React import errors
- Successfully deployed application running on port 5000 with proper styling and functionality
- Fixed TypeScript type errors across components and added missing type packages
- **Major Database Migration (January 2025)**: Upgraded from in-memory storage to PostgreSQL database
  - Replaced MemStorage with DatabaseStorage class using Drizzle ORM
  - All CRUD operations now use database queries instead of in-memory arrays
  - Successfully migrated schema with `npm run db:push`
  - Application now has persistent data storage for production readiness
- **Critical Check-in and Pricing Fixes (January 2025)**:
  - Fixed flight pricing integration - flight costs now properly included in order totals
  - Resolved check-in "Flight Information Not Found" error by ensuring flight IDs are stored in orders
  - Enhanced seat selection during check-in with proper confirmation flow
  - Added conditional "Keep Current Seat" button that only appears when user has existing seat assignment
  - Fixed BoardingPass component error handling for missing flight data
  - Complete end-to-end check-in process now working: booking → seat selection → confirmation → boarding pass
- **Database Cleanup and Optimization (January 2025)**:
  - Removed 390+ duplicate service entries, reducing services from 371 to 23 unique services
  - Eliminated 69 duplicate flight entries, keeping only 3 unique flights
  - Safely migrated all booking history references to prevent data loss
  - Services now properly organized by phase: booking (7), pre-boarding (5), in-flight (5), arrival (6)
- **After Booking Services Implementation (January 2025)**:
  - Added comprehensive "Add Services" functionality to existing confirmed orders
  - Implemented API endpoint `/api/orders/:orderNumber/add-services` for post-booking service additions
  - Enhanced order details page with interactive service selection modal
  - Automatic order total recalculation when services are added after booking
  - Services are properly validated, priced, and added to booking history
- **Payment Processing for Post-Booking Services (January 2025)**:
  - Implemented wallet-based payment system for additional services
  - Added service removal functionality with automatic refunds to wallet
  - Real-time wallet balance checking and insufficient funds protection
  - Automatic tax calculation (12%) for all service additions and removals
  - Complete audit trail with wallet transaction logging
  - Enhanced user interface with payment confirmations and balance displays
- **Complete Multi-Passenger Booking System Overhaul (January 2025)**:
  - **CRITICAL FIX**: Completely removed seat selection from booking flow - now available only at check-in
  - **CRITICAL FIX**: Enhanced checkout pricing to show complete flight fare breakdown per passenger
  - **CRITICAL FIX**: Fixed web check-in for multiple passengers - any passenger's last name now works for lookup
  - Updated booking flow from 4 steps to 3 steps: Flight Selection → Services → Payment
  - Enhanced cart system to properly calculate multi-passenger flight pricing
  - Improved booking summary display with per-passenger cost breakdown
  - Server API updated to support multiple passenger name matching during check-in
- **Enhanced Multi-Passenger Service Selection & Check-in (January 2025)**:
  - **COMPLETED**: Individual service selection per passenger with dedicated passenger tabs interface
  - **FIXED**: Order creation API now properly stores passenger arrays for multi-passenger bookings
  - **ENHANCED**: Check-in API supports any passenger's last name from multi-passenger bookings
  - **IMPLEMENTED**: Paid seat upgrades during check-in with wallet-based payment processing
  - Premium seat pricing: Window+legroom ($25), Aisle+legroom ($20), Window ($15), Aisle ($10)
  - Order details page displays comprehensive information for all passengers individually
  - Multi-passenger service selection with individual passenger tabs and phase-based service organization
  - PostgreSQL array handling fixed for proper multi-passenger data storage and retrieval
- **Individual Passenger Service Display & Multi-Passenger Check-in Overhaul (January 2025)**:
  - **CRITICAL FIX**: Order details now show only relevant services per individual passenger instead of all selected services
  - **MAJOR ENHANCEMENT**: Complete multi-passenger check-in system with individual seat selection per passenger
  - **IMPLEMENTED**: Passenger tab interface for individual seat selection during check-in process
  - **FIXED**: Check-in timestamp database error resolved (Date object instead of string)
  - **ENHANCED**: Payment modal for premium seat upgrades with per-passenger processing
  - **COMPLETED**: Individual passenger check-in flow with seat selection, payment processing, and confirmation
  - Multi-passenger booking system now supports complete individual passenger management from booking to check-in
- **Comprehensive UI Enhancement & Database Optimization (January 2025)**:
  - **DATABASE CLEANUP**: Removed 467 total duplicate services and 75+ duplicate flights with unique constraints added
  - **PASSENGER-SPECIFIC SERVICES**: Implemented complete passenger-specific service selection and cart management
  - **ENHANCED FLIGHT LIST UI**: Redesigned flight search results with modern gradient background, enhanced filters, and responsive layout
  - **CONFIRMATION PAGE OVERHAUL**: Services now display per individual passenger with clear visual separation and passenger-specific grouping
  - **CART SYSTEM UPGRADE**: Added passenger ID tracking to cart items for proper per-passenger service assignment
  - **VISUAL IMPROVEMENTS**: Enhanced card designs, hover effects, and color-coded service phases for better user experience
- **Replit Migration & Seat Map Enhancement (January 2025)**:
  - **MIGRATION COMPLETED**: Successfully migrated project from Replit Agent to standard Replit environment
  - **DATABASE FIXED**: Created PostgreSQL database and resolved authentication issues in order success page
  - **SEAT MAP IMPLEMENTATION**: Added realistic airline seat maps for all flights with proper 6-seat-per-row layout
  - **VISUAL OVERHAUL**: Redesigned seat map with aircraft-like appearance, cockpit visualization, and class separation
  - **CHECK-IN FIXED**: Resolved seat availability issues and infinite render loops in SeatMap component
  - Generated 120 seats each for flights 2 and 3 with proper pricing and class distribution
  - Enhanced seat selection UI with hover effects, visual feedback, and realistic airline cabin design
- **Multi-Passenger Boarding Pass & Seat Conflict Resolution (January 2025)**:
  - **MULTIPLE BOARDING PASSES**: Implemented individual boarding passes for each passenger in multi-passenger bookings
  - **SEAT CONFLICT PREVENTION**: Enhanced seat selection to prevent passengers from selecting seats already chosen by other passengers
  - **DYNAMIC SEAT AVAILABILITY**: Seats selected by one passenger now appear unavailable (red) to other passengers during selection
  - **ENHANCED BOARDING PASS DISPLAY**: Each passenger gets personalized boarding pass with their own seat number and name
  - **IMPROVED USER EXPERIENCE**: Clear visual feedback showing which passenger is currently selecting seats with passenger tabs
  - Fixed React Fragment warning in SeatMap component by removing invalid data-replit-metadata prop
- **Passenger-Specific Service Display & Enhanced Service Addition Modal (January 2025)**:
  - **ORDER DETAILS REORGANIZATION**: Services now display per individual passenger in Additional Services section, matching order summary format
  - **PASSENGER-SPECIFIC SERVICE SELECTION**: Enhanced service addition modal with passenger tabs for targeted service assignment
  - **MULTI-PASSENGER SERVICE MODAL**: Added passenger selection tabs in service addition modal showing which passenger services are being selected for
  - **PHASE-BASED SERVICE ORGANIZATION**: Services grouped by phases (booking, pre-boarding, in-flight, arrival) in addition modal
  - **ENHANCED SERVICE PAYMENT**: Updated payment flow to handle passenger-specific service selections with proper cost calculations
  - **IMPROVED SERVICE TRACKING**: Services tracked per passenger with clear visual separation and passenger-specific grouping throughout the flow
- **Comprehensive Passenger Database System Implementation (January 2025)**:
  - **DATABASE SCHEMA**: Added complete passengers table with all required fields (name, email, phone, passport, dates, etc.)
  - **API ENDPOINTS**: Implemented full CRUD operations for passenger management with proper authentication
  - **CHECKOUT ENHANCEMENT**: Completely redesigned checkout flow with passenger selection interface
  - **SAVED PASSENGER SELECTION**: Users can select from previously saved passengers or add new ones during booking
  - **AUTOMATIC SAVING**: New passengers are automatically saved to database for future bookings
  - **MODAL INTERFACE**: Interactive modal system for passenger selection, editing, and creation
  - **FORM VALIDATION**: Fixed checkout form validation to work with new passenger selection system
  - **ACCESSIBILITY**: Added proper dialog descriptions to resolve accessibility warnings
- **Complete Loyalty Tier & Gamification System Implementation (January 2025)**:
  - **DATABASE EXPANSION**: Added loyalty system tables (loyaltyTiers, loyaltyBundles, pointsTransactions, tierHistory)
  - **USER SCHEMA ENHANCEMENT**: Extended users table with loyalty fields (tier, points, miles, spend tracking)
  - **COMPREHENSIVE TIER SYSTEM**: 5-tier structure (Bronze, Silver, Gold, Platinum, Diamond Medallion) with progressive benefits
  - **DYNAMIC SERVICE BUNDLING**: Tier-based complimentary services and discounted offerings during booking
  - **POINTS & MILES TRACKING**: Automatic accumulation with tier multipliers and spend-based progression
  - **TIER PROGRESSION ENGINE**: Automatic upgrades based on points, miles, or spending thresholds
  - **LOYALTY BUNDLE API**: Complete API endpoints for tier management, bundle retrieval, and discount application
  - **CHECKOUT INTEGRATION**: Real-time loyalty tier display with selectable benefit bundles
  - **GAMIFICATION FEATURES**: Progress tracking, tier history, bonus points, and anniversary benefits
  - **SEED DATA**: Pre-populated with realistic airline loyalty program structure and benefit packages
- **CRITICAL FARE HOLD USER-SPECIFIC FIX (January 2025)**:
  - **FIXED GLOBAL PRICE LOCKING BUG**: Resolved critical issue where fare hold price locking affected all users globally
  - **USER-SPECIFIC IMPLEMENTATION**: Fare holds now only show locked prices to the specific user who purchased the hold
  - **FRONTEND OPTIMIZATION**: Modified FareHoldButton to use flight search response data instead of separate API calls
  - **AUTHENTICATION INTEGRATION**: Enhanced flight search API to check user-specific fare holds with proper JWT token validation
  - **RESPONSIVE DESIGN IMPROVEMENTS**: Updated flights component layout for better mobile/tablet/desktop responsiveness
  - **VERIFIED FUNCTIONALITY**: Confirmed new users see dynamic pricing while fare hold users see locked prices only for themselves
- **CART-SPECIFIC PRICE NOTIFICATIONS & DYNAMIC PRICING DISPLAY (January 2025)**:
  - **TARGETED NOTIFICATIONS**: Price change notifications now only appear for services added to cart, not all services
  - **ENHANCED CART DISPLAY**: Cart sidebar shows complete dynamic pricing information with tags, price changes, and trending indicators
  - **REMOVED GENERAL NOTIFICATIONS**: Services page no longer shows price notifications - only cart-specific alerts appear
  - **FIXED DATABASE PRICING**: Resolved pricing_id database errors and infinite loop issues in dynamic pricing system
  - **CART PRICING TAGS**: Services in cart display demand-based tags ("booking fast", "limited stock", "most popular")
  - **REAL-TIME CART UPDATES**: Cart automatically refreshes to show current dynamic pricing with price trend indicators
- **CRITICAL PASSWORD & PRICING FIXES (January 2025)**:
  - **FIXED PASSWORD OVERRIDE BUG**: Resolved issue where new user registration was overriding existing users' passwords
  - **ENHANCED PASSWORD SECURITY**: Increased bcrypt salt rounds to 12 and ensured unique password hashes for each user
  - **CART PRICING SYNCHRONIZATION**: Fixed cart to display dynamic pricing current prices instead of static flight prices
  - **DYNAMIC PRICING INTEGRATION**: Cart now correctly uses `flight.dynamicPricing.currentPrice` for accurate pricing display
  - **VERIFIED AUTHENTICATION**: Confirmed each user now has unique password hashes and can authenticate independently
- **30-MINUTE PAYMENT WINDOW SYSTEM (January 2025)**:
  - **SERVER-SIDE VALIDATION**: Orders automatically expire after 30 minutes with status changed to "order_expired"
  - **REAL-TIME COUNTDOWN TIMER**: Payment pages show exact remaining time with live updates every second
  - **CLIENT-SIDE AUTO-REDIRECT**: Users redirected when payment window expires with clear messaging
  - **ORDER STATUS TRACKING**: New "order_expired" status with appropriate badge styling and filtering
  - **AUTOMATIC ORDER CHECKING**: My Orders page automatically checks and updates expired orders on load
  - **PAYMENT BUTTON STATES**: Complete Payment buttons disabled when window expires with clear status indication
  - **ORDER SUCCESS REDIRECT**: Successful payments now redirect to order confirmation page instead of order details
- **COMPREHENSIVE BOOKING FLOW NAVIGATION (January 2025)**:
  - **BACK NAVIGATION ARROWS**: Added back navigation buttons to all booking flow pages (flights, services, checkout)
  - **DATA PRESERVATION**: Selected flight and search parameters preserved when navigating backwards through booking flow
  - **SEAMLESS USER EXPERIENCE**: Users can navigate back to modify selections without losing previous choices
  - **CONSISTENT NAVIGATION**: Uniform back button styling and placement across all booking pages
  - **SESSION STORAGE INTEGRATION**: Navigation properly integrates with existing session storage for data persistence