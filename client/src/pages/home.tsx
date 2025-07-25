import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import FlightSearchForm from "@/components/flight/flight-search-form";
import OrderCard from "@/components/order/order-card";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Plane, MapPin } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  // Mock popular destinations
  const popularDestinations = [
    {
      city: "Paris",
      country: "France",
      price: 399,
      image: "https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=400&h=300&fit=crop",
    },
    {
      city: "Tokyo",
      country: "Japan", 
      price: 599,
      image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop",
    },
    {
      city: "London",
      country: "United Kingdom",
      price: 459,
      image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop",
    },
    {
      city: "Sydney",
      country: "Australia",
      price: 799,
      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    },
  ];

  // Fetch user orders if authenticated
  const { data: userOrders = [] } = useQuery({
    queryKey: ["/api/orders/user", user?.id],
    enabled: isAuthenticated && !!user?.id,
  });

  const activeOrders = userOrders.filter((order: any) => 
    order.status === 'confirmed' || order.status === 'pending'
  );

  return (
    <div className="min-h-screen">
      {/* Hero Section with Flight Search */}
      <section className="hero-gradient text-white py-20 relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1920&h=800&fit=crop')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
            Your Journey Begins Here
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90 animate-fade-in">
            Discover the world with premium airline services and seamless booking experience
          </p>
        </div>
      </section>

      {/* Flight Search Form */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        <div className="animate-fade-in">
          <FlightSearchForm />
        </div>
      </section>

      {/* Popular Destinations */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Popular Destinations</h2>
          <p className="text-lg text-gray-600">Discover amazing places around the world</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {popularDestinations.map((destination) => (
            <Card key={destination.city} className="group cursor-pointer transform hover:scale-105 transition-transform duration-300 overflow-hidden">
              <div className="relative">
                <img 
                  src={destination.image}
                  alt={`${destination.city}, ${destination.country}`}
                  className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black bg-opacity-30 group-hover:bg-opacity-20 transition-all duration-300"></div>
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="text-lg font-bold">{destination.city}</h3>
                  <p className="text-sm opacity-90">{destination.country}</p>
                  <p className="text-sm font-semibold mt-1">From ${destination.price}</p>
                </div>
                <div className="absolute top-4 right-4">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Active Orders Section - Only show if user is authenticated */}
      {isAuthenticated && activeOrders.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-gray-50">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Your Active Bookings</h2>
            <p className="text-lg text-gray-600">Manage your upcoming trips</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeOrders.slice(0, 3).map((order: any) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
          
          {activeOrders.length > 3 && (
            <div className="text-center mt-8">
              <button className="text-airline-blue hover:text-blue-700 font-medium">
                View all {activeOrders.length} bookings
              </button>
            </div>
          )}
        </section>
      )}

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose SkyLink Airlines?</h2>
          <p className="text-lg text-gray-600">Experience the difference with our premium services</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-16 h-16 bg-airline-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <Plane className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Premium Fleet</h3>
              <p className="text-gray-600">Modern aircraft with the latest technology and comfort features</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🛡️</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Safety First</h3>
              <p className="text-gray-600">Highest safety standards with experienced crew and maintenance</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⭐</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Excellence Service</h3>
              <p className="text-gray-600">Award-winning customer service from booking to arrival</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
