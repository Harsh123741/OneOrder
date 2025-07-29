import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Plane, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import DynamicPricingDisplay from "@/components/dynamic-pricing-display";
import FareHoldButton from "@/components/fare-hold-button";
import FlightSelectionModal from "./flight-selection-modal";

interface FlightCardProps {
  flight: any;
  onSelect?: (flight: any) => void;
}

export default function FlightCard({ flight, onSelect }: FlightCardProps) {
  const [, setLocation] = useLocation();
  const { addFlight } = useCart();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectFlight = () => {
    if (onSelect) {
      onSelect(flight);
    } else {
      // Show the selection modal instead of directly navigating
      setIsModalOpen(true);
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

  return (
    <Card className="airline-card">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-6">
          {/* Flight Details */}
          <div className="flex-1 space-y-3 lg:space-y-4 w-full lg:w-auto">
            {/* Airline Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-airline-blue rounded-lg flex items-center justify-center">
                  <Plane className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                    {flight.airline}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">{flight.flightNumber}</p>
                </div>
              </div>
              {/* Mobile price display */}
              <div className="lg:hidden">
                <DynamicPricingDisplay
                  flightId={flight.id}
                  currentPrice={parseFloat(flight.price)}
                  basePrice={parseFloat(flight.price)}
                  showFareHold={false}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Route and Times */}
            <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-8">
              {/* Departure */}
              <div className="text-center flex-shrink-0">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {formatTime(flight.departureTime)}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  {flight.departureAirport}
                </div>
                <div className="text-xs text-gray-500 hidden sm:block">
                  {formatDate(flight.departureTime)}
                </div>
                {/* Mobile date display */}
                <div className="text-xs text-gray-500 sm:hidden">
                  {formatDate(flight.departureTime).slice(0, 6)}
                </div>
              </div>

              {/* Flight Path */}
              <div className="flex-1 flex flex-col items-center min-w-0 px-1">
                <div className="text-xs sm:text-sm text-gray-600 mb-1">
                  {flight.duration}
                </div>
                <div className="w-full border-t-2 border-dashed border-gray-300 relative">
                  <Plane className="absolute -top-2 left-1/2 transform -translate-x-1/2 h-3 w-3 sm:h-4 sm:w-4 text-airline-blue bg-white" />
                </div>
                <div className="mt-1">{getStopsBadge(flight.stops)}</div>
                {flight.stops > 0 && flight.stopAirports && (
                  <div className="text-xs text-gray-500 mt-1 text-center hidden sm:block">
                    via {flight.stopAirports.join(", ")}
                  </div>
                )}
              </div>

              {/* Arrival */}
              <div className="text-center flex-shrink-0">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {formatTime(flight.arrivalTime)}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  {flight.arrivalAirport}
                </div>
                <div className="text-xs text-gray-500 hidden sm:block">
                  {formatDate(flight.arrivalTime)}
                </div>
                {/* Mobile date display */}
                <div className="text-xs text-gray-500 sm:hidden">
                  {formatDate(flight.arrivalTime).slice(0, 6)}
                </div>
              </div>
            </div>

            {/* Aircraft Info */}
            <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-gray-600">
              <span className="flex items-center space-x-1">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>{flight.aircraft}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>{flight.availableSeats} seats left</span>
              </span>
            </div>
          </div>

          {/* Price and Actions */}
          <div className="text-center lg:text-right space-y-3 w-full lg:w-auto lg:min-w-[250px] xl:min-w-[280px]">
            {/* Desktop price display */}
            <div className="hidden lg:block">
              <DynamicPricingDisplay
                flightId={flight.id}
                currentPrice={parseFloat(flight.price)}
                basePrice={parseFloat(flight.price)}
                showFareHold={false}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleSelectFlight}
                className="w-full sm:w-auto lg:w-full xl:w-auto airline-button-primary"
              >
                Select Flight
              </Button>

              <div className="text-xs text-gray-500">
                {flight.class.charAt(0).toUpperCase() + flight.class.slice(1)}{" "}
                Class • {flight.availableSeats || 0} seats left
              </div>
            </div>
          </div>
        </div>

        {/* Expandable Details */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            className="text-airline-blue hover:text-blue-700 w-full sm:w-auto"
          >
            View flight details
          </Button>
        </div>
      </CardContent>

      {/* Flight Selection Modal */}
      <FlightSelectionModal
        flight={flight}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </Card>
  );
}
