import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Calendar, Plane, MapPin, Users, CreditCard } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function OrderSuccess() {
  const { orderNumber } = useParams();
  const [, setLocation] = useLocation();

  const { data: order, isLoading } = useQuery({
    queryKey: ["/api/orders", orderNumber],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/orders/${orderNumber}`);
      return response.json();
    },
    enabled: !!orderNumber,
  });

  const { data: flight } = useQuery({
    queryKey: ["/api/flights", order?.flightId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/flights/${order?.flightId}`);
      return response.json();
    },
    enabled: !!order?.flightId,
  });

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-airline-blue mx-auto mb-4"></div>
          <p>Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">Order not found</p>
            <Button onClick={() => setLocation("/")} className="bg-airline-blue hover:bg-blue-700">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-600">Your flight has been successfully booked</p>
        </div>

        {/* Order Details */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Order Confirmation</span>
              <Badge className="bg-green-100 text-green-800">
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Order Number */}
            <div className="text-center p-6 bg-airline-blue/10 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Order Number</p>
              <p className="text-2xl font-bold text-airline-blue">{order.orderNumber}</p>
            </div>

            {/* Flight Information */}
            {flight && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Plane className="w-5 h-5 mr-2" />
                  Flight Details
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Flight</p>
                      <p className="font-semibold">{flight.flightNumber}</p>
                      <p className="text-sm text-gray-600">{flight.airline}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Route</p>
                      <p className="font-semibold">{flight.departureAirport} → {flight.arrivalAirport}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Departure</p>
                      <p className="font-semibold">{formatDate(flight.departureTime)}</p>
                      <p className="text-sm text-gray-600">{formatTime(flight.departureTime)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Arrival</p>
                      <p className="font-semibold">{formatDate(flight.arrivalTime)}</p>
                      <p className="text-sm text-gray-600">{formatTime(flight.arrivalTime)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Passenger Information & Assigned Seats */}
            {order.passengerInfo && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Passenger Details & Seat Assignments
                </h3>
                <div className="space-y-3">
                  {order.passengerInfo.map((passenger: any, index: number) => {
                    const assignedSeat = order.assignedSeats?.find((seat: any) => seat.passengerId === index);
                    return (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{passenger.firstName} {passenger.lastName}</p>
                            <p className="text-sm text-gray-600">Passport: {passenger.passportNumber}</p>
                            <p className="text-sm text-gray-600">DOB: {passenger.dateOfBirth}</p>
                          </div>
                          {assignedSeat && (
                            <div className="text-right">
                              <p className="font-semibold text-airline-blue">Seat {assignedSeat.seatNumber}</p>
                              <p className="text-sm text-gray-600 capitalize">
                                {assignedSeat.seatClass} • {assignedSeat.seatType}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Services */}
            {order.selectedServices && order.selectedServices.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Selected Services</h3>
                <div className="space-y-2">
                  {order.selectedServices.map((service: any, index: number) => (
                    <div key={index} className="flex justify-between items-center py-2 px-4 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{service.name}</p>
                        {service.passengerName && (
                          <p className="text-sm text-gray-600">{service.passengerName}</p>
                        )}
                      </div>
                      <p className="font-semibold">${service.price}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Payment Summary
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span>Subtotal</span>
                  <span>${order.subtotal}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span>Taxes & Fees</span>
                  <span>${order.taxes}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Paid</span>
                    <span>${order.total}</span>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    Payment Method: {order.paymentMethod.replace('_', ' ').toUpperCase()}
                  </p>
                  <p className="text-sm text-gray-600">
                    Status: <span className="text-green-600 font-medium">Paid</span>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => setLocation(`/order/${order.orderNumber}`)}
            className="bg-airline-blue hover:bg-blue-700"
          >
            View Full Order Details
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/my-orders")}
          >
            View All Orders
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/")}
          >
            Return to Home
          </Button>
        </div>

        {/* Next Steps */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <Calendar className="w-5 h-5 text-airline-blue mt-1" />
              <div>
                <p className="font-semibold">Check-in Online</p>
                <p className="text-sm text-gray-600">
                  Web check-in opens 24 hours before departure. You can select or change your seat during check-in.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 text-airline-blue mt-1" />
              <div>
                <p className="font-semibold">Arrive at Airport</p>
                <p className="text-sm text-gray-600">
                  Please arrive at least 2 hours before domestic flights and 3 hours before international flights.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}