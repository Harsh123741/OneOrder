import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plane, Clock, Calendar, ArrowLeft } from "lucide-react";
import { useCart } from "@/hooks/use-cart";

export default function Booking() {
  const { flightId } = useParams();
  const [, setLocation] = useLocation();
  const [selectedFlight, setSelectedFlight] = useState<any>(null);
  const { addFlight } = useCart();

  // Try to get flight from session storage first
  useEffect(() => {
    const storedFlight = sessionStorage.getItem("selectedFlight");
    if (storedFlight) {
      setSelectedFlight(JSON.parse(storedFlight));
    }
  }, []);

  // Fetch flight details if not in session storage
  const { data: flight } = useQuery({
    queryKey: ["/api/flights", flightId],
    enabled: !!flightId && !selectedFlight,
  });

  // Use stored flight or fetched flight
  const currentFlight = selectedFlight || flight;

  const handleProceedToServices = () => {
    if (currentFlight) {
      // Get passenger count from search parameters
      const storedSearch = sessionStorage.getItem("flightSearch");
      const passengerCount = storedSearch ? JSON.parse(storedSearch).passengers : 1;
      
      // Add flight to cart for proper pricing calculation
      addFlight(currentFlight, [], passengerCount);
      
      sessionStorage.setItem("selectedFlight", JSON.stringify(currentFlight));
      setLocation("/services");
    }
  };

  const handleBackToFlights = () => {
    setLocation("/flights");
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
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStopsBadge = (stops: number) => {
    if (stops === 0) {
      return <Badge className="bg-green-100 text-green-800">Direct Flight</Badge>;
    } else if (stops === 1) {
      return <Badge className="bg-orange-100 text-orange-800">1 Stop</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">{stops} Stops</Badge>;
    }
  };

  if (!currentFlight) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-airline-blue mx-auto mb-4"></div>
          <p>Loading flight details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleBackToFlights}
            className="mb-4 text-airline-blue hover:bg-blue-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Flight Search
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Confirm Your Flight</h1>
          <p className="text-gray-600 mt-2">Review your flight details before proceeding</p>
        </div>

        {/* Flight Details Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Flight Details</span>
              {getStopsBadge(currentFlight.stops)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Airline Info */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-airline-blue rounded-lg flex items-center justify-center">
                <Plane className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{currentFlight.airline}</h3>
                <p className="text-gray-600">{currentFlight.flightNumber}</p>
              </div>
            </div>

            {/* Route and Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Departure */}
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {formatTime(currentFlight.departureTime)}
                </div>
                <div className="text-lg font-medium text-gray-700">
                  {currentFlight.departureAirport}
                </div>
                <div className="text-sm text-gray-600">
                  {formatDate(currentFlight.departureTime)}
                </div>
              </div>

              {/* Flight Path */}
              <div className="flex flex-col items-center justify-center">
                <div className="text-sm text-gray-600 mb-2">{currentFlight.duration}</div>
                <div className="w-full border-t-2 border-dashed border-gray-300 relative">
                  <Plane className="absolute -top-2 left-1/2 transform -translate-x-1/2 h-4 w-4 text-airline-blue bg-white" />
                </div>
                {currentFlight.stops > 0 && currentFlight.stopAirports && (
                  <div className="text-xs text-gray-500 mt-2">
                    via {currentFlight.stopAirports.join(', ')}
                  </div>
                )}
              </div>

              {/* Arrival */}
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {formatTime(currentFlight.arrivalTime)}
                </div>
                <div className="text-lg font-medium text-gray-700">
                  {currentFlight.arrivalAirport}
                </div>
                <div className="text-sm text-gray-600">
                  {formatDate(currentFlight.arrivalTime)}
                </div>
              </div>
            </div>

            {/* Aircraft and Class Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <Plane className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Aircraft: {currentFlight.aircraft}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Class: {currentFlight.class.charAt(0).toUpperCase() + currentFlight.class.slice(1)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">{currentFlight.availableSeats} seats available</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fare Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Fare Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Base Fare</span>
                <span className="font-medium">${parseFloat(currentFlight.price).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Taxes & Fees</span>
                <span className="font-medium">${(parseFloat(currentFlight.price) * 0.12).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-200">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-xl font-bold text-airline-blue">
                  ${(parseFloat(currentFlight.price) * 1.12).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Important Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-600">
              <p>• Arrive at the airport at least 2 hours before domestic flights and 3 hours before international flights</p>
              <p>• Check-in opens 24 hours before departure</p>
              <p>• Seat selection is available during check-in (24 hours before departure)</p>
              <p>• Baggage allowance: 1 carry-on bag (8kg) and 1 personal item included</p>
              <p>• Checked baggage and other services can be added during booking</p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            variant="outline"
            onClick={handleBackToFlights}
            className="flex-1 text-gray-700 border-gray-300 hover:bg-gray-50"
          >
            Back to Search
          </Button>
          <Button
            onClick={handleProceedToServices}
            className="flex-1 airline-button-primary"
          >
            Continue to Services & Checkout
          </Button>
        </div>
      </div>
    </div>
  );
}
