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
import { Clock, Shield, ArrowRight, Info, CreditCard, Wallet, University } from "lucide-react";
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
  const { addFlight } = useCart();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [fareHoldPaymentOpen, setFareHoldPaymentOpen] = useState(false);
  const [selectedHold, setSelectedHold] = useState<{duration: number, price: number} | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');

  // Mutation for creating fare hold with payment
  const fareHoldMutation = useMutation({
    mutationFn: async ({ duration, price, paymentMethod }: { duration: number, price: number, paymentMethod: string }) => {
      const response = await apiRequest('POST', '/api/fare-hold', {
        flightId: flight.id,
        holdDuration: duration,
        holdPrice: price,
        lockedFarePrice: parseFloat(currentPrice),
        paymentMethod: paymentMethod
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Fare Hold Purchased",
        description: `Flight price locked at $${parseFloat(currentPrice).toFixed(2)} for ${selectedHold?.duration} hours`,
      });
      
      // Store selected flight with fare hold data
      const flightWithFareHold = {
        ...flight,
        fareHold: {
          id: data.id,
          lockedFarePrice: parseFloat(currentPrice),
          expiresAt: data.expiresAt,
          duration: selectedHold?.duration
        }
      };
      sessionStorage.setItem("selectedFlight", JSON.stringify(flightWithFareHold));

      // Get passenger count
      const storedSearch = sessionStorage.getItem("flightSearch");
      const passengerCount = storedSearch ? JSON.parse(storedSearch).passengers : 1;

      // Add flight to cart with locked price (no fare hold service added to cart since it's already paid)
      addFlight(flightWithFareHold, [], passengerCount);

      // Close modals and navigate to services
      setFareHoldPaymentOpen(false);
      setSelectedHold(null);
      setSelectedPaymentMethod('');
      onClose();
      setLocation("/services");
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Could not process fare hold payment",
        variant: "destructive",
      });
    }
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

  const handleSelectWithFareHold = () => {
    // Open fare hold payment modal with 24-hour option
    setSelectedHold({ duration: 24, price: 49.99 });
    setFareHoldPaymentOpen(true);
  };

  const handleConfirmFareHoldPayment = () => {
    if (selectedHold && selectedPaymentMethod) {
      fareHoldMutation.mutate({
        ...selectedHold,
        paymentMethod: selectedPaymentMethod
      });
    }
  };

  const formatPrice = (price: number | string) => {
    return `$${parseFloat(price.toString()).toFixed(2)}`;
  };

  // Get the actual current price - use dynamic pricing if available, otherwise use base price
  const getCurrentPrice = () => {
    if (flight.dynamicPricing?.currentPrice) {
      return flight.dynamicPricing.currentPrice;
    }
    return flight.price;
  };

  const currentPrice = getCurrentPrice();

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto w-[95vw] sm:w-[90vw] lg:max-w-2xl">
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
                  <h3 className="font-semibold text-lg">{flight.flightNumber}</h3>
                  <p className="text-gray-600">
                    {flight.departureAirport} → {flight.arrivalAirport}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatTime(flight.departureTime)} - {formatTime(flight.arrivalTime)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-airline-blue">
                    {formatPrice(currentPrice)}
                  </p>
                  <p className="text-sm text-gray-500">per person</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      +$49.99
                    </Badge>
                    <p className="text-xs text-gray-500">
                      Guaranteed fare regardless of price changes
                    </p>
                  </div>
                  <Button
                    onClick={handleSelectWithFareHold}
                    disabled={isProcessing}
                    className="w-full airline-button-primary"
                  >
                    {isProcessing ? "Processing..." : "Add Fare Hold"}
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

      {/* Fare Hold Payment Modal */}
      <Dialog open={fareHoldPaymentOpen} onOpenChange={setFareHoldPaymentOpen}>
        <DialogContent className="sm:max-w-md max-h-[95vh] overflow-y-auto w-[95vw] sm:w-[90vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Confirm Fare Hold Payment
            </DialogTitle>
            <DialogDescription>
              Complete payment to lock in your current flight price
            </DialogDescription>
          </DialogHeader>
          
          {selectedHold && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Flight:</span>
                  <span>{flight.airline} {flight.flightNumber}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Route:</span>
                  <span>{flight.departureAirport} → {flight.arrivalAirport}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Current Price:</span>
                  <span className="font-bold text-green-600">${parseFloat(currentPrice).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Hold Duration:</span>
                  <span>{selectedHold.duration} hours</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Hold Fee:</span>
                  <span>${selectedHold.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-bold">Total Payment:</span>
                  <span className="font-bold">${selectedHold.price.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800">
                <strong>Price Protection:</strong> Your flight price will be locked at ${parseFloat(currentPrice).toFixed(2)} for {selectedHold.duration} hours, even if market prices increase.
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Select Payment Method</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant={selectedPaymentMethod === 'credit_card' ? 'default' : 'outline'}
                    className="flex flex-col items-center p-4 h-auto"
                    onClick={() => setSelectedPaymentMethod('credit_card')}
                  >
                    <CreditCard className="w-6 h-6 mb-2" />
                    <span className="text-sm">Credit Card</span>
                  </Button>
                  
                  <Button
                    variant={selectedPaymentMethod === 'debit_card' ? 'default' : 'outline'}
                    className="flex flex-col items-center p-4 h-auto"
                    onClick={() => setSelectedPaymentMethod('debit_card')}
                  >
                    <CreditCard className="w-6 h-6 mb-2" />
                    <span className="text-sm">Debit Card</span>
                  </Button>
                  
                  <Button
                    variant={selectedPaymentMethod === 'bank_transfer' ? 'default' : 'outline'}
                    className="flex flex-col items-center p-4 h-auto"
                    onClick={() => setSelectedPaymentMethod('bank_transfer')}
                  >
                    <University className="w-6 h-6 mb-2" />
                    <span className="text-sm">Bank Transfer</span>
                  </Button>
                  
                  <Button
                    variant={selectedPaymentMethod === 'wallet' ? 'default' : 'outline'}
                    className="flex flex-col items-center p-4 h-auto"
                    onClick={() => setSelectedPaymentMethod('wallet')}
                  >
                    <Wallet className="w-6 h-6 mb-2" />
                    <span className="text-sm">Wallet</span>
                  </Button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setFareHoldPaymentOpen(false);
                    setSelectedPaymentMethod('');
                  }}
                  disabled={fareHoldMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleConfirmFareHoldPayment}
                  disabled={fareHoldMutation.isPending || !selectedPaymentMethod}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {fareHoldMutation.isPending ? 'Processing...' : 'Pay Now'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}