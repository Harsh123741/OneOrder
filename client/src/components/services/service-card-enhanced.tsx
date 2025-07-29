import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { Plus, Minus, ShoppingCart, TrendingUp, TrendingDown } from "lucide-react";
import type { Service } from "@shared/schema";

interface ServiceCardEnhancedProps {
  service: Service & {
    basePrice?: string;
    dynamicPricing?: {
      basePrice: number;
      currentPrice: number;
      demandMultiplier: number;
      inventoryLevel: number;
      totalBookings: number;
      lastUpdated: string;
      pricingTag: {
        tag: string;
        message: string;
        variant: 'destructive' | 'default' | 'secondary';
      };
    };
    recommendationReason?: string;
    userFrequency?: number;
  };
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
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 leading-tight">
              {service.name}
            </CardTitle>
            {/* Recommendation badges */}
            {(service.userFrequency || service.recommendationReason) && (
              <div className="flex justify-between mt-2">
                {service.userFrequency && service.userFrequency > 0 && (
                  <div className="z-10">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs shadow-sm">
                      {service.userFrequency}x before
                    </Badge>
                  </div>
                )}
                {service.recommendationReason && (
                  <div className="z-10">
                    <Badge variant="outline" className="bg-white/95 text-xs border-amber-300 text-amber-700 shadow-sm">
                      {service.recommendationReason}
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="text-right flex flex-col items-end gap-1">
            {/* Dynamic Pricing Tags */}
            {service.dynamicPricing?.pricingTag?.tag && (
              <Badge variant={service.dynamicPricing.pricingTag.variant} className="text-xs">
                {service.dynamicPricing.pricingTag.tag}
              </Badge>
            )}
            
            {/* Price Display */}
            {service.dynamicPricing && service.dynamicPricing.basePrice !== service.dynamicPricing.currentPrice ? (
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2">
                  <span className="text-sm line-through text-gray-400">
                    ${service.dynamicPricing.basePrice.toFixed(2)}
                  </span>
                  <div className="text-xl font-bold text-airline-blue">
                    ${service.dynamicPricing.currentPrice.toFixed(2)}
                  </div>
                  {service.dynamicPricing.currentPrice > service.dynamicPricing.basePrice ? (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <span className={`text-xs ${service.dynamicPricing.currentPrice > service.dynamicPricing.basePrice ? 'text-red-600' : 'text-green-600'}`}>
                  {service.dynamicPricing.currentPrice > service.dynamicPricing.basePrice ? '+' : '-'}
                  ${Math.abs(service.dynamicPricing.currentPrice - service.dynamicPricing.basePrice).toFixed(2)}
                </span>
              </div>
            ) : (
              <div className="text-xl font-bold text-airline-blue">
                {parseFloat(service.price) === 0 ? "Free" : `$${service.price}`}
              </div>
            )}
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
            {service.dynamicPricing ? (
              service.dynamicPricing.inventoryLevel > 10 ? "Available" : 
              service.dynamicPricing.inventoryLevel > 0 ? `Only ${service.dynamicPricing.inventoryLevel} left` : "Sold out"
            ) : (
              service.inventory > 10 ? "Available" : 
              service.inventory > 0 ? `Only ${service.inventory} left` : "Sold out"
            )}
          </div>
          
          {currentQuantity === 0 ? (
            <Button
              onClick={handleAddToCart}
              disabled={(service.dynamicPricing ? service.dynamicPricing.inventoryLevel : service.inventory) === 0}
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
                disabled={(service.dynamicPricing ? service.dynamicPricing.inventoryLevel : service.inventory) === 0 || currentQuantity >= maxQuantity}
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