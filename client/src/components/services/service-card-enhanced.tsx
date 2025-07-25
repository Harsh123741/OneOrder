import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { Plus, Minus, ShoppingCart } from "lucide-react";
import type { Service } from "@shared/schema";

interface ServiceCardEnhancedProps {
  service: Service;
  phase: string;
  passengerId?: number;
}

export default function ServiceCardEnhanced({ service, phase, passengerId }: ServiceCardEnhancedProps) {
  const { addService, removeItem, updateQuantity, items } = useCart();
  const { toast } = useToast();
  
  // Find current quantity in cart (passenger-specific if passengerId provided)
  const cartItemId = passengerId !== undefined ? `service-${service.id}-passenger-${passengerId}` : `service-${service.id}`;
  const cartItem = items.find(item => item.id === cartItemId);
  const currentQuantity = cartItem?.quantity || 0;

  const getTagVariant = (tag: string) => {
    switch (tag) {
      case "recommended":
        return "default";
      case "only_few_left":
      case "very_limited":
        return "destructive";
      case "filling_fast":
      case "limited":
        return "secondary";
      case "popular":
      case "convenience":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getTagColor = (tag: string) => {
    switch (tag) {
      case "recommended":
        return "bg-blue-100 text-blue-800";
      case "only_few_left":
      case "very_limited":
        return "bg-red-100 text-red-800";
      case "filling_fast":
      case "limited":
        return "bg-orange-100 text-orange-800";
      case "popular":
      case "convenience":
        return "bg-green-100 text-green-800";
      case "luxury":
        return "bg-purple-100 text-purple-800";
      case "complimentary":
      case "tax_free":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleAddToCart = () => {
    addService(service, passengerId);
    
    toast({
      title: "Added to Cart",
      description: `${service.name} has been added to your cart.`,
    });
  };

  // Services that should be limited to quantity 1
  const singleUseServices = [
    'early check-in', 'wi-fi access', 'travel insurance', 
    'fast track security', 'lounge access', 'flexible ticket',
    'special assistance', 'pet travel', 'premium cabin upgrade',
    'entertainment upgrade', 'power outlet access', 'meet & assist arrival',
    'immigration fast track', 'hotel booking assistance', 'travel sim card'
  ];

  const isLimitedToOne = singleUseServices.some(limited => 
    service.name.toLowerCase().includes(limited)
  );

  const maxQuantity = isLimitedToOne ? 1 : 5;

  const handleIncrement = () => {
    if (currentQuantity === 0) {
      handleAddToCart();
    } else if (currentQuantity < maxQuantity) {
      updateQuantity(cartItemId, currentQuantity + 1);
      toast({
        title: "Quantity Updated",
        description: `${service.name} quantity increased.`,
      });
    } else {
      toast({
        title: "Quantity Limit Reached",
        description: `Maximum quantity for ${service.name} is ${maxQuantity}.`,
        variant: "destructive",
      });
    }
  };

  const handleDecrement = () => {
    if (currentQuantity > 1) {
      updateQuantity(cartItemId, currentQuantity - 1);
      toast({
        title: "Quantity Updated",
        description: `${service.name} quantity decreased.`,
      });
    } else if (currentQuantity === 1) {
      removeItem(cartItemId);
      toast({
        title: "Removed from Cart",
        description: `${service.name} has been removed from your cart.`,
      });
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case "booking":
        return "border-l-blue-500";
      case "pre_boarding":
        return "border-l-orange-500";
      case "in_flight":
        return "border-l-green-500";
      case "arrival":
        return "border-l-purple-500";
      default:
        return "border-l-gray-500";
    }
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-lg border-l-4 ${getPhaseColor(phase)}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold text-gray-900 leading-tight">
            {service.name}
          </CardTitle>
          <div className="text-right">
            <div className="text-xl font-bold text-airline-blue">
              {parseFloat(service.price) === 0 ? "Free" : `$${service.price}`}
            </div>
          </div>
        </div>
        {service.tag && (
          <Badge 
            className={`w-fit text-xs font-medium ${getTagColor(service.tag)}`}
            variant="secondary"
          >
            {service.tag.replace(/_/g, ' ').toUpperCase()}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-gray-600 text-sm mb-4 leading-relaxed">
          {service.description}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {service.inventory > 10 ? "Available" : 
             service.inventory > 0 ? `Only ${service.inventory} left` : "Sold out"}
          </div>
          
          {currentQuantity === 0 ? (
            <Button
              onClick={handleAddToCart}
              disabled={service.inventory === 0}
              size="sm"
              className="flex items-center gap-2 min-w-[100px]"
            >
              <ShoppingCart className="w-4 h-4" />
              Add to Cart
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDecrement}
                className="w-8 h-8 p-0"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-8 text-center font-medium">{currentQuantity}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleIncrement}
                disabled={service.inventory === 0 || currentQuantity >= maxQuantity}
                className="w-8 h-8 p-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}