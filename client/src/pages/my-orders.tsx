import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrderCard from "@/components/order/order-card";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Package, Calendar, CheckCircle, XCircle } from "lucide-react";

export default function MyOrders() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("all");

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ["/api/orders/user", user?.id],
    enabled: isAuthenticated && !!user?.id,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) {
    return null;
  }

  const filterOrdersByStatus = (status: string) => {
    switch (status) {
      case "upcoming":
        return orders.filter((order: any) => 
          order.status === 'confirmed' || order.status === 'pending'
        );
      case "completed":
        return orders.filter((order: any) => 
          order.status === 'completed'
        );
      case "cancelled":
        return orders.filter((order: any) => 
          order.status === 'cancelled'
        );
      default:
        return orders;
    }
  };

  const filteredOrders = filterOrdersByStatus(activeTab);

  const getTabCount = (status: string) => {
    return filterOrdersByStatus(status).length;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-airline-blue mx-auto mb-4"></div>
          <p>Loading your bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
          <p className="text-gray-600">Manage all your flight reservations and services</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Bookings</p>
                <p className="text-xl font-bold text-gray-900">{orders.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Upcoming</p>
                <p className="text-xl font-bold text-gray-900">{getTabCount("upcoming")}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-xl font-bold text-gray-900">{getTabCount("completed")}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Cancelled</p>
                <p className="text-xl font-bold text-gray-900">{getTabCount("cancelled")}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All Bookings ({getTabCount("all")})</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming ({getTabCount("upcoming")})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({getTabCount("completed")})</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled ({getTabCount("cancelled")})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {error && (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-red-600">Error loading bookings. Please try again.</p>
                </CardContent>
              </Card>
            )}

            {!error && filteredOrders.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {activeTab === "all" 
                      ? "No bookings yet" 
                      : `No ${activeTab} bookings`
                    }
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {activeTab === "all" 
                      ? "Start your journey by booking your first flight" 
                      : `You don't have any ${activeTab} bookings at the moment`
                    }
                  </p>
                  {activeTab === "all" && (
                    <Button 
                      onClick={() => setLocation("/")}
                      className="airline-button-primary"
                    >
                      Book a Flight
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {!error && filteredOrders.length > 0 && (
              <div className="space-y-6">
                {filteredOrders.map((order: any) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        {orders.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  onClick={() => setLocation("/")}
                  className="h-16 text-left"
                >
                  <div>
                    <h4 className="font-semibold">Book Another Flight</h4>
                    <p className="text-sm text-gray-600">Search and book new flights</p>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setLocation("/check-in")}
                  className="h-16 text-left"
                >
                  <div>
                    <h4 className="font-semibold">Web Check-in</h4>
                    <p className="text-sm text-gray-600">Check-in for upcoming flights</p>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-16 text-left"
                  onClick={() => {
                    // Navigate to customer service (placeholder)
                    alert("Customer service contact: 1-800-SKYLINK");
                  }}
                >
                  <div>
                    <h4 className="font-semibold">Customer Support</h4>
                    <p className="text-sm text-gray-600">Get help with your bookings</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
