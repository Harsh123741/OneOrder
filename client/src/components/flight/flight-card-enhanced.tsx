import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Clock,
  Plane,
  ArrowRight,
  Wifi,
  Utensils,
  Briefcase,
  Package,
  CreditCard,
  Trash2,
  Shield,
  Star,
  Users,
  ShoppingCart,
  Plus,
  Minus,
  Check,
  X,
  TrendingUp,
  TrendingDown,
  Lock,
  Crown,
  Gift,
  Zap,
} from "lucide-react";
import { useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import DynamicPricingDisplay from "@/components/dynamic-pricing-display";
import FareHoldButton from "@/components/fare-hold-button";
import FlightSelectionModal from "./flight-selection-modal";

interface FlightCardProps {
  flight: any;
  onSelect?: (flight: any) => void;
}

export default function FlightCardEnhanced({
  flight,
  onSelect,
}: FlightCardProps) {
  const [, setLocation] = useLocation();
  const { addItem, items, removeItem } = useCart();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [flightWithPricing, setFlightWithPricing] = useState(flight);
  const [addingService, setAddingService] = useState<string | null>(null);
  const [showProceedButton, setShowProceedButton] = useState(false);

  // Fetch current dynamic pricing data for this flight
  const { data: pricingData } = useQuery({
    queryKey: [`/api/pricing/flight/${flight.id}`],
    refetchInterval: 30000,
  });

  // Fetch loyalty status
  const { data: loyaltyStatus } = useQuery({
    queryKey: [`/api/loyalty/user/${user?.id}/status`],
    enabled: !!user?.id,
  });

  // Fetch loyalty bundles for current tier
  const { data: loyaltyBundles = [] } = useQuery({
    queryKey: [
      `/api/loyalty/bundles/${loyaltyStatus?.currentTier?.tierName?.toLowerCase()}`,
    ],
    enabled: !!loyaltyStatus?.currentTier?.tierName,
  });

  // Update flight data with current pricing when available
  useEffect(() => {
    if (pricingData) {
      setFlightWithPricing({
        ...flight,
        dynamicPricing: {
          currentPrice: pricingData.currentPrice || flight.price,
          basePrice: pricingData.basePrice || flight.price,
          demandMultiplier: pricingData.demandMultiplier || 1,
          timeMultiplier: pricingData.timeMultiplier || 1,
          isLocked: pricingData.isLocked || false,
          userFareHold: pricingData.userFareHold || null,
        },
        price: pricingData.currentPrice || flight.price,
      });
    }
  }, [pricingData, flight]);

  const handleSelectFlight = () => {
    if (onSelect) {
      onSelect(flight);
    } else {
      setIsModalOpen(true);
    }
  };

  const handleFlightAdded = () => {
    setShowProceedButton(true);
    setIsModalOpen(false);
  };

  const handleProceed = () => {
    setLocation("/services");
  };

  const isServiceInCart = (serviceId: string) => {
    return items.some(
      (item) => item.id === serviceId || item.serviceId === parseInt(serviceId),
    );
  };

  const removeServiceFromCart = (serviceId: string) => {
    const itemToRemove = items.find(
      (item) => item.id === serviceId || item.serviceId === parseInt(serviceId),
    );
    if (itemToRemove) {
      removeItem(itemToRemove.id);
    }
  };

  const handleRemoveFlight = () => {
    const flightItem = items.find(
      (item) => item.type === "flight" && item.flightId === flight.id,
    );
    if (flightItem) {
      removeItem(flightItem.id);
      setShowProceedButton(false);
      toast({
        title: "Flight Removed",
        description: "Flight has been removed from your cart",
      });
    }
  };

  const handleAddServiceToCart = async (service: any, bundlePrice?: number) => {
    setAddingService(service.id);

    try {
      const serviceItem = {
        id: `service-${service.id}-${Date.now()}`,
        type: "service" as const,
        name: service.name,
        description: service.description,
        price: bundlePrice || parseFloat(service.price),
        quantity: 1,
        serviceId: service.id,
        details: {
          phase: service.phase,
          bundlePrice: bundlePrice,
          originalPrice: parseFloat(service.price),
          discount: bundlePrice
            ? (
                ((parseFloat(service.price) - bundlePrice) /
                  parseFloat(service.price)) *
                100
              ).toFixed(0)
            : 0,
        },
      };

      await addItem(serviceItem);

      toast({
        title: "Added to Cart",
        description: `${service.name} has been added to your cart`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add service to cart",
        variant: "destructive",
      });
    } finally {
      setAddingService(null);
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

  const tierColors: { [key: string]: string } = {
    bronze: "border-l-orange-400 bg-orange-50",
    silver: "border-l-gray-400 bg-gray-50",
    gold: "border-l-yellow-400 bg-yellow-50",
    platinum: "border-l-purple-400 bg-purple-50",
    diamond: "border-l-blue-400 bg-blue-50",
  };

  const serviceIcons: { [key: string]: any } = {
    meal: Utensils,
    insurance: Shield,
    lounge: Briefcase,
    wifi: Wifi,
    baggage: Package,
    boarding: CreditCard,
  };

  const flightExclusiveOffers = [
    {
      id: "premium-meal-seat",
      name: "Premium Meal + Seat",
      description: "Gourmet meal + extra legroom seat",
      originalPrice: 111,
      bundlePrice: 89,
      icon: Utensils,
      services: ["Meal Pre-booking", "Extra Legroom Seat"],
    },
    {
      id: "business-lounge",
      name: "Business Lounge Access",
      description: "Relax in premium lounges",
      originalPrice: 44,
      bundlePrice: 35,
      icon: Briefcase,
      services: ["Lounge Access"],
    },
  ];

  // Filter booking phase loyalty bundles
  const bookingBundles = Array.isArray(loyaltyBundles)
    ? loyaltyBundles.filter((bundle: any) => bundle.phase === "booking")
    : [];

  // Check if flight exists in cart
  const isFlightInCart = items.some(
    (item) => item.type === "flight" && item.flightId === flight.id,
  );

  // Check if fare hold should be shown (only before flight booking)
  const shouldShowFareHold = !isFlightInCart;

  const addExclusiveOffer = async (offer: any) => {
    setAddingService(offer.id);
    try {
      const serviceItem = {
        id: `service-${offer.id}-${Date.now()}`,
        type: "service" as const,
        name: offer.name,
        description: offer.description,
        price: offer.bundlePrice,
        quantity: 1,
        serviceId: offer.id,
        details: {
          phase: "booking",
          bundlePrice: offer.bundlePrice,
          originalPrice: offer.originalPrice,
          discount: `${Math.round(((offer.originalPrice - offer.bundlePrice) / offer.originalPrice) * 100)}`,
          isExclusiveOffer: true,
          flightSpecific: true,
        },
      };

      await addItem(serviceItem);

      toast({
        title: "Added to Cart",
        description: `${offer.name} has been added to your cart.`,
      });
    } catch (error) {
      console.error("Failed to add exclusive offer:", error);
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAddingService(null);
    }
  };

  const removeExclusiveOfferFromCart = (offerId: string) => {
    const itemToRemove = items.find((item) => item.serviceId === offerId);
    if (itemToRemove) {
      removeItem(itemToRemove.id);
      toast({
        title: "Removed from Cart",
        description: `Exclusive offer has been removed from your cart.`,
      });
    }
  };

  const isExclusiveOfferInCart = (offerId: string) => {
    return items.some(
      (item) => item.type === "service" && item.serviceId === offerId,
    );
  };

  return (
    <Card className="airline-card overflow-hidden">
      <CardContent className="p-0">
        {/* Main Flight Info */}
        <div className="p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-6">
            {/* Flight Details */}
            <div className="flex-1 space-y-3 lg:space-y-4 w-full lg:w-auto">
              {/* Airline Info */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-airline-blue rounded-lg flex items-center justify-center">
                    <Plane className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-lg">
                      {flight.flightNumber}
                    </h3>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  {/* High Demand Badge */}
                  <Badge className="bg-red-500 text-white text-xs">
                    High Demand
                  </Badge>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-airline-blue">
                      ${flightWithPricing.price || flight.price}
                    </div>
                    <p className="text-sm text-gray-600">Direct Flight</p>
                  </div>
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
                </div>

                {/* Flight Path */}
                <div className="flex-1 flex flex-col items-center min-w-0">
                  <div className="flex items-center space-x-2 w-full">
                    <div className="w-2 h-2 bg-airline-blue rounded-full"></div>
                    <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
                    <div className="w-2 h-2 bg-airline-blue rounded-full"></div>
                  </div>
                  <div className="mt-1 flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {flight.duration}
                    </span>
                    {getStopsBadge(flight.stops || 0)}
                  </div>
                </div>

                {/* Arrival */}
                <div className="text-center flex-shrink-0">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                    {formatTime(flight.arrivalTime)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">
                    {flight.arrivalAirport}
                  </div>
                </div>
              </div>
            </div>

            {/* Price and Actions */}
            <div className="flex flex-col items-end space-y-3 w-full lg:w-auto">
              {isFlightInCart ? (
                <div className="flex flex-col space-y-2 w-full lg:w-auto">
                  <Button
                    onClick={handleProceed}
                    className="w-full lg:w-auto bg-green-600 hover:bg-green-700 text-white px-6"
                  >
                    Proceed
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                  <Button
                    onClick={handleRemoveFlight}
                    variant="outline"
                    className="w-full lg:w-auto border-red-500 text-red-500 hover:bg-red-50 px-6"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Flight
                  </Button>
                </div>
              ) : showProceedButton ? (
                <Button
                  onClick={handleProceed}
                  className="w-full lg:w-auto bg-green-600 hover:bg-green-700 text-white px-6"
                >
                  Proceed to Cart
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSelectFlight}
                  className="w-full lg:w-auto bg-airline-blue hover:bg-airline-blue-dark text-white px-6"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Flight
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Flight Exclusive Offers */}
        <div className="border-t border-orange-200 bg-orange-50 p-4 sm:p-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-5 h-5 text-orange-600">✨</div>
            <h4 className="font-semibold text-gray-900">
              Exclusive Offers for This Flight
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {flightExclusiveOffers.map((offer) => {
              const IconComponent = offer.icon;
              return (
                <div
                  key={offer.id}
                  className="bg-white rounded-lg border border-orange-200 p-4"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <IconComponent className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">
                        {offer.name}
                      </h5>
                      <p className="text-sm text-gray-600 mb-2">
                        {offer.description}
                      </p>
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500 ">
                            If Bought Seperately:{" "}
                            <span className="line-through">
                              ${offer.originalPrice}
                            </span>
                          </span>
                          <span className="">
                            Offer Price:
                            <span className="text-lg font-bold text-orange-600 ml-2">
                              ${offer.bundlePrice}
                            </span>
                          </span>
                        </div>
                        {isExclusiveOfferInCart(offer.id) ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              removeExclusiveOfferFromCart(offer.id)
                            }
                            className="w-full bg-red-600 hover:bg-red-700 text-white transition-colors duration-200"
                          >
                            <Minus className="h-4 w-4 mr-2" />
                            Remove from Cart
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addExclusiveOffer(offer)}
                            disabled={addingService === offer.id}
                            className="w-full bg-white border-orange-300 text-orange-700 hover:bg-orange-50 hover:border-orange-400 transition-colors duration-200"
                          >
                            {addingService === offer.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-2"></div>
                                Adding...
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Add Bundle
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tier Exclusive Offers */}
        {loyaltyStatus && bookingBundles.length > 0 && (
          <div
            className={`border-t ${tierColors[loyaltyStatus.currentTier?.tierName?.toLowerCase()] || "border-l-gray-400 bg-gray-50"} p-4 sm:p-6`}
          >
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-5 h-5 text-blue-600">👑</div>
              <h4 className="font-semibold text-gray-900">
                {loyaltyStatus.currentTier?.tierName} Tier Exclusive Offers
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {bookingBundles.slice(0, 2).map((bundle: any) => (
                <div
                  key={bundle.id}
                  className="bg-white rounded-lg border border-blue-200 p-4"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Shield className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">
                        {bundle.bundleName}
                      </h5>
                      <p className="text-sm text-gray-600 mb-2">
                        {bundle.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div>
                          {bundle.isComplimentary ? (
                            <span className="text-lg font-bold text-green-600">
                              Free
                            </span>
                          ) : (
                            <span className="text-lg font-bold text-blue-600">
                              {bundle.discountPercentage}% off
                            </span>
                          )}
                        </div>
                        {isServiceInCart(bundle.id.toString()) ? (
                          <Button
                            size="sm"
                            onClick={() =>
                              removeServiceFromCart(bundle.id.toString())
                            }
                            disabled={addingService === bundle.id.toString()}
                            className="bg-red-500 hover:bg-red-600 text-white text-xs px-3"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() =>
                              handleAddServiceToCart(
                                {
                                  id: bundle.id,
                                  name: bundle.bundleName,
                                  description: bundle.description,
                                  price: "0",
                                  phase: "booking",
                                },
                                bundle.isComplimentary ? 0 : undefined,
                              )
                            }
                            disabled={addingService === bundle.id.toString()}
                            className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add to Cart
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Flight Selection Modal */}
      <FlightSelectionModal
        flight={flightWithPricing}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onFlightAdded={handleFlightAdded}
        showFareHold={shouldShowFareHold}
      />
    </Card>
  );
}
