import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import BoardingPass from "@/components/boarding-pass";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Share, Printer } from "lucide-react";

export default function BoardingPassPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [orderNumber, setOrderNumber] = useState<string>("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderParam = urlParams.get('order');
    if (orderParam) {
      setOrderNumber(orderParam);
    } else {
      setLocation('/check-in');
    }
  }, [setLocation]);

  const { data: orderData, isLoading } = useQuery({
    queryKey: ["/api/orders/boarding-pass", orderNumber],
    enabled: !!orderNumber,
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderNumber}`);
      return response.json();
    },
  });

  const { data: flightData } = useQuery({
    queryKey: ["/api/flights", orderData?.flightId],
    enabled: !!orderData?.flightId,
    queryFn: async () => {
      const response = await fetch(`/api/flights/${orderData.flightId}`);
      return response.json();
    },
  });

  const { data: seatData } = useQuery({
    queryKey: ["/api/seats", orderData?.seatId],
    enabled: !!orderData?.seatId,
    queryFn: async () => {
      const response = await fetch(`/api/flights/${orderData.flightId}/seats`);
      const seats = await response.json();
      return seats.find((seat: any) => seat.id === orderData.seatId);
    },
  });

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SkyLink Airlines Boarding Pass',
          text: `Boarding pass for flight ${flightData?.flightNumber}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-airline-blue mx-auto mb-4"></div>
          <p>Loading your boarding pass...</p>
        </div>
      </div>
    );
  }

  if (!orderData || !flightData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle>Boarding Pass Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              We couldn't find your boarding pass. Please check your order number and try again.
            </p>
            <Button onClick={() => setLocation('/check-in')} className="w-full">
              Go to Check-in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation('/check-in')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Check-in
          </Button>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            {navigator.share && (
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share className="w-4 h-4 mr-2" />
                Share
              </Button>
            )}
          </div>
        </div>

        {/* Boarding Pass */}
        <div className="flex justify-center">
          <BoardingPass
            order={orderData}
            flight={flightData}
            seat={seatData}
            user={user}
          />
        </div>

        {/* Additional Information */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Important Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Check-in Complete</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Your seat has been confirmed</li>
                  <li>• Arrive at the airport 2 hours before departure</li>
                  <li>• Gate information will be available 2 hours before departure</li>
                  <li>• Boarding begins 45 minutes before departure</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Next Steps</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Save this boarding pass to your device</li>
                  <li>• Check airport security requirements</li>
                  <li>• Arrive at your departure gate on time</li>
                  <li>• Have your ID ready for security</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}