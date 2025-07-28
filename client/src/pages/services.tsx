import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ServiceCardEnhanced from "@/components/services/service-card-enhanced";
import { ArrowLeft, ArrowRight, CheckCircle, Plane, Clock, MapPin, Users } from "lucide-react";

export default function Services() {
  const [, setLocation] = useLocation();
  const [selectedFlight, setSelectedFlight] = useState<any>(null);
  const [selectedSeat, setSelectedSeat] = useState<any>(null);
  const [currentPhase, setCurrentPhase] = useState("booking");
  const [passengerCount, setPassengerCount] = useState(1);
  const [currentPassenger, setCurrentPassenger] = useState(0);
  const [passengerServices, setPassengerServices] = useState<{[key: number]: any[]}>({});

  useEffect(() => {
    const storedFlight = sessionStorage.getItem("selectedFlight");
    const storedSeat = sessionStorage.getItem("selectedSeat");
    const storedSearch = sessionStorage.getItem("flightSearch");
    
    if (storedFlight) {
      setSelectedFlight(JSON.parse(storedFlight));
    } else {
      setLocation("/");
    }
    
    if (storedSeat) {
      setSelectedSeat(JSON.parse(storedSeat));
    }
    
    if (storedSearch) {
      const searchData = JSON.parse(storedSearch);
      setPassengerCount(searchData.passengers || 1);
    }
  }, [setLocation]);

  const { data: services = [] } = useQuery({
    queryKey: ["/api/services", currentPhase],
    queryFn: async () => {
      const response = await fetch(`/api/services?phase=${currentPhase}`);
      return response.json();
    },
  });

  const handleBack = () => {
    setLocation("/booking");
  };

  const handleContinue = () => {
    setLocation("/checkout");
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case "booking":
        return <CheckCircle className="w-5 h-5" />;
      case "pre_boarding":
        return <Clock className="w-5 h-5" />;
      case "in_flight":
        return <Plane className="w-5 h-5" />;
      case "arrival":
        return <MapPin className="w-5 h-5" />;
      default:
        return <CheckCircle className="w-5 h-5" />;
    }
  };

  const getPhaseTitle = (phase: string) => {
    switch (phase) {
      case "booking":
        return "Booking Phase Services";
      case "pre_boarding":
        return "Pre-Boarding Services";
      case "in_flight":
        return "In-Flight Services";
      case "arrival":
        return "Arrival Services";
      default:
        return "Services";
    }
  };

  const getPhaseDescription = (phase: string) => {
    switch (phase) {
      case "booking":
        return "Enhance your booking with these premium services";
      case "pre_boarding":
        return "Services available before your flight";
      case "in_flight":
        return "Upgrade your in-flight experience";
      case "arrival":
        return "Services for your arrival and beyond";
      default:
        return "";
    }
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
            <span className="text-sm font-medium text-airline-blue">Step 2 of 4</span>
            <span className="text-sm text-gray-500">Additional Services</span>
          </div>
          <Progress value={50} className="h-2" />
        </div>

        {/* Booking Progress Indicator */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-4 md:space-x-8">
              {/* Flight Selected */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  ✓
                </div>
                <span className="text-sm font-medium text-green-600 hidden md:block">Flight Selected</span>
              </div>
              
              <div className="w-8 h-0.5 bg-gray-300"></div>
              
              {/* Seats Chosen */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-sm font-semibold">
                  2
                </div>
                <span className="text-sm font-medium text-gray-500 hidden md:block">Seats (at Check-in)</span>
              </div>
              
              <div className="w-8 h-0.5 bg-gray-300"></div>
              
              {/* Add Services */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-airline-blue rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  2
                </div>
                <span className="text-sm font-medium text-airline-blue hidden md:block">Add Services</span>
              </div>
              
              <div className="w-8 h-0.5 bg-gray-300"></div>
              
              {/* Payment */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-sm font-semibold">
                  3
                </div>
                <span className="text-sm font-medium text-gray-500 hidden md:block">Payment</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Flight Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Flight</h4>
                <p className="text-sm text-gray-600">
                  {selectedFlight.departureAirport} → {selectedFlight.arrivalAirport}
                </p>
                <p className="text-sm text-gray-600">
                  {selectedFlight.airline} {selectedFlight.flightNumber}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Passengers</h4>
                <p className="text-sm text-gray-600">
                  {passengerCount} {passengerCount === 1 ? 'passenger' : 'passengers'}
                </p>
                <p className="text-sm text-gray-600 capitalize">
                  {selectedFlight.class.replace('_', ' ')} Class
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Total Flight Cost</h4>
                <p className="text-lg font-bold text-airline-blue">
                  ${(parseFloat(selectedFlight.price) * passengerCount).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">
                  ${parseFloat(selectedFlight.price).toFixed(2)} × {passengerCount} {passengerCount === 1 ? 'passenger' : 'passengers'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Multi-Passenger Service Selection */}
        {passengerCount > 1 ? (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Individual Passenger Services
                </h2>
                <p className="text-gray-600 mt-2">
                  Select services for each of your {passengerCount} passengers individually.
                </p>
              </div>
              <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  {passengerCount} Passengers
                </span>
              </div>
            </div>

            {/* Passenger Tabs */}
            <Tabs value={`passenger-${currentPassenger}`} onValueChange={(value) => setCurrentPassenger(parseInt(value.split('-')[1]))} className="w-full mb-6">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({length: passengerCount}, (_, index) => (
                  <TabsTrigger key={index} value={`passenger-${index}`} className="flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>Passenger {index + 1}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Current Passenger Info */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-1">
                Passenger {currentPassenger + 1} Services
              </h3>
              <p className="text-sm text-blue-700">
                Services selected here will be specifically assigned to this passenger.
              </p>
            </div>
              
            {/* Service Phase Tabs */}
            <Tabs value={currentPhase} onValueChange={setCurrentPhase} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-8">
                <TabsTrigger value="booking" className="flex items-center space-x-2">
                  {getPhaseIcon("booking")}
                  <span className="hidden sm:inline">Booking</span>
                </TabsTrigger>
                <TabsTrigger value="pre_boarding" className="flex items-center space-x-2">
                  {getPhaseIcon("pre_boarding")}
                  <span className="hidden sm:inline">Pre-Boarding</span>
                </TabsTrigger>
                <TabsTrigger value="in_flight" className="flex items-center space-x-2">
                  {getPhaseIcon("in_flight")}
                  <span className="hidden sm:inline">In-Flight</span>
                </TabsTrigger>
                <TabsTrigger value="arrival" className="flex items-center space-x-2">
                  {getPhaseIcon("arrival")}
                  <span className="hidden sm:inline">Arrival</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value={currentPhase}>
                <div className="mb-6 text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {getPhaseTitle(currentPhase)} - Passenger {currentPassenger + 1}
                  </h3>
                  <p className="text-gray-600">
                    {getPhaseDescription(currentPhase)}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {services.map((service: any) => (
                    <ServiceCardEnhanced 
                      key={`${service.id}-passenger-${currentPassenger}`} 
                      service={service} 
                      phase={currentPhase} 
                      passengerId={currentPassenger}
                    />
                  ))}
                </div>

                {services.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No services available for this phase.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          /* Single Passenger Service Selection */
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Enhance Your Journey
                </h2>
                <p className="text-gray-600 mt-2">
                  Add premium services to enhance your travel experience.
                </p>
              </div>
            </div>

            <Tabs value={currentPhase} onValueChange={setCurrentPhase} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-8">
                <TabsTrigger value="booking" className="flex items-center space-x-2">
                  {getPhaseIcon("booking")}
                  <span className="hidden sm:inline">Booking</span>
                </TabsTrigger>
                <TabsTrigger value="pre_boarding" className="flex items-center space-x-2">
                  {getPhaseIcon("pre_boarding")}
                  <span className="hidden sm:inline">Pre-Boarding</span>
                </TabsTrigger>
                <TabsTrigger value="in_flight" className="flex items-center space-x-2">
                  {getPhaseIcon("in_flight")}
                  <span className="hidden sm:inline">In-Flight</span>
                </TabsTrigger>
                <TabsTrigger value="arrival" className="flex items-center space-x-2">
                  {getPhaseIcon("arrival")}
                  <span className="hidden sm:inline">Arrival</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value={currentPhase}>
                <div className="mb-6 text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {getPhaseTitle(currentPhase)}
                  </h3>
                  <p className="text-gray-600">
                    {getPhaseDescription(currentPhase)}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {services.map((service: any) => (
                    <ServiceCardEnhanced key={service.id} service={service} phase={currentPhase} />
                  ))}
                </div>

                {services.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No services available for this phase.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Seat Selection</span>
          </Button>
          <Button
            onClick={handleContinue}
            className="airline-button-primary flex items-center space-x-2"
          >
            <span>Continue to Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
