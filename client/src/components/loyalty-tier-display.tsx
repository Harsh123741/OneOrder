import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Crown, Star, Gift, Percent, CheckCircle, Info, ShoppingCart, Plus } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface LoyaltyTierDisplayProps {
  loyaltyStatus: any;
  loyaltyBundles: any[];
  selectedBundles: number[];
  onBundleToggle: (bundleId: number) => void;
  className?: string;
}

const tierColors: { [key: string]: string } = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF'
};

const tierIcons: { [key: string]: React.ReactNode } = {
  bronze: <Star className="w-4 h-4" />,
  silver: <Star className="w-4 h-4" />,
  gold: <Crown className="w-4 h-4" />,
  platinum: <Crown className="w-4 h-4" />,
  diamond: <Crown className="w-4 h-4" />
};

export default function LoyaltyTierDisplay({
  loyaltyStatus,
  loyaltyBundles,
  selectedBundles,
  onBundleToggle,
  className = ""
}: LoyaltyTierDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [addingBundle, setAddingBundle] = useState<number | null>(null);
  const { addItem } = useCart();
  const { toast } = useToast();

  // Fetch all services to get service details
  const { data: services = [] } = useQuery({
    queryKey: ['/api/services'],
  });

  // Handle bundle selection and automatic cart addition
  const handleAddBundleToCart = async (bundle: any) => {
    setAddingBundle(bundle.id);
    
    try {
      // Get services included in this bundle
      const bundleServices = services.filter(service => 
        bundle.serviceIds.includes(service.id)
      );

      if (bundleServices.length === 0) {
        toast({
          title: 'Bundle Error',
          description: 'No services found for this bundle',
          variant: 'destructive',
        });
        return;
      }

      // Add each service to cart with appropriate pricing
      for (const service of bundleServices) {
        let finalPrice = parseFloat(service.price);
        let discountInfo = null;

        if (bundle.isComplimentary) {
          finalPrice = 0;
          discountInfo = {
            type: 'complimentary',
            bundleName: bundle.bundleName,
            originalPrice: parseFloat(service.price),
            discount: parseFloat(service.price),
            description: 'Complimentary with your tier'
          };
        } else if (bundle.discountPercentage && parseFloat(bundle.discountPercentage) > 0) {
          const discountAmount = finalPrice * (parseFloat(bundle.discountPercentage) / 100);
          finalPrice = finalPrice - discountAmount;
          discountInfo = {
            type: 'discount',
            bundleName: bundle.bundleName,
            originalPrice: parseFloat(service.price),
            discount: discountAmount,
            discountPercentage: parseFloat(bundle.discountPercentage),
            description: `${bundle.discountPercentage}% ${bundle.bundleName} discount`
          };
        }

        // Add service to cart with loyalty bundle information
        await addItem({
          id: service.id,
          type: 'service',
          name: service.name,
          description: service.description,
          price: finalPrice,
          quantity: 1,
          serviceId: service.id,
          loyaltyBundle: {
            bundleId: bundle.id,
            bundleName: bundle.bundleName,
            tierName: bundle.tierName,
            isComplimentary: bundle.isComplimentary,
            discountPercentage: bundle.discountPercentage,
            discountInfo
          }
        });
      }

      toast({
        title: 'Bundle Added to Cart',
        description: `${bundle.bundleName} services have been added to your cart`,
      });

      // Toggle the bundle as selected
      onBundleToggle(bundle.id);

    } catch (error) {
      console.error('Error adding bundle to cart:', error);
      toast({
        title: 'Error',
        description: 'Failed to add bundle to cart',
        variant: 'destructive',
      });
    } finally {
      setAddingBundle(null);
    }
  };

  if (!loyaltyStatus?.currentTier) {
    return null;
  }

  const { currentTier, loyaltyPoints, totalMilesFlown, totalSpent, eligibility } = loyaltyStatus;
  const tierColor = tierColors[currentTier.tierName] || '#CD7F32';

  // Filter bundles to ensure only current tier bundles are shown
  const currentTierBundles = loyaltyBundles.filter(bundle => 
    bundle.tierName === currentTier.tierName.toLowerCase()
  );

  const complimentaryBundles = currentTierBundles.filter(bundle => bundle.isComplimentary);
  const discountedBundles = currentTierBundles.filter(bundle => !bundle.isComplimentary);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Tier Status Card */}
      <Card className="border-2" style={{ borderColor: tierColor }}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <div 
              className="p-2 rounded-full text-white"
              style={{ backgroundColor: tierColor }}
            >
              {tierIcons[currentTier.tierName]}
            </div>
            <div>
              <h3 className="text-lg font-bold">{currentTier.displayName.replace('Premier', 'Tier')}</h3>
              <p className="text-sm text-gray-600 font-normal">
                {loyaltyPoints.toLocaleString()} points • {totalMilesFlown.toLocaleString()} miles
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Tier Benefits */}
          <div className="flex flex-wrap gap-2">
            {currentTier.benefits.slice(0, 3).map((benefit: any, index: number) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {benefit.description}
              </Badge>
            ))}
            {currentTier.benefits.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="h-6 text-xs px-2"
              >
                {showDetails ? 'Less' : `+${currentTier.benefits.length - 3} more`}
              </Button>
            )}
          </div>

          {showDetails && (
            <div className="pt-2 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {currentTier.benefits.slice(3).map((benefit: any, index: number) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span>{benefit.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress to Next Tier */}
          {eligibility?.progressToNext && (
            <div className="pt-3 border-t">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">
                  Progress to {eligibility.progressToNext.displayName}
                </span>
                <span className="text-sm text-gray-600">
                  {Math.round(eligibility.progressToNext.progressPercentage)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full"
                  style={{ 
                    backgroundColor: tierColor,
                    width: `${Math.min(eligibility.progressToNext.progressPercentage, 100)}%`
                  }}
                />
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {eligibility.progressToNext.pointsNeeded > 0 && 
                  `${eligibility.progressToNext.pointsNeeded.toLocaleString()} points needed`
                }
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loyalty Bundles */}
      {currentTierBundles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-green-600" />
              Your {currentTier.displayName} Benefits
            </CardTitle>
            <p className="text-sm text-gray-600">
              Special offers and complimentary services for your tier
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Complimentary Services */}
            {complimentaryBundles.length > 0 && (
              <div>
                <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Complimentary Services
                </h4>
                <div className="space-y-3">
                  {complimentaryBundles.map((bundle) => (
                    <div key={bundle.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex-1">
                        <div className="font-semibold text-green-800">{bundle.bundleName}</div>
                        <div className="text-sm text-green-600">{bundle.description}</div>
                        {bundle.serviceIds && (
                          <div className="text-xs text-green-500 mt-1">
                            Includes {bundle.serviceIds.length} service{bundle.serviceIds.length > 1 ? 's' : ''}
                          </div>
                        )}
                        <Badge variant="secondary" className="mt-2 bg-green-100 text-green-800">
                          FREE with {currentTier.displayName}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddBundleToCart(bundle)}
                        disabled={addingBundle === bundle.id || selectedBundles.includes(bundle.id)}
                        className="border-green-300 text-green-700 hover:bg-green-50 ml-4"
                      >
                        {addingBundle === bundle.id ? (
                          'Adding...'
                        ) : selectedBundles.includes(bundle.id) ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Added
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4 mr-1" />
                            Add to Cart
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {complimentaryBundles.length > 0 && discountedBundles.length > 0 && (
              <Separator />
            )}

            {/* Discounted Services */}
            {discountedBundles.length > 0 && (
              <div>
                <h4 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  Member Discounts
                </h4>
                <div className="space-y-3">
                  {discountedBundles.map((bundle) => (
                    <div key={bundle.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex-1">
                        <div className="font-semibold text-blue-800">{bundle.bundleName}</div>
                        <div className="text-sm text-blue-600">{bundle.description}</div>
                        {bundle.serviceIds && (
                          <div className="text-xs text-blue-500 mt-1">
                            Includes {bundle.serviceIds.length} service{bundle.serviceIds.length > 1 ? 's' : ''}
                          </div>
                        )}
                        <Badge variant="secondary" className="mt-2 bg-blue-100 text-blue-800">
                          {bundle.discountPercentage}% OFF for {currentTier.displayName}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddBundleToCart(bundle)}
                        disabled={addingBundle === bundle.id || selectedBundles.includes(bundle.id)}
                        className="border-blue-300 text-blue-700 hover:bg-blue-50 ml-4"
                      >
                        {addingBundle === bundle.id ? (
                          'Adding...'
                        ) : selectedBundles.includes(bundle.id) ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Added
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4 mr-1" />
                            Add to Cart
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedBundles.length > 0 && (
              <div className="pt-3 border-t bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Info className="w-4 h-4" />
                  <span>
                    {selectedBundles.length} loyalty benefit{selectedBundles.length > 1 ? 's' : ''} selected.
                    These will be applied to your booking automatically.
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}