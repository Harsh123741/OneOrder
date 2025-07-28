import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield, CreditCard } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface FareHoldButtonProps {
  flightId: number;
  currentPrice: number;
  className?: string;
}

export default function FareHoldButton({ flightId, currentPrice, className = "" }: FareHoldButtonProps) {
  const { addService } = useCart();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedHold, setSelectedHold] = useState<{duration: number, price: number} | null>(null);

  // Check for existing fare hold
  const { data: fareHold } = useQuery({
    queryKey: ['/api/fare-hold', flightId],
    enabled: !!flightId,
    retry: false
  });

  // Mutation for creating fare hold
  const createFareHoldMutation = useMutation({
    mutationFn: async ({ duration, price }: { duration: number, price: number }) => {
      const response = await apiRequest('POST', '/api/fare-hold', {
        flightId,
        holdDuration: duration,
        holdPrice: price,
        lockedFarePrice: currentPrice
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Fare Hold Created",
        description: `Flight price locked at $${currentPrice.toFixed(2)} for ${selectedHold?.duration} hours`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/fare-hold', flightId] });
      setPaymentModalOpen(false);
      setSelectedHold(null);
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Could not process fare hold payment",
        variant: "destructive",
      });
    }
  });

  const handleSelectFareHold = (duration: number, price: number) => {
    setSelectedHold({ duration, price });
    setPaymentModalOpen(true);
  };

  const handleConfirmPayment = () => {
    if (selectedHold) {
      createFareHoldMutation.mutate(selectedHold);
    }
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
            onClick={() => handleSelectFareHold(24, 49.99)}
          >
            24hrs - $49.99
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs h-7"
            onClick={() => handleSelectFareHold(48, 79.99)}
          >
            48hrs - $79.99
          </Button>
        </div>
        <div className="text-xs text-blue-600 text-center">
          Lock price while you decide
        </div>
      </CardContent>

      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Confirm Fare Hold Payment
            </DialogTitle>
          </DialogHeader>
          
          {selectedHold && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Fare Hold Duration:</span>
                  <span>{selectedHold.duration} hours</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Current Flight Price:</span>
                  <span className="font-bold text-green-600">${currentPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Hold Fee:</span>
                  <span>${selectedHold.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-bold">Total Payment:</span>
                  <span className="font-bold">${selectedHold.price.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800">
                <strong>Price Protection:</strong> Your flight price will be locked at ${currentPrice.toFixed(2)} for {selectedHold.duration} hours, even if market prices increase.
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setPaymentModalOpen(false)}
                  disabled={createFareHoldMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleConfirmPayment}
                  disabled={createFareHoldMutation.isPending}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {createFareHoldMutation.isPending ? 'Processing...' : 'Pay Now'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}