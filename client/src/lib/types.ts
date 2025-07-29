export interface CartItem {
  id: string;
  databaseId?: number; // ID from the database cart_items table
  type: 'flight' | 'seat' | 'service' | 'seat-addon';
  name: string;
  description?: string;
  price: number;
  quantity: number;
  flightId?: number;
  serviceId?: number;
  seatId?: number;
  passengerId?: number;
  details?: any;
  loyaltyBundle?: {
    bundleId: number;
    bundleName: string;
    tierName: string;
    isComplimentary: boolean;
    discountPercentage?: string;
    discountInfo?: {
      type: 'complimentary' | 'discount';
      bundleName: string;
      originalPrice: number;
      discount: number;
      discountPercentage?: number;
      description: string;
    };
  };
}

export interface FlightSearchParams {
  from: string;
  to: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  class: string;
  tripType: string;
}

export interface PassengerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  specialAssistance?: string[];
}

export interface BookingState {
  selectedFlight?: any;
  selectedSeat?: any;
  selectedServices: any[];
  passengerInfo?: PassengerInfo;
  searchParams?: FlightSearchParams;
}

export interface ServiceTag {
  type: 'recommended' | 'filling_fast' | 'only_few_left' | 'premium' | 'new';
  label: string;
}
