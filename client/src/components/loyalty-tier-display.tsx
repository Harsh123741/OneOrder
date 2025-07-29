import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Crown, Star, Gift, Percent, CheckCircle, Info } from 'lucide-react';

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

  if (!loyaltyStatus?.currentTier) {
    return null;
  }

  const { currentTier, loyaltyPoints, totalMilesFlown, totalSpent, eligibility } = loyaltyStatus;
  const tierColor = tierColors[currentTier.tierName] || '#CD7F32';

  const complimentaryBundles = loyaltyBundles.filter(bundle => bundle.isComplimentary);
  const discountedBundles = loyaltyBundles.filter(bundle => !bundle.isComplimentary);

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
      {loyaltyBundles.length > 0 && (
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
                    <div key={bundle.id} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <Checkbox
                        id={`bundle-${bundle.id}`}
                        checked={selectedBundles.includes(bundle.id)}
                        onCheckedChange={() => onBundleToggle(bundle.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <label 
                          htmlFor={`bundle-${bundle.id}`}
                          className="font-medium text-green-800 cursor-pointer"
                        >
                          {bundle.bundleName}
                        </label>
                        <p className="text-sm text-green-700 mt-1">
                          {bundle.description}
                        </p>
                        <Badge variant="secondary" className="mt-2 bg-green-100 text-green-800">
                          FREE with {currentTier.displayName}
                        </Badge>
                      </div>
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
                    <div key={bundle.id} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <Checkbox
                        id={`bundle-${bundle.id}`}
                        checked={selectedBundles.includes(bundle.id)}
                        onCheckedChange={() => onBundleToggle(bundle.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <label 
                          htmlFor={`bundle-${bundle.id}`}
                          className="font-medium text-blue-800 cursor-pointer"
                        >
                          {bundle.bundleName}
                        </label>
                        <p className="text-sm text-blue-700 mt-1">
                          {bundle.description}
                        </p>
                        <Badge variant="secondary" className="mt-2 bg-blue-100 text-blue-800">
                          {bundle.discountPercentage}% OFF for {currentTier.displayName}
                        </Badge>
                      </div>
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