import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Crown, Star, Gift, TrendingUp, Award, ArrowUp, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const tierColors: { [key: string]: string } = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF'
};

const tierIcons: { [key: string]: React.ReactNode } = {
  bronze: <Star className="w-5 h-5" />,
  silver: <Star className="w-5 h-5" />,
  gold: <Crown className="w-5 h-5" />,
  platinum: <Crown className="w-5 h-5" />,
  diamond: <Crown className="w-5 h-5" />
};

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [upgrading, setUpgrading] = useState(false);

  // Fetch user's loyalty status
  const { data: loyaltyStatus, isLoading }: { data: any; isLoading: boolean } = useQuery({
    queryKey: ['/api/loyalty/user', user?.id, 'status'],
    enabled: !!user,
  });

  // Fetch all available tiers
  const { data: allTiers = [] }: { data: any[] } = useQuery({
    queryKey: ['/api/loyalty/tiers'],
  });

  // Tier upgrade mutation
  const upgradeTierMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/loyalty/upgrade-tier', {});
      if (!response.ok) {
        throw new Error('Failed to upgrade tier');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/loyalty/user'] });
      toast({
        title: 'Tier Upgraded!',
        description: `Congratulations! You've been upgraded to ${data.newTier}`,
      });
      setUpgrading(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Upgrade Failed',
        description: error.message || 'Unable to upgrade tier at this time',
        variant: 'destructive',
      });
      setUpgrading(false);
    }
  });

  const handleUpgradeTier = () => {
    setUpgrading(true);
    upgradeTierMutation.mutate();
  };

  if (isLoading || !loyaltyStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-airline-blue"></div>
      </div>
    );
  }

  const { currentTier, loyaltyPoints, totalMilesFlown, totalSpent, eligibility } = loyaltyStatus;
  const tierColor = tierColors[currentTier.tierName] || '#CD7F32';
  const canUpgrade = eligibility?.qualified;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">Manage your account and loyalty status</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Tier Status */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-2" style={{ borderColor: tierColor }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div 
                    className="p-3 rounded-full text-white"
                    style={{ backgroundColor: tierColor }}
                  >
                    {tierIcons[currentTier.tierName]}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{currentTier.displayName}</h2>
                    <p className="text-sm text-gray-600 font-normal">
                      Member since {new Date(user?.memberSince || '').toLocaleDateString()}
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-airline-blue">
                      {loyaltyPoints.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Total Points</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-airline-blue">
                      {totalMilesFlown.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Miles Flown</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-airline-blue">
                      ${parseFloat(totalSpent).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Total Spent</div>
                  </div>
                </div>

                {/* Tier Benefits */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Gift className="w-5 h-5" />
                    Your Tier Benefits
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {currentTier.benefits.map((benefit: any, index: number) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="text-sm text-green-800">{benefit.description}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Progress to Next Tier */}
                {eligibility?.progressToNext && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Progress to {eligibility.progressToNext.displayName}
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Overall Progress</span>
                        <span className="text-sm font-medium">
                          {Math.round(eligibility.progressToNext.progressPercentage)}%
                        </span>
                      </div>
                      <Progress 
                        value={eligibility.progressToNext.progressPercentage} 
                        className="h-3"
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="font-medium text-gray-900">Points Needed</div>
                          <div className="text-gray-600">
                            {eligibility.progressToNext.pointsNeeded.toLocaleString()} more
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="font-medium text-gray-900">Miles Needed</div>
                          <div className="text-gray-600">
                            {eligibility.progressToNext.milesNeeded.toLocaleString()} more
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="font-medium text-gray-900">Spend Needed</div>
                          <div className="text-gray-600">
                            ${eligibility.progressToNext.spendNeeded.toLocaleString()} more
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upgrade Button */}
                {canUpgrade && (
                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-600 rounded-full text-white">
                          <ArrowUp className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-green-800">
                            Tier Upgrade Available!
                          </div>
                          <div className="text-sm text-green-600">
                            You qualify for {eligibility.suggestedTier} tier
                          </div>
                        </div>
                      </div>
                      <Button 
                        onClick={handleUpgradeTier}
                        disabled={upgrading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {upgrading ? 'Upgrading...' : 'Upgrade Now'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* All Tiers Overview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  All Tiers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {allTiers.map((tier: any) => {
                  const isCurrentTier = tier.tierName === currentTier.tierName;
                  const tierColorStyle = tierColors[tier.tierName] || '#CD7F32';
                  
                  return (
                    <div 
                      key={tier.tierName}
                      className={`p-4 rounded-lg border-2 ${
                        isCurrentTier 
                          ? 'border-solid' 
                          : 'border-dashed border-gray-300'
                      }`}
                      style={isCurrentTier ? { borderColor: tierColorStyle } : {}}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div 
                          className={`p-2 rounded-full text-white ${
                            isCurrentTier ? '' : 'bg-gray-400'
                          }`}
                          style={isCurrentTier ? { backgroundColor: tierColorStyle } : {}}
                        >
                          {tierIcons[tier.tierName]}
                        </div>
                        <div>
                          <div className="font-semibold">{tier.displayName}</div>
                          {isCurrentTier && (
                            <Badge variant="secondary" className="text-xs">
                              Current Tier
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>{tier.minPoints.toLocaleString()}+ points</div>
                        <div>{tier.minMiles.toLocaleString()}+ miles</div>
                        <div>${parseFloat(tier.minSpend).toLocaleString()}+ spent</div>
                        <div>{tier.multiplier}x points multiplier</div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}