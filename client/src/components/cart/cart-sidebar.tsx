import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/hooks/use-cart";
import { Trash2, X, TrendingUp, TrendingDown, Gift } from "lucide-react";
import { useLocation } from "wouter";


export default function CartSidebar() {
  const { 
    items, 
    isOpen, 
    setCartOpen, 
    removeItem, 
    subtotal, 
    taxes, 
    total 
  } = useCart();
  const [, setLocation] = useLocation();
  


  const handleProceedToCheckout = () => {
    setCartOpen(false);
    setLocation("/checkout");
  };

  return (
    <Sheet open={isOpen} onOpenChange={setCartOpen}>
      <SheetContent className="w-96 sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            Your Cart
            <Badge variant="secondary">{items.length} items</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-full">
          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Your cart is empty</p>
                <p className="text-sm">Add flights and services to get started</p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      {item.description && (
                        <p className="text-sm text-gray-600">{item.description}</p>
                      )}
                      {item.type === 'flight' && item.details && (
                        <div className="text-xs text-gray-500 mt-1">
                          <p>{item.details.departureTime} • {item.details.duration}</p>
                          <p>{item.details.aircraft}</p>
                        </div>
                      )}
                      
                      {/* Loyalty Bundle Information */}
                      {item.loyaltyBundle && (
                        <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                          <div className="flex items-center gap-1 text-xs font-medium text-green-800">
                            <Gift className="w-3 h-3" />
                            {item.loyaltyBundle.bundleName}
                          </div>
                          {item.loyaltyBundle.discountInfo && (
                            <div className="text-xs text-green-600 mt-1">
                              {item.loyaltyBundle.discountInfo.description}
                              {item.loyaltyBundle.discountInfo.type === 'complimentary' && ' (FREE)'}
                              {item.loyaltyBundle.discountInfo.type === 'discount' && 
                                ` (${item.loyaltyBundle.discountInfo.discountPercentage}% off)`}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id, true)} // User-initiated removal
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Dynamic Pricing Display for Services */}
                  {item.type === 'service' && item.details?.dynamicPricing && (
                    <div className="space-y-2">
                      {/* Pricing Tag */}
                      {item.details.dynamicPricing.pricingTag?.tag && (
                        <Badge 
                          variant={item.details.dynamicPricing.pricingTag.variant}
                          className="text-xs"
                        >
                          {item.details.dynamicPricing.pricingTag.tag}
                        </Badge>
                      )}
                      
                      {/* Price Display with Cross-out */}
                      {item.details.dynamicPricing.basePrice !== item.details.dynamicPricing.currentPrice && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="line-through text-gray-400">
                            ${item.details.dynamicPricing.basePrice}
                          </span>
                          <span className="font-medium text-gray-900">
                            ${item.details.dynamicPricing.currentPrice}
                          </span>
                          {item.details.dynamicPricing.currentPrice > item.details.dynamicPricing.basePrice ? (
                            <TrendingUp className="h-3 w-3 text-red-500" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-green-500" />
                          )}
                        </div>
                      )}
                      
                      {/* Price Difference */}
                      {item.details.dynamicPricing.basePrice !== item.details.dynamicPricing.currentPrice && (
                        <div className="text-xs">
                          {item.details.dynamicPricing.currentPrice > item.details.dynamicPricing.basePrice ? (
                            <span className="text-red-600">
                              +${(item.details.dynamicPricing.currentPrice - item.details.dynamicPricing.basePrice).toFixed(2)} increase
                            </span>
                          ) : (
                            <span className="text-green-600">
                              -${(item.details.dynamicPricing.basePrice - item.details.dynamicPricing.currentPrice).toFixed(2)} decrease
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dynamic Pricing Display for Flights */}
                  {item.type === 'flight' && item.details?.dynamicPricing && (
                    <div className="space-y-2">
                      {/* Fare Hold Status */}
                      {item.details.dynamicPricing.isLocked ? (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                          🔒 Fare Protected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          📈 Live Pricing
                        </Badge>
                      )}
                      
                      {/* Price Display with Cross-out (only if not locked) */}
                      {!item.details.dynamicPricing.isLocked && 
                       item.details.dynamicPricing.basePrice !== item.details.dynamicPricing.currentPrice && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="line-through text-gray-400">
                            ${parseFloat(item.details.dynamicPricing.basePrice).toFixed(2)}
                          </span>
                          <span className="font-medium text-gray-900">
                            ${parseFloat(item.details.dynamicPricing.currentPrice).toFixed(2)}
                          </span>
                          {parseFloat(item.details.dynamicPricing.currentPrice) > parseFloat(item.details.dynamicPricing.basePrice) ? (
                            <TrendingUp className="h-3 w-3 text-red-500" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-green-500" />
                          )}
                        </div>
                      )}
                      
                      {/* Price Difference (only if not locked) */}
                      {!item.details.dynamicPricing.isLocked &&
                       item.details.dynamicPricing.basePrice !== item.details.dynamicPricing.currentPrice && (
                        <div className="text-xs">
                          {parseFloat(item.details.dynamicPricing.currentPrice) > parseFloat(item.details.dynamicPricing.basePrice) ? (
                            <span className="text-red-600">
                              +${(parseFloat(item.details.dynamicPricing.currentPrice) - parseFloat(item.details.dynamicPricing.basePrice)).toFixed(2)} increase
                            </span>
                          ) : (
                            <span className="text-green-600">
                              -${(parseFloat(item.details.dynamicPricing.basePrice) - parseFloat(item.details.dynamicPricing.currentPrice)).toFixed(2)} decrease
                            </span>
                          )}
                        </div>
                      )}

                      {/* Fare Hold Expiry Info */}
                      {item.details.dynamicPricing.isLocked && item.details.dynamicPricing.userFareHold && (
                        <div className="text-xs text-green-600">
                          Protected until {new Date(item.details.dynamicPricing.userFareHold.expiresAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Quantity: {item.quantity}
                    </span>
                    <span className="font-semibold text-airline-blue">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Summary */}
          {items.length > 0 && (
            <div className="border-t border-gray-200 pt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                
                {/* Loyalty Bundle Savings */}
                {(() => {
                  const loyaltyItems = items.filter(item => item.loyaltyBundle?.discountInfo);
                  const totalSavings = loyaltyItems.reduce((sum, item) => {
                    if (item.loyaltyBundle?.discountInfo) {
                      return sum + item.loyaltyBundle.discountInfo.discount;
                    }
                    return sum;
                  }, 0);
                  
                  if (totalSavings > 0) {
                    return (
                      <div className="flex justify-between text-sm text-green-600">
                        <span className="flex items-center gap-1">
                          <Gift className="w-3 h-3" />
                          Loyalty Bundle Savings
                        </span>
                        <span>-${totalSavings.toFixed(2)}</span>
                      </div>
                    );
                  }
                  return null;
                })()}
                
                <div className="flex justify-between text-sm">
                  <span>Taxes & Fees</span>
                  <span>${taxes.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>Total</span>
                  <span className="text-airline-blue">${total.toFixed(2)}</span>
                </div>
              </div>

              <Button 
                onClick={handleProceedToCheckout}
                className="w-full airline-button-primary"
                disabled={items.length === 0}
              >
                Proceed to Checkout
              </Button>
            </div>
          )}
        </div>
        

      </SheetContent>
    </Sheet>
  );
}
