import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuthStore } from "@/store/auth-store";
import { Clock, Shield, DollarSign, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface FareHoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  flightId: number;
  currentPrice: number;
  originalPrice?: number;
  flightNumber: string;
  route: string;
}

export function FareHoldModal({ 
  isOpen, 
  onClose, 
  flightId, 
  currentPrice, 
  originalPrice,
  flightNumber,
  route 
}: FareHoldModalProps) {
  const [selectedDuration, setSelectedDuration] = useState<24 | 48 | 72>(24);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const priceIncrease = originalPrice ? currentPrice - originalPrice : 0;
  const increasePct = originalPrice ? ((priceIncrease / originalPrice) * 100) : 0;

  // Get user's wallet balance
  const { data: walletData } = useQuery({
    queryKey: [`/api/users/${user?.id}/wallet`],
    enabled: !!user?.id
  });

  // Get current fare hold status
  const { data: existingHold } = useQuery({
    queryKey: [`/api/fare-hold/${flightId}`],
    enabled: !!user?.id && isOpen
  });

  const holdOptions = [
    {
      duration: 24,
      price: 49.99,
      label: "24 Hours",
      description: "Lock fare until tomorrow",
      popular: true
    },
    {
      duration: 48,
      price: 79.99,
      label: "48 Hours",
      description: "Lock fare for 2 days",
      popular: false
    },
    {
      duration: 72,
      price: 99.99,
      label: "72 Hours",
      description: "Lock fare for 3 days",
      popular: false
    }
  ];

  const createFareHoldMutation = useMutation({
    mutationFn: (data: { flightId: number; holdDuration: number }) =>
      apiRequest("/api/fare-hold", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/fare-hold/${flightId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/wallet`] });
      onClose();
    },
  });

  const handlePurchaseFareHold = async () => {
    if (!user?.id) return;
    
    setIsProcessing(true);
    try {
      await createFareHoldMutation.mutateAsync({
        flightId,
        holdDuration: selectedDuration
      });
    } catch (error) {
      console.error("Failed to purchase fare hold:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedOption = holdOptions.find(opt => opt.duration === selectedDuration);
  const walletBalance = parseFloat((walletData as any)?.walletBalance || "0.00");
  const canAfford = walletBalance >= (selectedOption?.price || 0);

  // If user already has a hold, show different content
  if (existingHold) {
    const expiresAt = new Date((existingHold as any).expiresAt);
    const isExpired = expiresAt < new Date();
    
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Fare Hold Active
            </DialogTitle>
            <DialogDescription>
              Your fare is locked for flight {flightNumber}
            </DialogDescription>
          </DialogHeader>
          
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Locked Price:</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(parseFloat((existingHold as any).lockedFarePrice))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Current Price:</span>
                  <span className="font-semibold">
                    {formatCurrency(currentPrice)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">You Save:</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(currentPrice - parseFloat((existingHold as any).lockedFarePrice))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Expires:</span>
                  <span className={`text-sm ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                    {expiresAt.toLocaleDateString()} at {expiresAt.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Button onClick={onClose} variant="outline" className="w-full">
            Continue Booking
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-600" />
            Fare Price Increase Detected
          </DialogTitle>
          <DialogDescription>
            Lock in your fare for flight {flightNumber} ({route}) before it increases further
          </DialogDescription>
        </DialogHeader>

        {priceIncrease > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Price has increased by:</p>
                  <p className="text-lg font-semibold text-orange-600">
                    {formatCurrency(priceIncrease)} ({increasePct.toFixed(1)}%)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Current fare:</p>
                  <p className="text-lg font-semibold">{formatCurrency(currentPrice)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-3">Choose Your Fare Hold Duration</h3>
            <div className="grid gap-3">
              {holdOptions.map((option) => (
                <Card
                  key={option.duration}
                  className={`cursor-pointer transition-all ${
                    selectedDuration === option.duration
                      ? "ring-2 ring-blue-500 border-blue-500"
                      : "hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedDuration(option.duration as 24 | 48 | 72)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{option.label}</span>
                          {option.popular && (
                            <Badge variant="secondary" className="text-xs">Most Popular</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{option.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-gray-500" />
                          <span className="font-semibold">{formatCurrency(option.price)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                How Fare Hold Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600">
              <p>• Your fare is locked at the current price: <strong>{formatCurrency(currentPrice)}</strong></p>
              <p>• Even if prices increase, you pay the locked fare</p>
              <p>• Hold expires automatically if not used within the timeframe</p>
              <p>• Hold fee is non-refundable but protects against price increases</p>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Wallet Balance:</p>
              <p className="font-semibold">{formatCurrency(walletBalance)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Hold Fee:</p>
              <p className="font-semibold">{formatCurrency(selectedOption?.price || 0)}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Continue Without Hold
            </Button>
            <Button
              onClick={handlePurchaseFareHold}
              disabled={!canAfford || isProcessing || createFareHoldMutation.isPending}
              className="flex-2"
            >
              {isProcessing || createFareHoldMutation.isPending ? (
                "Processing..."
              ) : !canAfford ? (
                "Insufficient Balance"
              ) : (
                `Purchase ${selectedOption?.label} Hold`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}