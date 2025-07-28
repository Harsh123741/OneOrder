import { useState } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Shield, ArrowRight, Info } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface FlightSelectionModalProps {
  flight: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function FlightSelectionModal({
  flight,
  isOpen,
  onClose,
}: FlightSelectionModalProps) {
  const [, setLocation] = useLocation();
  const { addFlight, addItem } = useCart();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const fareHoldMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/fare-hold', {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to create fare hold');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fare-hold'] });
    },
  });

  const handleContinueWithoutFareHold = () => {
    setIsProcessing(true);
    
    // Store selected flight and navigate to services
    sessionStorage.setItem("selectedFlight", JSON.stringify(flight));

    // Get passenger count for proper pricing
    const storedSearch = sessionStorage.getItem("flightSearch");
    const passengerCount = storedSearch
      ? JSON.parse(storedSearch).passengers
      : 1;

    // Add flight to cart for proper pricing calculation
    addFlight(flight, [], passengerCount);

    toast({
      title: "Flight Selected",
      description: "Continue to select additional services for your trip.",
    });

    onClose();
    setLocation("/services");
  };

  const handleSelectWithFareHold = async () => {
    setIsProcessing(true);
    
    try {
      // Create fare hold request
      const fareHoldData = {
        flightId: flight.id,
        holdDuration: 24, // 24 hours hold
        holdPrice: 25.00, // $25 fare hold fee
        lockedFarePrice: parseFloat(flight.price),
      };

      await fareHoldMutation.mutateAsync(fareHoldData);

      // Store selected flight
      sessionStorage.setItem("selectedFlight", JSON.stringify(flight));

      // Get passenger count
      const storedSearch = sessionStorage.getItem("flightSearch");
      const passengerCount = storedSearch
        ? JSON.parse(storedSearch).passengers
        : 1;

      // Add flight to cart
      addFlight(flight, [], passengerCount);

      // Add fare hold service to cart
      addItem({
        id: `fare-hold-${flight.id}`,
        name: "24-Hour Fare Hold",
        description: `Lock in your fare for ${flight.flightNumber} until tomorrow`,
        price: 25.00,
        type: "service",
        quantity: 1,
      });

      toast({
        title: "Fare Hold Activated",
        description: "Your fare is now locked for 24 hours. Continue to select services.",
      });

      onClose();
      setLocation("/services");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to activate fare hold. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (price: number | string) => {
    return `$${parseFloat(price.toString()).toFixed(2)}`;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Select Flight Options</DialogTitle>
          <DialogDescription>
            Choose how you'd like to proceed with your flight selection
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Flight Summary */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{flight.airline} {flight.flightNumber}</h3>
                  <p className="text-gray-600">
                    {flight.departureAirport} → {flight.arrivalAirport}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatTime(flight.departureTime)} - {formatTime(flight.arrivalTime)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-airline-blue">
                    {formatPrice(flight.price)}
                  </p>
                  <p className="text-sm text-gray-500">per person</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Continue Without Fare Hold */}
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <ArrowRight className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-lg">Continue Without Fare Hold</h3>
                  <p className="text-sm text-gray-600">
                    Proceed directly to service selection. Current fare applies at booking.
                  </p>
                  <div className="space-y-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      No additional fees
                    </Badge>
                    <p className="text-xs text-gray-500">
                      Fare may change based on demand
                    </p>
                  </div>
                  <Button
                    onClick={handleContinueWithoutFareHold}
                    disabled={isProcessing}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Continue Free
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Select Fare Hold */}
            <Card className="cursor-pointer hover:shadow-md transition-shadow border-blue-200">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-lg">Add Fare Hold Protection</h3>
                  <p className="text-sm text-gray-600">
                    Lock in this fare for 24 hours while you complete your booking.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">24-hour protection</span>
                    </div>
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                      +$25.00
                    </Badge>
                    <p className="text-xs text-gray-500">
                      Guaranteed fare regardless of price changes
                    </p>
                  </div>
                  <Button
                    onClick={handleSelectWithFareHold}
                    disabled={isProcessing || fareHoldMutation.isPending}
                    className="w-full airline-button-primary"
                  >
                    {fareHoldMutation.isPending ? "Processing..." : "Add Fare Hold"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Information Banner */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Why choose fare hold?</p>
                <p className="text-yellow-700 mt-1">
                  Flight prices can change frequently based on demand. A fare hold guarantees your current price 
                  for 24 hours, giving you time to complete your booking without price increases.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}