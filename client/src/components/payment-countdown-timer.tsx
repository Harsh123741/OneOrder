import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface PaymentCountdownTimerProps {
  expiresAt: string;
  orderNumber: string;
  onExpired?: () => void;
}

export function PaymentCountdownTimer({ expiresAt, orderNumber, onExpired }: PaymentCountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const expiration = new Date(expiresAt).getTime();
      const remaining = Math.max(0, expiration - now);
      
      setTimeRemaining(remaining);
      
      if (remaining === 0 && !isExpired) {
        setIsExpired(true);
        
        // Show expiration notification
        toast({
          title: "Payment Failed",
          description: `Payment failed for order ${orderNumber}`,
          variant: "destructive",
        });

        // Call onExpired callback
        if (onExpired) {
          onExpired();
        }
        
        // Redirect to My Orders page after a short delay
        setTimeout(() => {
          setLocation("/my-orders");
        }, 2000);
      }
    };

    // Initial calculation
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, orderNumber, isExpired, toast, setLocation, onExpired]);

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (isExpired) return "text-red-600";
    if (timeRemaining < 30000) return "text-orange-600"; // Less than 30 seconds
    return "text-blue-600";
  };

  const getBackgroundColor = () => {
    if (isExpired) return "bg-red-50 border-red-200";
    if (timeRemaining < 30000) return "bg-orange-50 border-orange-200";
    return "bg-blue-50 border-blue-200";
  };

  return (
    <Card className={`${getBackgroundColor()} transition-colors duration-300`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isExpired ? (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            ) : (
              <Clock className="h-5 w-5 text-blue-600" />
            )}
            <span className="font-medium text-gray-900">
              {isExpired ? "Payment Window Expired" : "Payment Window"}
            </span>
          </div>
          
          <div className={`text-xl font-bold ${getTimerColor()}`}>
            {isExpired ? "0:00" : formatTime(timeRemaining)}
          </div>
        </div>
        
        <div className="mt-2 text-sm text-gray-600">
          {isExpired 
            ? "This order has expired. Redirecting to your orders..."
            : "Complete your payment before time runs out to secure your booking."
          }
        </div>
      </CardContent>
    </Card>
  );
}