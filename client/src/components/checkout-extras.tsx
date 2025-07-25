import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import ServiceCardEnhanced from "@/components/services/service-card-enhanced";
import { Plus, Minus, ChevronDown, ChevronUp } from "lucide-react";

export default function CheckoutExtras() {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: bookingServices = [] } = useQuery({
    queryKey: ["/api/services", "booking"],
    queryFn: async () => {
      const response = await fetch(`/api/services?phase=booking`);
      return response.json();
    },
  });

  const { data: preboardingServices = [] } = useQuery({
    queryKey: ["/api/services", "pre_boarding"],
    queryFn: async () => {
      const response = await fetch(`/api/services?phase=pre_boarding`);
      return response.json();
    },
  });

  const quickAddServices = [
    ...bookingServices.slice(0, 3), // Top 3 booking services
    ...preboardingServices.slice(0, 2) // Top 2 pre-boarding services
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Add More Services</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2"
          >
            {isExpanded ? (
              <>
                <span>Show Less</span>
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Show More</span>
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
        <p className="text-sm text-gray-600">
          Enhance your journey with these popular services
        </p>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Quick Add Services */}
          <div>
            <h4 className="font-medium mb-3 text-sm text-gray-700">RECOMMENDED</h4>
            <div className="grid gap-3">
              {quickAddServices.slice(0, isExpanded ? quickAddServices.length : 3).map((service: any) => (
                <div key={service.id} className="border rounded-lg p-3">
                  <ServiceCardEnhanced 
                    service={service} 
                    phase={service.phase}
                  />
                </div>
              ))}
            </div>
          </div>

          {isExpanded && (
            <>
              <Separator />
              
              {/* Seat Add-ons */}
              <div>
                <h4 className="font-medium mb-3 text-sm text-gray-700">SEAT UPGRADES</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Priority Seat Selection</p>
                      <p className="text-sm text-gray-600">Choose from the best available seats</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-airline-blue">$15.00</span>
                      <Button size="sm" variant="outline">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Emergency Exit Row</p>
                      <p className="text-sm text-gray-600">Maximum legroom and easy exit access</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-airline-blue">$45.00</span>
                      <Button size="sm" variant="outline">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />
              
              {/* Travel Protection */}
              <div>
                <h4 className="font-medium mb-3 text-sm text-gray-700">TRAVEL PROTECTION</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Trip Cancellation Insurance</p>
                      <p className="text-sm text-gray-600">Full refund if you need to cancel</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-airline-blue">$49.00</span>
                      <Button size="sm" variant="outline">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}