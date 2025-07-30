import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Star, RefreshCw, Package, ShoppingBag, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CartRecommendations() {
  const { user } = useAuth();
  const { items, addItem } = useCart();
  const { toast } = useToast();
  const [addingService, setAddingService] = useState<string | null>(null);

  // Get services to pair with cart items
  const { data: pairRecommendations = [] } = useQuery({
    queryKey: [`/api/recommendations/pair-with-cart/${user?.id}`],
    enabled: !!user?.id && items.length > 0,
  });

  // Get buy again recommendations from order history
  const { data: buyAgainRecommendations = [] } = useQuery({
    queryKey: [`/api/recommendations/buy-again/${user?.id}`],
    enabled: !!user?.id,
  });

  // Get bundle recommendations for cart savings
  const { data: bundleRecommendations = [] } = useQuery({
    queryKey: [`/api/recommendations/bundles/${user?.id}`],
    enabled: !!user?.id && items.length > 0,
  });

  const handleAddService = async (service: any, source: string) => {
    setAddingService(service.id);
    
    try {
      const serviceItem = {
        id: `service-${service.id}-${Date.now()}`,
        type: 'service' as const,
        name: service.name,
        description: service.description,
        price: parseFloat(service.price),
        quantity: 1,
        serviceId: service.id,
        details: {
          phase: service.phase,
          recommendationSource: source,
          originalPrice: parseFloat(service.price),
          discount: 0
        }
      };

      await addItem(serviceItem);
      
      toast({
        title: "Added to Cart",
        description: `${service.name} has been added to your cart`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add service to cart",
        variant: "destructive",
      });
    } finally {
      setAddingService(null);
    }
  };

  const isServiceInCart = (serviceId: string) => {
    return items.some(item => item.serviceId === parseInt(serviceId));
  };

  if (!user || items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Services to Pair with Your Cart */}
      {pairRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-600" />
              <span>Services to Pair with Your Cart</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pairRecommendations.slice(0, 4).map((service: any) => (
                <div key={service.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{service.name}</h4>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      Pairs well
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{service.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-lg">${parseFloat(service.price).toFixed(2)}</span>
                    {isServiceInCart(service.id) ? (
                      <Badge variant="secondary">In Cart</Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleAddService(service, 'pair-with-cart')}
                        disabled={addingService === service.id}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Buy Again Recommendations */}
      {buyAgainRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5 text-green-600" />
              <span>Buy Again</span>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                From your history
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {buyAgainRecommendations.slice(0, 6).map((service: any) => (
                <div key={service.id} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">{service.name}</h4>
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 text-yellow-500 fill-current" />
                      <span className="text-xs text-gray-500">{service.frequency}x</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{service.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">${parseFloat(service.price).toFixed(2)}</span>
                    {isServiceInCart(service.id) ? (
                      <Badge variant="secondary" className="text-xs">Added</Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleAddService(service, 'buy-again')}
                        disabled={addingService === service.id}
                        className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add More and Save Bundles */}
      {bundleRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-orange-600" />
              <span>Add More and Save</span>
              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                Bundle deals
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bundleRecommendations.slice(0, 3).map((bundle: any) => (
                <div key={bundle.id} className="border rounded-lg p-4 bg-gradient-to-r from-orange-50 to-yellow-50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{bundle.name}</h4>
                      <p className="text-sm text-gray-600">{bundle.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500 line-through">
                        ${bundle.originalPrice?.toFixed(2)}
                      </div>
                      <div className="font-bold text-orange-600">
                        ${bundle.bundlePrice?.toFixed(2)}
                      </div>
                      <Badge className="bg-orange-100 text-orange-800 text-xs">
                        Save ${(bundle.originalPrice - bundle.bundlePrice).toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ShoppingBag className="h-4 w-4 text-orange-600" />
                      <span className="text-sm text-gray-600">
                        {bundle.serviceCount} services included
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddService(bundle, 'bundle-save')}
                      disabled={addingService === bundle.id}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Bundle
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}