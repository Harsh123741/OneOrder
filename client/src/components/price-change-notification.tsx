import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';

interface PriceChangeNotificationProps {
  changes: Array<{
    itemId: string;
    name: string;
    oldPrice: number;
    newPrice: number;
    type: 'increase' | 'decrease';
    tag?: string;
    message?: string;
  }>;
  onDismiss: () => void;
}

export default function PriceChangeNotification({ changes, onDismiss }: PriceChangeNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Auto-dismiss after 10 seconds
    const timer = setTimeout(() => {
      handleDismiss();
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(), 300); // Allow fade animation
  };

  if (!isVisible || changes.length === 0) return null;

  const totalChanges = changes.length;
  const increases = changes.filter(c => c.type === 'increase').length;
  const decreases = changes.filter(c => c.type === 'decrease').length;

  return (
    <div className="fixed top-4 right-4 z-50 w-96 max-w-[90vw]">
      <Card className={`
        shadow-lg border-l-4 transition-all duration-300 ease-in-out transform
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${increases > decreases ? 'border-l-red-500 bg-red-50' : 
          decreases > increases ? 'border-l-green-500 bg-green-50' : 
          'border-l-orange-500 bg-orange-50'}
      `}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {increases > decreases ? (
                <TrendingUp className="w-5 h-5 text-red-600" />
              ) : decreases > increases ? (
                <TrendingDown className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              )}
              <h3 className="font-semibold text-gray-900">
                Price Changes in Your Cart
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 hover:bg-gray-200"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2 mb-3">
            {changes.slice(0, 3).map((change, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{change.name}</p>
                  {change.tag && (
                    <p className="text-xs text-gray-600">{change.message}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">${change.oldPrice.toFixed(2)}</span>
                  <span className="text-gray-400">→</span>
                  <span className={`font-semibold ${
                    change.type === 'increase' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    ${change.newPrice.toFixed(2)}
                  </span>
                  {change.type === 'increase' ? (
                    <TrendingUp className="w-3 h-3 text-red-600" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-green-600" />
                  )}
                </div>
              </div>
            ))}
            
            {changes.length > 3 && (
              <p className="text-xs text-gray-500 text-center">
                +{changes.length - 3} more items changed
              </p>
            )}
          </div>

          <div className="text-xs text-gray-600 mb-3">
            {increases > 0 && decreases > 0 ? (
              `${increases} price increases, ${decreases} decreases`
            ) : increases > 0 ? (
              `${increases} price increase${increases > 1 ? 's' : ''} due to high demand`
            ) : (
              `${decreases} price decrease${decreases > 1 ? 's' : ''} - great deals!`
            )}
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDismiss}
              className="flex-1 text-xs"
            >
              Got it
            </Button>
            <Button
              size="sm"
              onClick={() => {
                // Scroll to cart or navigate to checkout
                const cartElement = document.querySelector('[data-cart-summary]');
                if (cartElement) {
                  cartElement.scrollIntoView({ behavior: 'smooth' });
                }
                handleDismiss();
              }}
              className="flex-1 text-xs"
            >
              View Cart
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}