import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Shield } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useQuery } from '@tanstack/react-query';

interface FareHoldButtonProps {
  flightId: number;
  currentPrice: number;
  className?: string;
}

export default function FareHoldButton({ flightId, currentPrice, className = "" }: FareHoldButtonProps) {
  const { addService } = useCart();

  // Check for existing fare hold
  const { data: fareHold } = useQuery({
    queryKey: ['/api/fare-hold', flightId],
    enabled: !!flightId,
    retry: false
  });

  const handleAddFareHold = (duration: number, price: number) => {
    // Add fare hold as a service to cart
    const fareHoldService = {
      id: `fare-hold-${duration}h-${flightId}`,
      name: `Fare Hold - ${duration} Hours`,
      description: `Lock current flight price for ${duration} hours`,
      price: price.toFixed(2),
      category: 'protection',
      phase: 'booking',
      isActive: true,
      inventory: 999,
      tag: 'price_protection',
      flightId: flightId,
      lockedPrice: currentPrice.toFixed(2),
      duration: duration
    };

    addService(fareHoldService, 0); // Add to first passenger (flight-level service)
  };

  if (fareHold) {
    return (
      <Card className={`${className} border-green-200 bg-green-50`}>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-green-800">
            <Shield className="w-4 h-4" />
            <span className="font-medium text-sm">Price Locked!</span>
          </div>
          <div className="text-xs text-green-700 mt-1">
            Locked at ${parseFloat(fareHold.lockedFarePrice).toFixed(2)} until{' '}
            {new Date(fareHold.expiresAt).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} border-blue-200 bg-blue-50`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-blue-800">
          <Shield className="w-4 h-4" />
          <span className="font-medium text-sm">Price Protection</span>
        </div>
        <div className="space-y-1">
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs h-7"
            onClick={() => handleAddFareHold(24, 49.99)}
          >
            24hrs - $49.99
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs h-7"
            onClick={() => handleAddFareHold(48, 79.99)}
          >
            48hrs - $79.99
          </Button>
        </div>
        <div className="text-xs text-blue-600 text-center">
          Lock price while you decide
        </div>
      </CardContent>
    </Card>
  );
}