import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Clock, Shield, Zap } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

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
  className = ""
}: DynamicPricingDisplayProps) {
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [priceChangeDirection, setPriceChangeDirection] = useState<'up' | 'down' | 'same'>('same');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch current pricing data
  const { data: pricingData, isLoading } = useQuery({
    queryKey: ['pricing', 'flight', flightId],
    queryFn: () => apiRequest(`/api/pricing/flight/${flightId}`),
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: !!flightId
  });

  // Fetch price history for trend analysis
  const { data: priceHistory } = useQuery({
    queryKey: ['price-history', 'flight', flightId],
    queryFn: () => apiRequest(`/api/pricing/history/flight/${flightId}?hours=24`),
    refetchInterval: 60000, // Refresh every minute
    enabled: !!flightId
  });

  // Check for existing fare hold
  const { data: fareHold } = useQuery({
    queryKey: ['fare-hold', flightId],
    queryFn: () => apiRequest(`/api/fare-hold/${flightId}`),
    enabled: showFareHold && !!flightId
  });

  // Create fare hold mutation
  const createFareHoldMutation = useMutation({
    mutationFn: (data: { flightId: number; holdDuration: number }) =>
      apiRequest('/api/fare-hold', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fare-hold', flightId] });
      toast({
        title: "Fare Hold Created",
        description: "Your flight price has been locked successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fare Hold Failed",
        description: error.message || "Unable to create fare hold",
        variant: "destructive"
      });
    }
  });

  // Track price changes
  useEffect(() => {
    if (pricingData?.currentPrice) {
      const newPrice = parseFloat(pricingData.currentPrice);
      
      if (lastPrice !== null) {
        if (newPrice > lastPrice) {
          setPriceChangeDirection('up');
        } else if (newPrice < lastPrice) {
          setPriceChangeDirection('down');
        } else {
          setPriceChangeDirection('same');
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

  const pricing = pricingData || { 
    currentPrice: currentPrice?.toString() || '0', 
    basePrice: basePrice?.toString() || '0',
    demandMultiplier: '1.000',
    timeMultiplier: '1.000',
    totalBookings: 0,
    inventoryLevel: 100
  };

  const currentPriceNum = parseFloat(pricing.currentPrice);
  const basePriceNum = parseFloat(pricing.basePrice);
  const priceChange = ((currentPriceNum - basePriceNum) / basePriceNum) * 100;
  const demandLevel = Math.min((pricing.totalBookings / 20) * 100, 100); // Assume max 20 bookings for full demand

  const getTrendIcon = () => {
    switch (priceChangeDirection) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriceChangeColor = () => {
    if (priceChange > 5) return 'text-red-600';
    if (priceChange < -5) return 'text-green-600';
    return 'text-gray-600';
  };

  const handleCreateFareHold = (duration: number) => {
    createFareHoldMutation.mutate({
      flightId,
      holdDuration: duration
    });
  };

  return (
    <Card className={`${className} border-2 border-dashed border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Dynamic Pricing
            {getTrendIcon()}
          </div>
          <Badge variant={priceChange > 0 ? "destructive" : priceChange < 0 ? "secondary" : "outline"}>
            {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Price Display */}
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">
            ${currentPriceNum.toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">
            Base price: ${basePriceNum.toFixed(2)}
          </div>
          <div className={`text-sm font-medium ${getPriceChangeColor()}`}>
            {priceChange > 0 ? '+' : ''}${(currentPriceNum - basePriceNum).toFixed(2)} from base
          </div>
        </div>

        {/* Demand and Time Factors */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="flex justify-between mb-1">
              <span>Demand Level</span>
              <span>{demandLevel.toFixed(0)}%</span>
            </div>
            <Progress value={demandLevel} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span>Time Factor</span>
              <span>{parseFloat(pricing.timeMultiplier).toFixed(2)}x</span>
            </div>
            <Progress 
              value={Math.min((parseFloat(pricing.timeMultiplier) - 0.8) / 1.2 * 100, 100)} 
              className="h-2" 
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="text-xs text-gray-600 text-center">
          {pricing.totalBookings} total bookings • {pricing.inventoryLevel} seats available
        </div>

        {/* Price History Trend */}
        {priceHistory && priceHistory.length > 1 && (
          <div className="text-xs text-gray-600">
            <span className="font-medium">24h trend:</span>
            {priceHistory.length > 1 && (
              <span className={`ml-1 ${
                parseFloat(priceHistory[0].price) > parseFloat(priceHistory[priceHistory.length - 1].price) 
                  ? 'text-red-600' : 'text-green-600'
              }`}>
                {parseFloat(priceHistory[0].price) > parseFloat(priceHistory[priceHistory.length - 1].price) 
                  ? '↗ Increasing' : '↘ Decreasing'}
              </span>
            )}
          </div>
        )}

        {/* Fare Hold Section */}
        {showFareHold && (
          <div className="border-t pt-4">
            {fareHold ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-800">
                  <Shield className="w-4 h-4" />
                  <span className="font-medium">Price Locked!</span>
                </div>
                <div className="text-sm text-green-700 mt-1">
                  Locked at ${parseFloat(fareHold.lockedFarePrice).toFixed(2)} until{' '}
                  {new Date(fareHold.expiresAt).toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Lock this price with Fare Hold
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => handleCreateFareHold(24)}
                    disabled={createFareHoldMutation.isPending}
                  >
                    24hrs - $49.99
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => handleCreateFareHold(48)}
                    disabled={createFareHoldMutation.isPending}
                  >
                    48hrs - $79.99
                  </Button>
                </div>
                <div className="text-xs text-gray-500 text-center">
                  Protect against price increases while you decide
                </div>
              </div>
            )}
          </div>
        )}

        {/* Real-time Update Indicator */}
        <div className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Live pricing updates every 30 seconds
        </div>
      </CardContent>
    </Card>
  );
}