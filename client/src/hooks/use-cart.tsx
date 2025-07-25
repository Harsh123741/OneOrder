import { useCartStore } from '@/store/cart-store';
import { CartItem } from '@/lib/types';

export function useCart() {
  const {
    items,
    isOpen,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    toggleCart,
    setCartOpen,
    getSubtotal,
    getTaxes,
    getTotal,
    getItemCount,
  } = useCartStore();

  const addFlight = (flight: any, seats?: any[], passengerCount: number = 1) => {
    const flightItem: CartItem = {
      id: `flight-${flight.id}`,
      type: 'flight',
      name: `${flight.departureAirport} → ${flight.arrivalAirport}`,
      description: `${flight.airline} ${flight.flightNumber} (${passengerCount} ${passengerCount === 1 ? 'passenger' : 'passengers'})`,
      price: parseFloat(flight.price) * passengerCount,
      quantity: 1,
      flightId: flight.id,
      details: {
        departureTime: flight.departureTime,
        arrivalTime: flight.arrivalTime,
        duration: flight.duration,
        aircraft: flight.aircraft,
        passengerCount: passengerCount,
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
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    toggleCart,
    setCartOpen,
    addFlight,
    addService,
    subtotal: getSubtotal(),
    taxes: getTaxes(),
    total: getTotal(),
    itemCount: getItemCount(),
  };
}
