import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import SeatMap from "@/components/flight/seat-map";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Users } from "lucide-react";

export default function SeatSelection() {
  const [, setLocation] = useLocation();
  const [selectedFlight, setSelectedFlight] = useState<any>(null);
  const [selectedSeats, setSelectedSeats] = useState<any[]>([]);
  const [currentPassenger, setCurrentPassenger] = useState(0);
  const [passengerCount, setPassengerCount] = useState(1);
  const { addItem } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    const storedFlight = sessionStorage.getItem("selectedFlight");
    const storedSeats = sessionStorage.getItem("selectedSeats");
    const storedSearch = sessionStorage.getItem("flightSearch");
    
    if (storedFlight) {
      setSelectedFlight(JSON.parse(storedFlight));
    } else {
      setLocation("/");
    }
    
    if (storedSeats) {
      setSelectedSeats(JSON.parse(storedSeats));
    }
    
    if (storedSearch) {
      const searchParams = JSON.parse(storedSearch);
      setPassengerCount(searchParams.passengers || 1);
      setSelectedSeats(new Array(searchParams.passengers || 1).fill(null));
    }
  }, [setLocation]);

  const handleSeatSelect = (seat: any, passengerIndex?: number) => {
    const updatedSeats = [...selectedSeats];
    updatedSeats[passengerIndex || currentPassenger] = seat;
    setSelectedSeats(updatedSeats);
    sessionStorage.setItem("selectedSeats", JSON.stringify(updatedSeats));
    
    // Add extra legroom as a service if it's an extra legroom seat
    if (seat.isExtraLegroom && parseFloat(seat.price) > 0) {
      addItem({
        id: `seat-addon-${seat.id}-passenger-${passengerIndex || currentPassenger}`,
        name: `Extra Legroom - Seat ${seat.seatNumber} (Passenger ${(passengerIndex || currentPassenger) + 1})`,
        description: "Additional legroom for enhanced comfort",
        price: parseFloat(seat.price),
        quantity: 1,
        type: "seat-addon",
        seatId: seat.id
      });
      
      toast({
        title: "Seat Selected",
        description: `Seat ${seat.seatNumber} selected for Passenger ${(passengerIndex || currentPassenger) + 1}. Extra legroom fee added to cart.`,
      });
    } else {
      toast({
        title: "Seat Selected",
        description: `Seat ${seat.seatNumber} selected for Passenger ${(passengerIndex || currentPassenger) + 1}.`,
      });
    }
  };

  const handleContinue = () => {
    if (selectedSeats.length > 0) {
      sessionStorage.setItem("selectedSeats", JSON.stringify(selectedSeats));
    }
    setLocation("/services");
  };

  const handleBack = () => {
    setLocation("/booking");
  };

  if (!selectedFlight) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-airline-blue mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-airline-blue">Step 1 of 4</span>
            <span className="text-sm text-gray-500">Seat Selection</span>
          </div>
          <Progress value={25} className="h-2" />
        </div>

        {/* Flight Info Header */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-airline-blue" />
              <span>Select Seats for {passengerCount} {passengerCount === 1 ? 'Passenger' : 'Passengers'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-6">
              <div>
                <p className="font-semibold text-gray-900">
                  {selectedFlight.departureAirport} → {selectedFlight.arrivalAirport}
                </p>
                <p className="text-sm text-gray-600">
                  {selectedFlight.airline} Flight {selectedFlight.flightNumber}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {new Date(selectedFlight.departureTime).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
                <p className="text-sm text-gray-600">
                  {new Date(selectedFlight.departureTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  })} - {new Date(selectedFlight.arrivalTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  })}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">{selectedFlight.aircraft}</p>
                <p className="text-sm text-gray-600 capitalize">
                  {selectedFlight.class.replace('_', ' ')} Class
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Seat Map */}
          <div className="lg:col-span-2">
            <SeatMap
              flightId={selectedFlight.id}
              onSeatSelect={handleSeatSelect}
              selectedSeats={selectedSeats.filter(seat => seat !== null)}
              passengerCount={passengerCount}
              currentPassenger={currentPassenger}
            />
          </div>

          {/* Seat Selection Summary */}
          <div className="space-y-6">
            {/* Passenger Navigation */}
            {passengerCount > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Passenger Selection</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: passengerCount }, (_, index) => (
                      <Button
                        key={index}
                        variant={currentPassenger === index ? "default" : "outline"}
                        onClick={() => setCurrentPassenger(index)}
                        className="relative"
                      >
                        Passenger {index + 1}
                        {selectedSeats[index] && (
                          <Badge className="ml-2 bg-green-100 text-green-800">
                            {selectedSeats[index].seatNumber}
                          </Badge>
                        )}
                      </Button>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 mt-3 text-center">
                    Currently selecting for: <strong>Passenger {currentPassenger + 1}</strong>
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Selected Seat Info */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {passengerCount > 1 ? `Passenger ${currentPassenger + 1} Seat` : 'Selected Seat'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedSeats[currentPassenger] ? (
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-airline-blue rounded-lg flex items-center justify-center mx-auto mb-3">
                        <span className="text-white font-bold text-lg">
                          {selectedSeats[currentPassenger].seatNumber}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900">
                        Seat {selectedSeats[currentPassenger].seatNumber}
                      </h4>
                      <p className="text-sm text-gray-600 capitalize">
                        {selectedSeats[currentPassenger].seatType.replace('_', ' ')} • {selectedSeats[currentPassenger].seatClass}
                      </p>
                      {selectedSeats[currentPassenger].isExtraLegroom && (
                        <p className="text-sm text-green-600 font-medium">Extra Legroom</p>
                      )}
                    </div>
                    <div className="text-center pt-3 border-t border-gray-200">
                      <p className="text-lg font-bold text-airline-blue">
                        {selectedSeats[currentPassenger].price && parseFloat(selectedSeats[currentPassenger].price) > 0 
                          ? `+$${selectedSeats[currentPassenger].price}` 
                          : 'Included'
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <span className="text-4xl">💺</span>
                    </div>
                    <p>Click on a seat to select it for Passenger {currentPassenger + 1}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Seat Upgrade Options */}
            <Card>
              <CardHeader>
                <CardTitle>Upgrade Your Experience</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Extra Legroom</h4>
                      <p className="text-sm text-gray-600">More space to stretch out</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-airline-blue">+$45</p>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Available
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4 opacity-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Premium Economy</h4>
                      <p className="text-sm text-gray-600">Priority boarding + comfort</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-400">+$89</p>
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                        Sold Out
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skip Seat Selection */}
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-3">
                    Don't want to choose now? A seat will be assigned automatically at check-in.
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleContinue}
                    className="w-full text-gray-700 border-gray-300"
                  >
                    Skip Seat Selection
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Flight Details</span>
          </Button>
          <Button
            onClick={handleContinue}
            className="airline-button-primary flex items-center space-x-2"
            disabled={selectedSeats.filter(seat => seat !== null).length === 0}
          >
            <span>Continue to Services</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
