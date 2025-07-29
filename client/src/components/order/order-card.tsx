import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plane, Calendar, Users, CreditCard } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface OrderCardProps {
  order: any;
  onViewDetails?: (order: any) => void; 
  onCheckIn?: (order: any) => void;
  onModify?: (order: any) => void;
  onCancel?: (order: any) => void;
  setLocation?: (location: string) => void;
}

export default function OrderCard({
  order,
  onViewDetails,
  onCheckIn,
  onModify,
  onCancel,
}: OrderCardProps) {
  const [, setLocation] = useLocation();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      case "completed":
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(order);
    } else {
      setLocation(`/order/${order.orderNumber}`);
    }
  };

  const handleCheckIn = () => {
    if (onCheckIn) {
      onCheckIn(order);
    } else {
      setLocation("/check-in");
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel(order);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  // Fetch flight data based on order.flightId
  const { data: flight } = useQuery({
    queryKey: ["/api/flights", order.flightId],
    enabled: !!order.flightId,
  });

  // Get flight information - use flight data if available, otherwise use order details
  const safeFlightInfo = {
    flightNumber: flight?.flightNumber || order.flightNumber || "N/A",
    airline: flight?.airline || order.airline || "N/A",
    departureAirport: flight?.departureAirport || order.departureAirport || "N/A",
    arrivalAirport: flight?.arrivalAirport || order.arrivalAirport || "N/A", 
    departureTime: flight?.departureTime || order.departureTime || new Date().toISOString(),
    duration: flight?.duration || order.duration || "N/A",
  };

  return (
    <Card
      className={`airline-card ${order.canCheckIn ? "border-yellow-200 bg-yellow-50" : ""}`}
    >
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Order #{order.orderNumber}
            </h3>
            <p className="text-sm text-gray-600">
              Booked on {formatDate(order.createdAt)}
            </p>
          </div>
          <div className="text-right">
            {getStatusBadge(order.status)}
            <p className="text-sm text-gray-600 mt-1">
              Total:{" "}
              <span className="font-bold text-lg text-airline-blue">
                ${parseFloat(order.total).toFixed(2)}
              </span>
            </p>
          </div>
        </div>

        {/* Flight Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Plane className="h-4 w-4 text-airline-blue" />
              <span className="font-medium text-gray-900">
                {safeFlightInfo.departureAirport} →{" "}
                {safeFlightInfo.arrivalAirport}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {formatDate(safeFlightInfo.departureTime)} •{" "}
              {formatTime(safeFlightInfo.departureTime)}
            </p>
            <p className="text-sm text-gray-600">
              {safeFlightInfo.airline} {safeFlightInfo.flightNumber}
            </p>
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">Passenger</span>
            </div>
            <p className="font-medium text-gray-900">
              {Array.isArray(order.passengerInfo) 
                ? `${order.passengerInfo[0]?.firstName} ${order.passengerInfo[0]?.lastName}${order.passengerInfo.length > 1 ? ` +${order.passengerInfo.length - 1} more` : ''}`
                : `${order.passengerInfo?.firstName || ''} ${order.passengerInfo?.lastName || ''}`
              }
            </p>
            <p className="text-sm text-gray-600">
              {order.assignedSeats && Array.isArray(order.assignedSeats) && order.assignedSeats.length > 0
                ? `Seats ${order.assignedSeats.map((seat: any) => seat.seatNumber).join(', ')}`
                : order.seatId 
                  ? `Seat ${order.assignedSeats?.[0]?.seatNumber || 'Assigned'}`
                  : "Seat not selected"
              } • Economy
            </p>
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-2">
              <CreditCard className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">Services</span>
            </div>
            <p className="text-sm text-gray-900">
              {(() => {
                let serviceCount = 0;
                if (order.selectedServices?.length) {
                  serviceCount += order.selectedServices.length;
                }
                if (Array.isArray(order.passengerInfo)) {
                  order.passengerInfo.forEach((passenger: any) => {
                    if (passenger.services?.length) {
                      serviceCount += passenger.services.length;
                    }
                  });
                }
                return `${serviceCount} additional services`;
              })()}
            </p>
            {(() => {
              const allServices: string[] = [];
              if (order.selectedServices?.length) {
                allServices.push(...order.selectedServices.map((s: any) => s.name));
              }
              if (Array.isArray(order.passengerInfo)) {
                order.passengerInfo.forEach((passenger: any) => {
                  if (passenger.services?.length) {
                    allServices.push(...passenger.services.map((s: any) => s.name));
                  }
                });
              }
              return allServices.length > 0 && (
                <p className="text-xs text-gray-500">
                  {allServices.slice(0, 2).join(', ')}{allServices.length > 2 ? ` +${allServices.length - 2} more` : ''}
                </p>
              );
            })()}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-3">
          <Button
            variant="outline"
            onClick={handleViewDetails}
            className="text-airline-blue border-airline-blue hover:bg-blue-50"
          >
            View Details
          </Button>

          {order.status === "confirmed" && !order.isCheckedIn && (
            <>
              {order.canCheckIn && (
                <Button
                  onClick={handleCheckIn}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white"
                >
                  Web Check-in
                </Button>
              )}
            </>
          )}

          {order.status === "pending" && (
            <Button
              onClick={handleCancel}
              variant="outline"
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              Cancel Booking
            </Button>
          )}
        </div>

        {/* Check-in Available Notice */}
        {order.canCheckIn && !order.isCheckedIn && (
          <div className="mt-4 p-3 bg-yellow-100 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Check-in now available!</strong> Complete your check-in up
              to 24 hours before departure.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
