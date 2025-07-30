import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Clock, Shield, Zap } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DynamicPricingDisplayProps {
  flightId: number;
  currentPrice?: number;
  basePrice?: number;
  showFareHold?: boolean;
  className?: string;
}

export default function DynamicPricingDisplay({
  flightId,
  currentPrice,
  basePrice,
  showFareHold = true,
  className = "",
}: DynamicPricingDisplayProps) {
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [priceChangeDirection, setPriceChangeDirection] = useState<
    "up" | "down" | "same"
  >("same");
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  // Check for existing fare hold
  const { data: fareHold } = useQuery({
    queryKey: ["/api/fare-hold", flightId],
    enabled: showFareHold && !!flightId && !pricingError,
    retry: false,
  });

  // Track price changes
  useEffect(() => {
    if (pricingData?.currentPrice) {
      const newPrice = parseFloat(pricingData.currentPrice);

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
  }, [pricingData?.currentPrice, lastPrice]);

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

  const pricing = pricingData || {
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
    <div className={``}>
      <CardContent className="p-6 flex flex-col gap-1 pt-[0px] pb-[0px] pl-[13px] pr-[13px]">
        {/* Demand Indicator */}
        <div className="text-center text-xs">
          {demandLevel > 80 ? (
            <Badge variant="destructive" className="text-xs">
              🔥 High Demand - Only Few Left!
            </Badge>
          ) : demandLevel > 60 ? (
            <Badge variant="secondary" className="text-xs">
              ⚡ Fast Booking - Popular Flight
            </Badge>
          ) : demandLevel > 40 ? (
            <Badge variant="outline" className="text-xs">
              📈 Moderate Demand
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              💺 Good Availability
            </Badge>
          )}
        </div>
        {/* Current Price Display */}
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">
            ${currentPriceNum.toFixed(2)}
          </div>
        </div>
      </CardContent>
    </div>
  );
}
