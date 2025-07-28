import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Clock, Shield, Zap } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/use-cart";

interface DynamicPricingDisplayProps {
  flightId: number;
  currentPrice?: number;
  basePrice?: number;
  showFareHold?: boolean;
  isFlightInCart?: boolean;
  className?: string;
}

export default function DynamicPricingDisplay({
  flightId,
  currentPrice,
  basePrice,
  showFareHold = true,
  isFlightInCart = false,
  className = "",
}: DynamicPricingDisplayProps) {
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [priceChangeDirection, setPriceChangeDirection] = useState<
    "up" | "down" | "same"
  >("same");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { addService, items } = useCart();

  // Fetch current pricing data
  const {
    data: pricingData,
    isLoading,
    error: pricingError,
  } = useQuery({
    queryKey: ["/api/pricing/flight", flightId],
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: !!flightId,
    retry: false,
  });

  // Fetch price history for trend analysis
  const { data: priceHistory } = useQuery({
    queryKey: ["/api/pricing/history/flight", flightId, "hours=24"],
    refetchInterval: 60000, // Refresh every minute
    enabled: !!flightId && !pricingError,
    retry: false,
  });

  // Check if fare hold service is already in cart
  const hasFareHoldInCart = items.some(item => 
    item.type === 'service' && 
    item.category === 'fare-hold'
  );

  // Track price changes
  useEffect(() => {
    if (pricingData && typeof pricingData === 'object' && 'currentPrice' in pricingData) {
      const newPrice = parseFloat(pricingData.currentPrice as string);

      if (lastPrice !== null) {
        if (newPrice > lastPrice) {
          setPriceChangeDirection("up");
        } else if (newPrice < lastPrice) {
          setPriceChangeDirection("down");
        } else {
          setPriceChangeDirection("same");
        }
      }

      setLastPrice(newPrice);
    }
  }, [pricingData, lastPrice]);

  const handleAddFareHold = (duration: number, price: number) => {
    // Add fare hold service to cart
    addService({
      id: duration === 24 ? 999 : 998, // Use specific IDs for fare hold services
      name: `Fare Hold - ${duration}h`,
      description: `Lock current price for ${duration} hours`,
      price: price,
      phase: 'booking' as const,
      category: 'fare-hold'
    });
    
    toast({
      title: "Fare Hold Added!",
      description: `Price protection for ${duration} hours added to cart for $${price.toFixed(2)}`,
    });
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Dynamic Pricing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If there's an error, show fallback display with static price
  if (pricingError) {
    return (
      <Card
        className={`${className} border-2 border-dashed border-blue-300 bg-gradient-to-r from-blue-50 to-sky-50`}
      >
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-500" />
              Flight Price
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">
              ${currentPrice?.toFixed(2) || "0.00"}
            </div>
            <div className="text-sm text-gray-600">per person</div>
          </div>
          <div className="text-xs text-gray-500 text-center">
            Static pricing (dynamic pricing temporarily unavailable)
          </div>
        </CardContent>
      </Card>
    );
  }

  const pricing = (pricingData && typeof pricingData === 'object') ? {
    currentPrice: ('currentPrice' in pricingData) ? pricingData.currentPrice as string : currentPrice?.toString() || "0",
    basePrice: ('basePrice' in pricingData) ? pricingData.basePrice as string : basePrice?.toString() || "0",
    demandMultiplier: ('demandMultiplier' in pricingData) ? pricingData.demandMultiplier as string : "1.000",
    timeMultiplier: ('timeMultiplier' in pricingData) ? pricingData.timeMultiplier as string : "1.000",
    totalBookings: ('totalBookings' in pricingData) ? pricingData.totalBookings as number : 0,
    inventoryLevel: ('inventoryLevel' in pricingData) ? pricingData.inventoryLevel as number : 100,
  } : {
    currentPrice: currentPrice?.toString() || "0",
    basePrice: basePrice?.toString() || "0",
    demandMultiplier: "1.000",
    timeMultiplier: "1.000",
    totalBookings: 0,
    inventoryLevel: 100,
  };

  const currentPriceNum = parseFloat(pricing.currentPrice);
  const basePriceNum = parseFloat(pricing.basePrice);
  const priceChange = ((currentPriceNum - basePriceNum) / basePriceNum) * 100;
  const demandLevel = Math.min((pricing.totalBookings / 20) * 100, 100); // Assume max 20 bookings for full demand

  const getTrendIcon = () => {
    switch (priceChangeDirection) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriceChangeColor = () => {
    if (priceChange > 5) return "text-red-600";
    if (priceChange < -5) return "text-green-600";
    return "text-gray-600";
  };

  return (
    <Card className={`${className} border border-gray-200 bg-white`}>
      <CardContent className="p-4 space-y-3">
        {/* Current Price Display */}
        <div className="text-center">
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">
            ${currentPriceNum.toFixed(2)}
          </div>
          {basePriceNum !== currentPriceNum && (
            <div className="text-xs sm:text-sm text-gray-600">
              Base: ${basePriceNum.toFixed(2)}
            </div>
          )}
          {Math.abs(priceChange) > 0.1 && (
            <div className={`text-xs sm:text-sm font-medium ${getPriceChangeColor()}`}>
              {priceChange > 0 ? "+" : ""}$
              {(currentPriceNum - basePriceNum).toFixed(2)} ({priceChange > 0 ? "+" : ""}{priceChange.toFixed(1)}%)
            </div>
          )}
        </div>

        {/* Demand Indicator */}
        <div className="text-center">
          {demandLevel > 80 ? (
            <Badge variant="destructive" className="text-xs">
              High Demand - Few Left!
            </Badge>
          ) : demandLevel > 60 ? (
            <Badge variant="secondary" className="text-xs">
              Fast Booking - Popular
            </Badge>
          ) : demandLevel > 40 ? (
            <Badge variant="outline" className="text-xs">
              Moderate Demand
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              Good Availability
            </Badge>
          )}
        </div>

        {/* Fare Hold Section - only show if flight is in cart and no fare hold yet */}
        {showFareHold && isFlightInCart && !hasFareHoldInCart && (
          <div className="border-t pt-3">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-1 text-xs text-blue-600">
                <Shield className="w-3 h-3" />
                <span>Price Protection</span>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs h-7 border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => handleAddFareHold(24, 49.99)}
                >
                  24h - $49.99
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs h-7 border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => handleAddFareHold(48, 79.99)}
                >
                  48h - $79.99
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Fare Hold Active - only show if flight is in cart and has fare hold */}
        {showFareHold && isFlightInCart && hasFareHoldInCart && (
          <div className="border-t pt-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-green-700">
                <Shield className="w-3 h-3" />
                <span className="font-medium">Price Locked!</span>
              </div>
              <div className="text-xs text-green-600 mt-1">
                Fare hold active in cart
              </div>
            </div>
          </div>
        )}

        {/* Live Update Indicator */}
        <div className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          Live pricing
        </div>
      </CardContent>
    </Card>
  );
}
