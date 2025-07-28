import { useCartStore } from '@/store/cart-store';
import { CartItem } from '@/lib/types';

export function useCart() {
  const {
    items,
    isOpen,
    isLoading,
    isCheckoutFlow,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    syncCart,
    loadCartFromStorage,
    setCurrentUser,
    toggleCart,
    setCartOpen,
    getSubtotal,
    getTaxes,
    getTotal,
    getItemCount,
    setCheckoutFlow,
    setOnFlightRemoved,
  } = useCartStore();

  const addFlight = (flight: any, seats?: any[], passengerCount: number = 1) => {
    // Priority: fare hold locked price > dynamic pricing > flight price
    let currentPrice = flight.price;
    let isLocked = false;
    
    if (flight.fareHold?.lockedFarePrice) {
      // Use fare hold locked price if available and not expired
      const expiresAt = new Date(flight.fareHold.expiresAt);
      if (expiresAt > new Date()) {
        currentPrice = flight.fareHold.lockedFarePrice;
        isLocked = true;
      }
    } else if (flight.dynamicPricing?.currentPrice) {
      // Use dynamic pricing if no fare hold
      currentPrice = flight.dynamicPricing.currentPrice;
      isLocked = flight.dynamicPricing.isLocked || false;
    }
    
    const flightItem: CartItem = {
      id: `flight-${flight.id}`,
      type: 'flight',
      name: `${flight.departureAirport} → ${flight.arrivalAirport}`,
      description: `${flight.airline} ${flight.flightNumber} (${passengerCount} ${passengerCount === 1 ? 'passenger' : 'passengers'})${flight.fareHold ? ' - Fare Protected' : ''}`,
      price: parseFloat(currentPrice) * passengerCount,
      quantity: 1,
      flightId: flight.id,
      details: {
        departureTime: flight.departureTime,
        arrivalTime: flight.arrivalTime,
        duration: flight.duration,
        aircraft: flight.aircraft,
        passengerCount: passengerCount,
        originalPrice: flight.originalPrice || flight.price,
        dynamicPrice: currentPrice,
        isLocked: isLocked,
        fareHold: flight.fareHold || null,
      },
    };

    addItem(flightItem);

    if (seats && seats.length > 0) {
      seats.forEach((seat, index) => {
        if (seat) {
          const seatItem: CartItem = {
            id: `seat-${seat.id}-passenger-${index}`,
            type: 'seat',
            name: `Seat ${seat.seatNumber} (Passenger ${index + 1})`,
            description: `${seat.seatType} - ${seat.seatClass}`,
            price: parseFloat(seat.price || 0),
            quantity: 1,
            seatId: seat.id,
            flightId: flight.id,
          };
          addItem(seatItem);
        }
      });
    }
  };

  const addService = (service: any, passengerId?: number) => {
    const serviceItem: CartItem = {
      id: passengerId !== undefined ? `service-${service.id}-passenger-${passengerId}` : `service-${service.id}`,
      type: 'service',
      name: service.name,
      description: passengerId !== undefined ? `${service.description} (Passenger ${passengerId + 1})` : service.description,
      price: parseFloat(service.price),
      quantity: 1,
      serviceId: service.id,
      passengerId: passengerId,
      details: {
        category: service.category,
        phase: service.phase,
        tag: service.tag,
        passengerSpecific: passengerId !== undefined,
      },
    };

    addItem(serviceItem);
  };

  return {
    items,
    isOpen,
    isLoading,
    isCheckoutFlow,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    syncCart,
    loadCartFromStorage,
    setCurrentUser,
    toggleCart,
    setCartOpen,
    addFlight,
    addService,
    setCheckoutFlow,
    setOnFlightRemoved,
    subtotal: getSubtotal(),
    taxes: getTaxes(),
    total: getTotal(),
    itemCount: getItemCount(),
  };
}
