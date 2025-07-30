import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OrderCountdownCardProps {
  order: any;
  onOrderExpired?: (orderNumber: string) => void;
}

export function OrderCountdownCard({ order, onOrderExpired }: OrderCountdownCardProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (order.status !== 'pending_payment' || !order.paymentExpiresAt) return;

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const expiration = new Date(order.paymentExpiresAt).getTime();
      const remaining = Math.max(0, expiration - now);
      
      setTimeRemaining(remaining);
      
      if (remaining === 0 && !isExpired) {
        setIsExpired(true);
        
        // Show expiration notification
        toast({
          title: "Payment Failed",
          description: `Payment failed for order ${order.orderNumber}`,
          variant: "destructive",
        });

        // Call callback to refresh orders
        if (onOrderExpired) {
          onOrderExpired(order.orderNumber);
        }
      }
    };

    // Initial calculation
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [order.paymentExpiresAt, order.orderNumber, order.status, isExpired, toast, onOrderExpired]);

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

  // Only show countdown for pending payment orders
  if (order.status !== 'pending_payment' || !order.paymentExpiresAt) {
    return null;
  }

  return (
    <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-center space-x-2">
        {isExpired ? (
          <AlertTriangle className="h-4 w-4 text-red-600" />
        ) : (
          <Clock className="h-4 w-4 text-blue-600" />
        )}
        <span className="text-sm font-medium text-gray-900">
          {isExpired ? "Payment Expired" : "Payment Window"}
        </span>
      </div>
      
      <div className="flex items-center space-x-2">
        <span className={`text-sm font-bold ${getTimerColor()}`}>
          {isExpired ? "0:00" : formatTime(timeRemaining)}
        </span>
        <Badge variant={isExpired ? "destructive" : "secondary"}>
          {isExpired ? "Expired" : "Pending"}
        </Badge>
      </div>
    </div>
  );
}