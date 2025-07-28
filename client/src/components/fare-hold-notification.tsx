import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Shield, Clock } from "lucide-react";

interface FareHoldNotificationProps {
  isVisible: boolean;
  currentPrice: number;
  originalPrice: number;
  flightNumber: string;
  route: string;
  onOpenModal: () => void;
  onDismiss: () => void;
}

export function FareHoldNotification({
  isVisible,
  currentPrice,
  originalPrice,
  flightNumber,
  route,
  onOpenModal,
  onDismiss
}: FareHoldNotificationProps) {
  if (!isVisible) return null;

  const priceIncrease = currentPrice - originalPrice;
  const increasePercent = ((priceIncrease / originalPrice) * 100).toFixed(1);

  return (
    <Card className="border-orange-200 bg-orange-50 animate-in slide-in-from-top-2">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-orange-100 rounded-full">
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="bg-orange-200 text-orange-800">
                Price Alert
              </Badge>
              <span className="text-sm font-medium text-orange-900">
                {flightNumber} • {route}
              </span>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-orange-900">
                Flight price increased by <strong>${priceIncrease.toFixed(2)} ({increasePercent}%)</strong>
              </p>
              <p className="text-xs text-orange-700">
                Lock in the current price to protect against further increases
              </p>
            </div>
            
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={onOpenModal}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Shield className="h-3 w-3 mr-1" />
                Lock Price
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onDismiss}
                className="border-orange-200 text-orange-600 hover:bg-orange-100"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}