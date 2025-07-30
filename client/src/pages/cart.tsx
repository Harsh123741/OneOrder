import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/hooks/use-cart";
import { useCartStore } from "@/store/cart-store";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, ArrowRight, Minus, Plus, Trash2, Package, Plane, Users, Clock, MapPin, ShoppingCart } from "lucide-react";

export default function Cart() {
  const [, setLocation] = useLocation();
  const { items, removeItem, updateQuantity, clearCart } = useCart();
  const { getSubtotal, getTaxes, getTotal } = useCartStore();
  const { user } = useAuth();
  const [isClearing, setIsClearing] = useState(false);

  const flightItems = items.filter(item => item.type === 'flight');
  const serviceItems = items.filter(item => item.type === 'service');

  const handleBack = () => {
    if (flightItems.length > 0) {
      setLocation('/flights');
    } else {
      setLocation('/flights');
    }
  };

  const handleContinue = () => {
    if (flightItems.length === 0) {
      // Redirect to flights if no flight selected
      setLocation('/flights');
      return;
    }
    setLocation('/checkout');
  };

  const handleClearCart = async () => {
    setIsClearing(true);
    try {
      await clearCart();
    } finally {
      setIsClearing(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
                <p className="text-gray-600">Review your selections</p>
              </div>
            </div>
          </div>

          {/* Empty Cart */}
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-12 text-center">
                <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h3>
                <p className="text-gray-600 mb-6">Start by selecting a flight for your journey</p>
                <Button onClick={() => setLocation('/flights')} className="bg-airline-blue hover:bg-airline-blue-dark">
                  Browse Flights
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
              <p className="text-gray-600">{items.length} item{items.length !== 1 ? 's' : ''} in your cart</p>
            </div>
          </div>
          
          {items.length > 0 && (
            <Button
              variant="outline"
              onClick={handleClearCart}
              disabled={isClearing}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Cart
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Flight Items */}
            {flightItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Plane className="h-5 w-5 text-airline-blue" />
                    <span>Flight Selection</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {flightItems.map((item) => (
                    <div key={item.id} className="flex items-start space-x-4 p-4 border rounded-lg bg-blue-50">
                      <div className="w-10 h-10 bg-airline-blue rounded-lg flex items-center justify-center">
                        <Plane className="h-5 w-5 text-white" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">{item.name}</h3>
                            <p className="text-sm text-gray-600">{item.description}</p>
                            
                            {item.details && (
                              <div className="mt-2 text-sm text-gray-600">
                                <div className="flex items-center space-x-4">
                                  <span className="flex items-center space-x-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatTime(item.details.departureTime)} - {formatTime(item.details.arrivalTime)}</span>
                                  </span>
                                  <span className="flex items-center space-x-1">
                                    <Users className="h-3 w-3" />
                                    <span>{item.details.passengerCount} passenger{item.details.passengerCount !== 1 ? 's' : ''}</span>
                                  </span>
                                </div>
                                
                                {item.details.fareHold && (
                                  <Badge className="mt-2 bg-green-100 text-green-800">
                                    Fare Protected
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="text-right">
                            <div className="text-xl font-bold text-gray-900">${item.price.toFixed(2)}</div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 mt-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Service Items */}
            {serviceItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Package className="h-5 w-5 text-orange-500" />
                    <span>Additional Services</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {serviceItems.map((item) => (
                    <div key={item.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Package className="h-5 w-5 text-orange-600" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">{item.name}</h3>
                            <p className="text-sm text-gray-600">{item.description}</p>
                            
                            {item.details?.discount && parseInt(item.details.discount) > 0 && (
                              <div className="mt-2">
                                <Badge className="bg-green-100 text-green-800">
                                  {item.details.discount}% savings
                                </Badge>
                              </div>
                            )}
                          </div>
                          
                          <div className="text-right flex items-center space-x-2">
                            <div className="text-xl font-bold text-gray-900">${item.price.toFixed(2)}</div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">${getSubtotal().toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Taxes & Fees</span>
                    <span className="font-medium">${getTaxes().toFixed(2)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span className="text-airline-blue">${getTotal().toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <Button
                    onClick={handleContinue}
                    className="w-full bg-airline-blue hover:bg-airline-blue-dark text-white"
                    disabled={flightItems.length === 0}
                  >
                    {flightItems.length === 0 ? (
                      <>
                        <Plane className="h-4 w-4 mr-2" />
                        Select a Flight
                      </>
                    ) : (
                      <>
                        Continue to Checkout
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="w-full"
                  >
                    Continue Shopping
                  </Button>
                </div>

                {/* Security Badge */}
                <div className="pt-4 border-t">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    </div>
                    <span>Secure checkout guaranteed</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}