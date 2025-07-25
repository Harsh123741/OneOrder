import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { useWallet } from "@/contexts/wallet-context";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plane, MapPin, Clock, User, Luggage } from "lucide-react";
import BoardingPass from "@/components/boarding-pass";
import SeatMap from "@/components/flight/seat-map";

const checkInSchema = z.object({
  orderNumber: z.string().min(1, "Order number is required"),
  lastName: z.string().min(1, "Last name is required"),
});

type CheckInFormData = z.infer<typeof checkInSchema>;

export default function CheckIn() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { balance, refreshBalance } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [eligibleOrder, setEligibleOrder] = useState<any>(null);
  const [showSeatSelection, setShowSeatSelection] = useState(false);
  const [availableSeats, setAvailableSeats] = useState<any[]>([]);
  const [selectedCheckInSeat, setSelectedCheckInSeat] = useState<any>(null);
  const [showBoardingPass, setShowBoardingPass] = useState(false);
  const [boardingPassData, setBoardingPassData] = useState<any>(null);
  const [currentPassengerIndex, setCurrentPassengerIndex] = useState(0);
  const [passengerSeats, setPassengerSeats] = useState<{[key: number]: any}>({});
  const [showPayment, setShowPayment] = useState(false);
  const [pendingSeatUpgrade, setPendingSeatUpgrade] = useState<any>(null);

  const form = useForm<CheckInFormData>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      orderNumber: "",
      lastName: user?.lastName || "",
    },
  });

  const checkEligibilityMutation = useMutation({
    mutationFn: async (data: CheckInFormData) => {
      const response = await apiRequest("POST", "/api/check-in/eligibility", {
        orderNumber: data.orderNumber,
        lastName: data.lastName,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.eligible) {
        setEligibleOrder(data.order);
        // Load available seats
        loadAvailableSeats(data.order.flightId);
      } else {
        toast({
          title: "Check-in Not Available",
          description: data.message || "Your booking is not eligible for web check-in at this time.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Unable to verify booking details. Please try again.",
        variant: "destructive",
      });
    },
  });

  const loadAvailableSeats = async (flightId: number) => {
    try {
      if (!flightId) {
        console.error("Invalid flight ID");
        return;
      }
      const response = await apiRequest("GET", `/api/flights/${flightId}/seats`);
      const seats = await response.json();
      setAvailableSeats(seats.filter((seat: any) => seat.isAvailable));
      setShowSeatSelection(true);
    } catch (error) {
      console.error("Failed to load seats:", error);
      toast({
        title: "Error",
        description: "Failed to load available seats. Please try again.",
        variant: "destructive",
      });
    }
  };

  const checkInMutation = useMutation({
    mutationFn: async ({ orderNumber, seatId }: { orderNumber: string, seatId?: number }) => {
      const response = await apiRequest("POST", "/api/check-in/complete", {
        orderNumber,
        seatId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Navigate to boarding pass success page with data
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      refreshBalance(); // Update wallet balance if seat upgrade was paid
      
      // Store boarding pass data in session storage for the success page
      sessionStorage.setItem('boardingPassData', JSON.stringify({
        boardingPassData: data,
        eligibleOrder,
        passengerSeats,
        availableSeats
      }));
      
      toast({
        title: "Check-in Complete!",
        description: "Redirecting to your boarding passes...",
      });
      
      // Navigate to boarding pass success page
      setTimeout(() => {
        setLocation('/boarding-pass-success');
      }, 1000);
    },
    onError: () => {
      toast({
        title: "Check-in Failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CheckInFormData) => {
    checkEligibilityMutation.mutate(data);
  };

  const handleCompleteCheckIn = () => {
    if (eligibleOrder?.orderNumber) {
      checkInMutation.mutate({ 
        orderNumber: eligibleOrder.orderNumber,
        seatId: selectedCheckInSeat?.id || eligibleOrder.seatId
      });
    }
  };

  const handleSeatSelection = (seat: any) => {
    setSelectedCheckInSeat(seat);
    // Check if seat requires payment
    const seatPrice = parseFloat(seat.price || '0');
    if (seatPrice > 0) {
      setPendingSeatUpgrade({
        seat,
        passengerIndex: currentPassengerIndex,
        price: seatPrice,
        taxAmount: seatPrice * 0.12,
        total: seatPrice * 1.12
      });
      setShowPayment(true);
    } else {
      // Free seat - proceed directly
      setPassengerSeats(prev => ({
        ...prev,
        [currentPassengerIndex]: seat
      }));
    }
  };

  const handleConfirmSeatSelection = () => {
    if (selectedCheckInSeat && eligibleOrder?.orderNumber) {
      checkInMutation.mutate({ 
        orderNumber: eligibleOrder.orderNumber,
        seatId: selectedCheckInSeat.id
      });
    }
  };

  const handlePaymentConfirm = () => {
    if (pendingSeatUpgrade) {
      // Add seat to passenger seats
      setPassengerSeats(prev => ({
        ...prev,
        [pendingSeatUpgrade.passengerIndex]: pendingSeatUpgrade.seat
      }));
      
      // Process payment and complete check-in
      checkInMutation.mutate({ 
        orderNumber: eligibleOrder.orderNumber,
        seatId: pendingSeatUpgrade.seat.id
      });
      
      setShowPayment(false);
      setPendingSeatUpgrade(null);
    }
  };

  const handleSkipSeatSelection = () => {
    // Complete check-in without seat selection
    if (eligibleOrder?.orderNumber) {
      checkInMutation.mutate({ 
        orderNumber: eligibleOrder.orderNumber
      });
    }
  };

  const getPassengerList = () => {
    if (!eligibleOrder?.passengerInfo) return [];
    return Array.isArray(eligibleOrder.passengerInfo) ? eligibleOrder.passengerInfo : [eligibleOrder.passengerInfo];
  };

  const getCurrentPassenger = () => {
    const passengers = getPassengerList();
    return passengers[currentPassengerIndex] || null;
  };

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateTime: string) => {
    return new Date(dateTime).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Web Check-in</h1>
            <p className="text-gray-600 mt-1">Check in online and select your seat</p>
          </div>
        </div>

        {!eligibleOrder ? (
          /* Check-in Form */
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                Enter Booking Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="orderNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Booking Reference *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="SL1234567" className="uppercase" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="As on booking" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={checkEligibilityMutation.isPending}
                  >
                    {checkEligibilityMutation.isPending ? "Checking..." : "Check-in"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : showPayment ? (
          /* Payment Modal for Premium Seat */
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Seat Upgrade Payment</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingSeatUpgrade && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900">
                      {getCurrentPassenger()?.firstName} {getCurrentPassenger()?.lastName}
                    </h4>
                    <p className="text-sm text-blue-700">
                      Seat {pendingSeatUpgrade.seat.seatNumber} - {pendingSeatUpgrade.seat.seatClass} 
                      {pendingSeatUpgrade.seat.isExtraLegroom && ' + Extra Legroom'}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Seat Upgrade</span>
                      <span>${pendingSeatUpgrade.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxes (12%)</span>
                      <span>${pendingSeatUpgrade.taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-2">
                      <span>Total</span>
                      <span>${pendingSeatUpgrade.total.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800">
                      <strong>Wallet Payment:</strong> Amount will be deducted from your wallet balance.
                      <br />
                      <span className="font-medium">Current balance: ${balance}</span>
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      onClick={() => setShowPayment(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handlePaymentConfirm}
                      className="flex-1 airline-button-primary"
                      disabled={checkInMutation.isPending || parseFloat(balance) < pendingSeatUpgrade.total}
                    >
                      {checkInMutation.isPending ? "Processing..." : parseFloat(balance) < pendingSeatUpgrade.total ? "Insufficient Balance" : "Pay Now"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : !showSeatSelection ? (
          /* Flight Details & Passenger Selection */
          <div className="space-y-6">
            <Card>
              <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                Flight Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {eligibleOrder.flight && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-semibold">{eligibleOrder.flight.departureAirport}</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(eligibleOrder.flight.departureTime)}
                        </p>
                        <p className="text-lg font-bold">
                          {formatTime(eligibleOrder.flight.departureTime)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-semibold">{eligibleOrder.flight.arrivalAirport}</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(eligibleOrder.flight.arrivalTime)}
                        </p>
                        <p className="text-lg font-bold">
                          {formatTime(eligibleOrder.flight.arrivalTime)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Multi-Passenger Display */}
              {getPassengerList().map((passenger: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-semibold">
                        {passenger.firstName} {passenger.lastName}
                      </p>
                      <p className="text-sm text-gray-600">
                        Passenger {index + 1} - Booking: {eligibleOrder.orderNumber}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">{eligibleOrder.status}</Badge>
                </div>
              ))}

              <div className="flex gap-4">
                <Button
                  onClick={() => setShowSeatSelection(true)}
                  className="flex-1"
                >
                  Select Seats for Passengers
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSkipSeatSelection}
                  disabled={checkInMutation.isPending}
                >
                  {checkInMutation.isPending ? "Processing..." : "Skip Seat Selection"}
                </Button>
              </div>
            </CardContent>
          </Card>
          </div>
        ) : (
          /* Multi-Passenger Seat Selection */
          <div className="space-y-6">
            {/* Passenger Selection Tabs */}
            <Card>
              <CardHeader>
                <CardTitle>Select Seat for Each Passenger</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2 mb-4">
                  {getPassengerList().map((passenger: any, index: number) => (
                    <Button
                      key={index}
                      variant={currentPassengerIndex === index ? "default" : "outline"}
                      onClick={() => setCurrentPassengerIndex(index)}
                      className="flex-1"
                    >
                      {passenger.firstName} {passenger.lastName}
                      {passengerSeats[index] && (
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Seat {passengerSeats[index].seatNumber}
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900">
                    Now selecting seat for: {getCurrentPassenger()?.firstName} {getCurrentPassenger()?.lastName}
                  </h4>
                  <p className="text-sm text-blue-700">
                    Choose a seat from the map below. Premium seats require payment.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Seat Map */}
            {eligibleOrder?.flightId && (
              <SeatMap
                flightId={eligibleOrder.flightId}
                onSeatSelect={handleSeatSelection}
                selectedSeats={Object.values(passengerSeats).filter(Boolean)}
                passengerCount={getPassengerList().length}
                currentPassenger={currentPassengerIndex}
              />
            )}
            
            {/* Selected Seat Info */}
            {selectedCheckInSeat && (
              <Card className="p-4 bg-green-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Selected: {selectedCheckInSeat.seatNumber}</p>
                    <p className="text-sm text-gray-600">
                      {selectedCheckInSeat.seatType} - {selectedCheckInSeat.seatClass}
                      {selectedCheckInSeat.isExtraLegroom && ' + Extra Legroom'}
                    </p>
                    {parseFloat(selectedCheckInSeat.price || '0') > 0 && (
                      <p className="text-sm font-semibold text-green-700">
                        Upgrade Cost: ${selectedCheckInSeat.price} + taxes
                      </p>
                    )}
                  </div>
                  {parseFloat(selectedCheckInSeat.price || '0') === 0 && (
                    <Button 
                      onClick={() => {
                        setPassengerSeats(prev => ({
                          ...prev,
                          [currentPassengerIndex]: selectedCheckInSeat
                        }));
                        setSelectedCheckInSeat(null);
                      }}
                    >
                      Confirm Free Seat
                    </Button>
                  )}
                </div>
              </Card>
            )}
            
            {/* Navigation */}
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSeatSelection(false);
                  setSelectedCheckInSeat(null);
                }}
                className="flex-1"
              >
                Back to Details
              </Button>
              
              {Object.keys(passengerSeats).length === getPassengerList().length && (
                <Button
                  onClick={() => {
                    // Complete check-in for all passengers with their selected seats
                    checkInMutation.mutate({ 
                      orderNumber: eligibleOrder.orderNumber,
                      seatId: passengerSeats[0]?.id, // For now, use first passenger's seat
                      passengerSeats: passengerSeats // Pass all passenger seats
                    });
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  disabled={checkInMutation.isPending}
                >
                  {checkInMutation.isPending ? "Processing..." : `Complete Check-in for All ${getPassengerList().length} Passengers`}
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={handleSkipSeatSelection}
                disabled={checkInMutation.isPending}
                className="flex-1"
              >
                Skip All Seats
              </Button>
            </div>
          </div>
        )}

        {/* Multiple Boarding Passes Display */}
        {showBoardingPass && boardingPassData && (
          <div className="mt-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-center text-green-600">
                  ✓ Check-in Complete - Your Boarding Passes
                </CardTitle>
              </CardHeader>
            </Card>
            
            {getPassengerList().map((passenger: any, index: number) => (
              <Card key={index} className="border-2 border-green-200">
                <CardHeader>
                  <CardTitle className="text-center text-lg">
                    Boarding Pass - {passenger.firstName} {passenger.lastName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <BoardingPass
                      order={eligibleOrder}
                      flight={eligibleOrder.flight}
                      seat={passengerSeats[index] || (eligibleOrder.seatId ? availableSeats.find(s => s.id === eligibleOrder.seatId) : null)}
                      user={{
                        ...user,
                        firstName: passenger.firstName,
                        lastName: passenger.lastName
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <div className="text-center mt-6 space-y-2">
              <p className="text-sm text-gray-600">
                Save all boarding passes and have them ready when you arrive at the airport
              </p>
              <Button 
                variant="outline" 
                onClick={() => window.print()}
                className="mr-2"
              >
                Print All Boarding Passes
              </Button>
              <Button onClick={() => setLocation('/my-orders')}>
                View All Orders
              </Button>
            </div>
          </div>
        )}

        {/* Complete Check-in Button - Only show if no passengers need seat selection */}
        {eligibleOrder && !showSeatSelection && !showBoardingPass && getPassengerList().length === 1 && (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <Button 
                type="button"
                className="w-full"
                onClick={handleCompleteCheckIn}
                disabled={checkInMutation.isPending}
              >
                {checkInMutation.isPending ? "Checking In..." : "Complete Check-in"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Check-in Status Info */}
        {!showBoardingPass && (
          <div className="mt-8 text-center text-sm text-gray-600">
            <p>Web check-in is available 24 hours before departure.</p>
            <p>You can print your boarding pass after check-in or show it on your mobile device.</p>
          </div>
        )}
      </div>
    </div>
  );
}