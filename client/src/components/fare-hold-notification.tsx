import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TrendingUp, Shield, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface FareHoldNotificationProps {
  flightId: number;
  currentPrice: number;
  originalPrice?: number;
  onOpenFareHold: () => void;
  existingHold?: any;
}

export function FareHoldNotification({ 
  flightId, 
  currentPrice, 
  originalPrice,
  onOpenFareHold,
  existingHold 
}: FareHoldNotificationProps) {
  const [showNotification, setShowNotification] = useState(false);

  const priceIncrease = originalPrice ? currentPrice - originalPrice : 0;
  const increasePct = originalPrice ? ((priceIncrease / originalPrice) * 100) : 0;

  // Show notification if price increased by more than $25 or 5%
  useEffect(() => {
    if (priceIncrease > 25 || increasePct > 5) {
      setShowNotification(true);
    }
  }, [priceIncrease, increasePct]);

  // Don't show if user already has a hold
  if (existingHold || !showNotification) {
    return null;
  }

  return (
    <Alert className="border-orange-200 bg-orange-50 mb-4">
      <TrendingUp className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-orange-800">
              Fare increased by {formatCurrency(priceIncrease)} ({increasePct.toFixed(1)}%)
            </span>
          </div>
          <p className="text-sm text-orange-700">
            Lock in this price with a Fare Hold to protect against further increases
          </p>
        </div>
        <Button 
          size="sm" 
          onClick={onOpenFareHold}
          className="ml-4 bg-orange-600 hover:bg-orange-700"
        >
          <Shield className="h-3 w-3 mr-1" />
          Hold Fare
        </Button>
      </AlertDescription>
    </Alert>
  );
}

// Component to show active fare hold status
export function ActiveFareHoldBadge({ fareHold }: { fareHold: any }) {
  if (!fareHold) return null;

  const expiresAt = new Date(fareHold.expiresAt);
  const hoursLeft = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)));
  const isExpiringSoon = hoursLeft <= 6;

  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
      <Shield className="h-3 w-3" />
      <span>Fare Locked</span>
      <div className="flex items-center gap-1 ml-1">
        <Clock className="h-3 w-3" />
        <span className={isExpiringSoon ? "text-orange-600 font-semibold" : ""}>
          {hoursLeft}h left
        </span>
      </div>
    </div>
  );
}