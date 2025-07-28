import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";

interface FareHoldDetectionResult {
  shouldShowModal: boolean;
  currentPrice: number;
  originalPrice?: number;
  priceIncrease: number;
  increasePercentage: number;
  existingHold?: any;
  showModal: () => void;
  hideModal: () => void;
}

export function useFareHoldDetection(flightId: number): FareHoldDetectionResult {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const { user } = useAuthStore();

  // Get current dynamic pricing
  const { data: currentPricing } = useQuery({
    queryKey: [`/api/pricing/flight/${flightId}`],
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Get price history
  const { data: priceHistoryData } = useQuery({
    queryKey: [`/api/pricing/history/flight/${flightId}/hours=24`],
    refetchInterval: 60000, // Check every minute
  });

  // Check for existing fare hold
  const { data: existingHold } = useQuery({
    queryKey: [`/api/fare-hold/${flightId}`],
    enabled: !!user?.id,
  });

  const currentPrice = currentPricing?.currentPrice 
    ? parseFloat(currentPricing.currentPrice) 
    : 0;

  // Track price changes over time
  useEffect(() => {
    if (currentPrice > 0) {
      setPriceHistory(prev => {
        const newHistory = [...prev, currentPrice];
        // Keep only last 10 price points
        return newHistory.slice(-10);
      });
    }
  }, [currentPrice]);

  // Determine if we should show the modal
  const originalPrice = priceHistory.length > 3 ? priceHistory[0] : undefined;
  const priceIncrease = originalPrice ? currentPrice - originalPrice : 0;
  const increasePercentage = originalPrice ? (priceIncrease / originalPrice) * 100 : 0;

  // Show modal if:
  // 1. User is logged in
  // 2. Price increased by more than $25 OR 5%
  // 3. No existing fare hold
  // 4. Modal is not already shown
  const shouldAutoShow = !!(
    user?.id &&
    !existingHold &&
    priceIncrease > 25 ||
    increasePercentage > 5
  );

  const showModal = () => setIsModalOpen(true);
  const hideModal = () => setIsModalOpen(false);

  return {
    shouldShowModal: isModalOpen || shouldAutoShow,
    currentPrice,
    originalPrice,
    priceIncrease,
    increasePercentage,
    existingHold,
    showModal,
    hideModal,
  };
}