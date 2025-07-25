import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import { useCart } from "@/hooks/use-cart";

interface ServiceCardProps {
  service: any;
  onAddToCart?: (service: any) => void;
}

export default function ServiceCard({ service, onAddToCart }: ServiceCardProps) {
  const { addService } = useCart();

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(service);
    } else {
      addService(service);
    }
  };

  const getTagBadge = (tag: string | null) => {
    if (!tag) return null;
    
    switch (tag) {
      case 'recommended':
        return <Badge className="service-tag-recommended">Recommended</Badge>;
      case 'filling_fast':
        return <Badge className="service-tag-filling-fast">Filling Fast</Badge>;
      case 'only_few_left':
        return <Badge className="service-tag-only-few-left">Only Few Left</Badge>;
      case 'premium':
        return <Badge className="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded-full">Premium</Badge>;
      default:
        return <Badge variant="secondary">{tag}</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    const iconClasses = "w-16 h-16 rounded-lg flex items-center justify-center mb-4 text-white text-xl";
    
    switch (category) {
      case 'boarding':
        return (
          <div className={`${iconClasses} bg-gradient-to-br from-blue-500 to-blue-600`}>
            🚀
          </div>
        );
      case 'baggage':
        return (
          <div className={`${iconClasses} bg-gradient-to-br from-purple-500 to-indigo-600`}>
            🧳
          </div>
        );
      case 'insurance':
        return (
          <div className={`${iconClasses} bg-gradient-to-br from-green-500 to-emerald-600`}>
            🛡️
          </div>
        );
      case 'lounge':
        return (
          <div className={`${iconClasses} bg-gradient-to-br from-amber-500 to-orange-600`}>
            🍸
          </div>
        );
      case 'meal':
        return (
          <div className={`${iconClasses} bg-gradient-to-br from-red-500 to-pink-600`}>
            🍽️
          </div>
        );
      case 'security':
        return (
          <div className={`${iconClasses} bg-gradient-to-br from-teal-500 to-cyan-600`}>
            ⚡
          </div>
        );
      default:
        return (
          <div className={`${iconClasses} bg-gradient-to-br from-gray-500 to-gray-600`}>
            ⭐
          </div>
        );
    }
  };

  const getPopularityInfo = (category: string) => {
    // Mock popularity data based on service category
    const popularityMap: { [key: string]: string } = {
      boarding: "78% of passengers choose this",
      baggage: "Limited availability",
      insurance: "Highly recommended",
      lounge: "Premium experience",
      meal: "Chef-curated options",
      security: "Save up to 30 minutes",
    };
    
    return popularityMap[category] || "Popular choice";
  };

  return (
    <Card className="airline-card h-full">
      <CardContent className="p-6 flex flex-col h-full">
        {/* Header with Tag */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h4 className="font-semibold text-lg mb-2">{service.name}</h4>
            {service.tag && getTagBadge(service.tag)}
          </div>
          <div className="text-right ml-4">
            <div className="text-2xl font-bold text-airline-blue">
              ${parseFloat(service.price).toFixed(0)}
            </div>
            <div className="text-sm text-gray-600">per person</div>
          </div>
        </div>

        {/* Category Icon */}
        <div className="flex justify-center">
          {getCategoryIcon(service.category)}
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 flex-1">
          {service.description}
        </p>

        {/* Popularity/Info */}
        <div className="flex items-center text-sm text-gray-600 mb-4">
          <div className="flex items-center space-x-1">
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
            <span>{getPopularityInfo(service.category)}</span>
          </div>
        </div>

        {/* Inventory Status */}
        {service.inventory <= 10 && (
          <div className="text-sm text-orange-600 mb-4">
            Only {service.inventory} left!
          </div>
        )}

        {/* Add to Cart Button */}
        <Button 
          onClick={handleAddToCart}
          className="w-full airline-button-primary mt-auto"
          disabled={service.inventory === 0}
        >
          {service.inventory === 0 ? 'Sold Out' : 'Add to Cart'}
        </Button>
      </CardContent>
    </Card>
  );
}
