import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Plane, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";

interface FlightCardProps {
  flight: any;
  onSelect?: (flight: any) => void;
}

export default function FlightCard({ flight, onSelect }: FlightCardProps) {
  const [, setLocation] = useLocation();
  const { addFlight } = useCart();

  const handleSelectFlight = () => {
    if (onSelect) {
      onSelect(flight);
    } else {
      // Store selected flight and navigate directly to services
      sessionStorage.setItem("selectedFlight", JSON.stringify(flight));
      
      // Get passenger count for proper pricing
      const storedSearch = sessionStorage.getItem("flightSearch");
      const passengerCount = storedSearch ? JSON.parse(storedSearch).passengers : 1;
      
      // Add flight to cart for proper pricing calculation
      addFlight(flight, [], passengerCount);
      
      setLocation("/services");
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getStopsBadge = (stops: number) => {
    if (stops === 0) {
      return <Badge className="bg-green-100 text-green-800">Direct</Badge>;
    } else if (stops === 1) {
      return <Badge className="bg-orange-100 text-orange-800">1 Stop</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">{stops} Stops</Badge>;
    }
  };

  return (
    <Card className="airline-card">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Flight Details */}
          <div className="flex-1 space-y-4">
            {/* Airline Info */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-airline-blue rounded-lg flex items-center justify-center">
                <Plane className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{flight.airline}</h3>
                <p className="text-sm text-gray-600">{flight.flightNumber}</p>
              </div>
            </div>

            {/* Route and Times */}
            <div className="flex items-center space-x-8">
              {/* Departure */}
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {formatTime(flight.departureTime)}
                </div>
                <div className="text-sm text-gray-600">{flight.departureAirport}</div>
                <div className="text-xs text-gray-500">{formatDate(flight.departureTime)}</div>
              </div>

              {/* Flight Path */}
              <div className="flex-1 flex flex-col items-center">
                <div className="text-sm text-gray-600 mb-1">{flight.duration}</div>
                <div className="w-full border-t-2 border-dashed border-gray-300 relative">
                  <Plane className="absolute -top-2 left-1/2 transform -translate-x-1/2 h-4 w-4 text-airline-blue bg-white" />
                </div>
                <div className="mt-1">
                  {getStopsBadge(flight.stops)}
                </div>
                {flight.stops > 0 && flight.stopAirports && (
                  <div className="text-xs text-gray-500 mt-1">
                    via {flight.stopAirports.join(', ')}
                  </div>
                )}
              </div>

              {/* Arrival */}
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {formatTime(flight.arrivalTime)}
                </div>
                <div className="text-sm text-gray-600">{flight.arrivalAirport}</div>
                <div className="text-xs text-gray-500">{formatDate(flight.arrivalTime)}</div>
              </div>
            </div>

            {/* Aircraft Info */}
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{flight.aircraft}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{flight.availableSeats} seats left</span>
              </span>
            </div>
          </div>

          {/* Price and Actions */}
          <div className="text-center lg:text-right space-y-3">
            <div>
              <div className="text-3xl font-bold text-airline-blue">
                ${parseFloat(flight.price).toFixed(0)}
              </div>
              <div className="text-sm text-gray-600">per person</div>
            </div>

            <div className="space-y-2">
              <Button 
                onClick={handleSelectFlight}
                className="w-full lg:w-auto airline-button-primary"
              >
                Select Flight
              </Button>
              
              <div className="text-xs text-gray-500">
                {flight.class.charAt(0).toUpperCase() + flight.class.slice(1)} Class
              </div>
            </div>
          </div>
        </div>

        {/* Expandable Details */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Button variant="ghost" size="sm" className="text-airline-blue hover:text-blue-700">
            View flight details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
