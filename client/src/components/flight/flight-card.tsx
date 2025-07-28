import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Plane, Calendar, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import DynamicPricingDisplay from "@/components/dynamic-pricing-display";
import FareHoldButton from "@/components/fare-hold-button";
import { FareHoldModal } from "@/components/fare-hold-modal";
import { FareHoldNotification } from "@/components/fare-hold-notification";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface FlightCardProps {
  flight: any;
  onSelect?: (flight: any) => void;
}

export default function FlightCard({ flight, onSelect }: FlightCardProps) {
  const [, setLocation] = useLocation();
  const { addFlight, items } = useCart();
  const [isFareHoldModalOpen, setIsFareHoldModalOpen] = useState(false);
  const [showPriceAlert, setShowPriceAlert] = useState(false);
  const [originalPrice] = useState(parseFloat(flight.price));
  const queryClient = useQueryClient();

  // Get current dynamic pricing
  const { data: pricingData } = useQuery({
    queryKey: [`/api/pricing/flight/${flight.id}`],
    refetchInterval: 30000, // Check every 30 seconds
    enabled: !!flight.id,
  });

  // Simulate price increase for testing
  const simulatePriceIncrease = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/pricing/flight/${flight.id}/record-booking`, { quantity: 3 });
      return apiRequest("GET", `/api/pricing/flight/${flight.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pricing/flight/${flight.id}`] });
      // Show price alert after a brief delay to let the price update
      setTimeout(() => setShowPriceAlert(true), 1000);
    }
  });

  const handleSelectFlight = () => {
    if (onSelect) {
      onSelect(flight);
    } else {
      // Store selected flight and navigate directly to services
      sessionStorage.setItem("selectedFlight", JSON.stringify(flight));

      // Get passenger count for proper pricing
      const storedSearch = sessionStorage.getItem("flightSearch");
      const passengerCount = storedSearch
        ? JSON.parse(storedSearch).passengers
        : 1;

      // Add flight to cart for proper pricing calculation
      addFlight(flight, [], passengerCount);

      setLocation("/services");
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
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

  const currentPrice = pricingData?.currentPrice ? parseFloat(pricingData.currentPrice) : originalPrice;

  return (
    <div className="space-y-3">
      {/* Price Alert Notification */}
      <FareHoldNotification
        isVisible={showPriceAlert && currentPrice > originalPrice}
        currentPrice={currentPrice}
        originalPrice={originalPrice}
        flightNumber={flight.flightNumber}
        route={`${flight.departureAirport} → ${flight.arrivalAirport}`}
        onOpenModal={() => {
          setShowPriceAlert(false);
          setIsFareHoldModalOpen(true);
        }}
        onDismiss={() => setShowPriceAlert(false)}
      />

      <Card className="overflow-hidden hover:shadow-lg transition-shadow border-2 border-gray-100 hover:border-airline-blue/30">
        <CardContent className="p-0">
          <div className="flex flex-col xl:flex-row">
            {/* Flight Info */}
            <div className="flex-1 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
              <div className="flex items-center gap-3 mb-2 sm:mb-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-airline-blue rounded-full flex items-center justify-center">
                  <Plane className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-base sm:text-lg">{flight.flightNumber}</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">{flight.airline}</p>
                </div>
              </div>
              <Badge variant="outline" className="self-start sm:self-center text-xs">
                {flight.stops === 0 ? "Direct" : `${flight.stops} Stop${flight.stops > 1 ? 's' : ''}`}
              </Badge>
            </div>

            {/* Route and Time */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 items-center mb-4">
              <div className="text-center sm:text-left">
                <div className="text-lg sm:text-2xl font-bold">{flight.departureAirport}</div>
                <div className="text-gray-600 text-xs sm:text-sm">
                  {new Date(flight.departureTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>

              <div className="text-center flex flex-col items-center">
                <div className="text-xs sm:text-sm text-gray-600 mb-1">{flight.duration}</div>
                <div className="flex items-center gap-1 sm:gap-2 w-full max-w-16 sm:max-w-24">
                  <div className="flex-1 h-0.5 bg-gray-300"></div>
                  <Plane className="h-3 w-3 sm:h-4 sm:w-4 text-airline-blue rotate-90" />
                  <div className="flex-1 h-0.5 bg-gray-300"></div>
                </div>
                {flight.stops > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    via {flight.stopAirports?.join(', ') || 'connection'}
                  </div>
                )}
              </div>

              <div className="text-center sm:text-right">
                <div className="text-lg sm:text-2xl font-bold">{flight.arrivalAirport}</div>
                <div className="text-gray-600 text-xs sm:text-sm">
                  {new Date(flight.arrivalTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>

            {/* Aircraft and Date */}
            <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                {new Date(flight.departureTime).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                {flight.aircraft}
              </span>
              <span className="flex items-center gap-1">
                <span className="text-green-600 font-medium">{flight.availableSeats || 0} seats left</span>
              </span>
            </div>
          </div>

          {/* Price and Actions */}
          <div className="border-t xl:border-t-0 xl:border-l p-4 sm:p-6 xl:min-w-[280px] xl:max-w-[320px]">
            <div className="space-y-3">
              <DynamicPricingDisplay
                flightId={flight.id}
                currentPrice={parseFloat(flight.price)}
                basePrice={parseFloat(flight.price)}
                showFareHold={true}
                className="text-sm"
                isFlightInCart={items.some(item => item.type === 'flight' && item.id === flight.id)}
                onPriceIncrease={() => setIsFareHoldModalOpen(true)}
              />

              <div className="space-y-2">
                <Button
                  onClick={handleSelectFlight}
                  className="w-full airline-button-primary"
                >
                  Select Flight
                </Button>

                {/* Test Price Increase Button */}
                <Button
                  onClick={() => simulatePriceIncrease.mutate()}
                  disabled={simulatePriceIncrease.isPending}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs border-orange-200 text-orange-600 hover:bg-orange-50"
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {simulatePriceIncrease.isPending ? "Simulating..." : "Test Price Increase"}
                </Button>

                <div className="text-xs text-gray-500 text-center">
                  {flight.class.charAt(0).toUpperCase() + flight.class.slice(1)}{" "}
                  Class • {flight.availableSeats || 0} seats left
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Fare Hold Modal */}
      <FareHoldModal
        isOpen={isFareHoldModalOpen}
        onClose={() => setIsFareHoldModalOpen(false)}
        flightId={flight.id}
        currentPrice={parseFloat(flight.price)}
        originalPrice={parseFloat(flight.price)}
        flightNumber={flight.flightNumber}
        route={`${flight.departureAirport} → ${flight.arrivalAirport}`}
      />
    </Card>
  );
}
