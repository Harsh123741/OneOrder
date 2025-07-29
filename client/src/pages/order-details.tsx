import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useWallet } from "@/contexts/wallet-context";
import { useConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Plane,
  Calendar,
  User,
  CreditCard,
  ArrowLeft,
  Download,
  Edit,
  X,
  Clock,
  MapPin,
  Lock,
  Wallet,
  Shield,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function OrderDetails() {
  const { orderNumber } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { balance, refreshBalance } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { ConfirmationDialog, showConfirmation } = useConfirmationDialog();

  const {
    data: order,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/orders", orderNumber],
    enabled: !!orderNumber && isAuthenticated,
  });

  const { data: flight } = useQuery({
    queryKey: ["/api/flights", order?.flightId],
    enabled: !!order?.flightId,
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await apiRequest("DELETE", `/api/orders/${orderId}`);
      return response.json();
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/orders/user", user?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      await refreshBalance(); // Update wallet balance immediately
      // Force a second refresh after a short delay to ensure balance is updated
      setTimeout(() => refreshBalance(), 500);
      
      // Show appropriate message based on refund details
      if (data.refundDetails) {
        toast({
          title: "Order Cancelled",
          description: `Refunded $${data.refundDetails.refundedAmount} to your wallet. Fare hold fees ($${data.refundDetails.fareHoldDeduction}) are non-refundable.`,
        });
      } else {
        toast({
          title: "Order Cancelled",
          description: "Your order has been cancelled and full refund has been processed to your wallet.",
        });
      }
      setLocation("/my-orders");
    },
    onError: () => {
      toast({
        title: "Cancellation Failed",
        description: "Unable to cancel order. Please contact customer service.",
        variant: "destructive",
      });
    },
  });

  const handleCancel = async () => {
    if (!order) return;

    // Check if order contains fare hold services
    const hasFareHold = checkForFareHoldServices(order);
    
    const description = hasFareHold 
      ? "Are you sure you want to cancel this order? Please note: Fare hold protection fees are non-refundable. All other charges will be refunded to your wallet."
      : "Are you sure you want to cancel this order? You will receive a full refund in your wallet.";

    const confirmed = await showConfirmation({
      title: "Cancel Order",
      description,
      confirmText: "Yes, Cancel Order",
      cancelText: "Keep Order",
      variant: "destructive",
    });

    if (confirmed) {
      cancelOrderMutation.mutate(order.id);
    }
  };

  // Helper function to check for fare hold services
  const checkForFareHoldServices = (order: any) => {
    // Check selectedServices
    if (order.selectedServices && Array.isArray(order.selectedServices)) {
      const hasFareHoldInSelected = order.selectedServices.some((service: any) => 
        service.name?.includes("Fare Hold") || 
        service.name === "24-Hour Fare Hold Protection" ||
        service.details?.serviceType === "fare_protection"
      );
      if (hasFareHoldInSelected) return true;
    }

    // Check passenger-specific services
    if (order.passengerInfo && Array.isArray(order.passengerInfo)) {
      const hasFareHoldInPassengers = order.passengerInfo.some((passenger: any) => {
        if (passenger.services && Array.isArray(passenger.services)) {
          return passenger.services.some((service: any) => 
            service.name?.includes("Fare Hold") || 
            service.name === "24-Hour Fare Hold Protection" ||
            service.details?.serviceType === "fare_protection"
          );
        }
        return false;
      });
      if (hasFareHoldInPassengers) return true;
    }

    return false;
  };

  const [showAddServices, setShowAddServices] = useState(false);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [selectedPassengerServices, setSelectedPassengerServices] = useState<{
    [key: number]: any[];
  }>({});
  const [currentServicePassenger, setCurrentServicePassenger] =
    useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("credit_card");
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
    billingAddress: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  });

  // Payment timer state
  const [paymentTimer, setPaymentTimer] = useState<{
    isExpired: boolean;
    remainingMinutes: number;
    remainingSeconds: number;
  } | null>(null);

  // Calculate remaining payment time for pending orders using paymentExpiresAt
  useEffect(() => {
    if ((order?.status === "pending_payment" || order?.status === "pending") && order?.paymentExpiresAt) {
      const updateTimer = () => {
        const expiresAt = new Date(order.paymentExpiresAt);
        const currentTime = new Date();
        const remainingTime = Math.max(0, expiresAt.getTime() - currentTime.getTime());
        const remainingMinutes = remainingTime / (1000 * 60);
        const isExpired = remainingMinutes <= 0;
        
        setPaymentTimer({
          isExpired,
          remainingMinutes: Math.floor(remainingMinutes),
          remainingSeconds: Math.floor((remainingMinutes % 1) * 60)
        });
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setPaymentTimer(null);
    }
  }, [order?.status, order?.paymentExpiresAt]);

  const { data: services } = useQuery({
    queryKey: ["/api/services"],
    enabled: showAddServices,
  });

  // Payment method options
  const paymentMethods = [
    { value: "credit_card", label: "Credit Card", icon: CreditCard },
    { value: "debit_card", label: "Debit Card", icon: CreditCard },
    { value: "wallet", label: "Wallet", icon: Wallet },
    { value: "bank_transfer", label: "Bank Transfer", icon: User },
    { value: "upi", label: "UPI Payment", icon: User },
  ];

  const addServicesMutation = useMutation({
    mutationFn: async ({
      services,
      paymentMethod,
      paymentDetails,
    }: {
      services: any[];
      paymentMethod: string;
      paymentDetails?: any;
    }) => {
      const response = await apiRequest(
        "POST",
        `/api/orders/${orderNumber}/add-services`,
        {
          services: services.map((service) => ({
            id: service.id,
            quantity: service.quantity || 1,
            passengerId: service.passengerId,
          })),
          paymentMethod,
          paymentDetails,
        },
      );
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      refreshBalance(); // Update wallet balance immediately
      setShowAddServices(false);
      setSelectedServices([]);
      toast({
        title: "Services Added Successfully",
        description: `${data.addedServices.length} service(s) added. Payment of $${data.paymentDetails.amount} processed via ${paymentMethods.find((m) => m.value === data.paymentDetails.method)?.label || data.paymentDetails.method}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Services",
        description:
          error.message || "Please try again or contact customer service.",
        variant: "destructive",
      });
    },
  });

  const removeServiceMutation = useMutation({
    mutationFn: async ({
      serviceId,
      passengerId,
    }: {
      serviceId: number;
      passengerId?: number;
    }) => {
      const response = await apiRequest(
        "POST",
        `/api/orders/${orderNumber}/remove-service`,
        {
          serviceId,
          passengerId,
        },
      );
      return response.json();
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderNumber] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      await refreshBalance(); // Update wallet balance immediately
      // Force a second refresh after a short delay to ensure balance is updated
      setTimeout(() => refreshBalance(), 500);
      toast({
        title: "Service Removed",
        description: `Service removed successfully. Refund processed to your wallet.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Remove Service",
        description:
          error?.message || "Please try again or contact customer service.",
        variant: "destructive",
      });
    },
  });

  const handleModify = () => {
    setShowAddServices(true);
  };

  const handleServiceToggle = (service: any) => {
    const exists = selectedServices.find((s) => s.id === service.id);
    if (exists) {
      setSelectedServices((prev) => prev.filter((s) => s.id !== service.id));
    } else {
      setSelectedServices((prev) => [...prev, { ...service, quantity: 1 }]);
    }
  };

  const handlePassengerServiceToggle = (
    service: any,
    passengerIndex: number,
  ) => {
    const currentPassengerServices =
      selectedPassengerServices[passengerIndex] || [];
    const exists = currentPassengerServices.find(
      (s: any) => s.id === service.id,
    );

    if (exists) {
      setSelectedPassengerServices((prev) => ({
        ...prev,
        [passengerIndex]: currentPassengerServices.filter(
          (s: any) => s.id !== service.id,
        ),
      }));
    } else {
      setSelectedPassengerServices((prev) => ({
        ...prev,
        [passengerIndex]: [
          ...currentPassengerServices,
          { ...service, quantity: 1, passengerId: passengerIndex },
        ],
      }));
    }
  };

  const getPassengerServicesTotal = () => {
    return Object.values(selectedPassengerServices)
      .flat()
      .reduce((total, service: any) => total + parseFloat(service.price), 0);
  };

  const handleAddSelectedServices = () => {
    const allSelectedServices = Object.values(selectedPassengerServices).flat();
    if (allSelectedServices.length > 0) {
      if (paymentMethod === "credit_card" || paymentMethod === "debit_card") {
        setShowPaymentDetails(true);
      } else {
        addServicesMutation.mutate({
          services: allSelectedServices,
          paymentMethod,
          paymentDetails: null,
        });
      }
    }
  };

  const handlePaymentDetailsSubmit = () => {
    const allSelectedServices = Object.values(selectedPassengerServices).flat();
    addServicesMutation.mutate({
      services: allSelectedServices,
      paymentMethod,
      paymentDetails,
    });
    setShowPaymentDetails(false);
  };

  const isPaymentFormValid = () => {
    if (paymentMethod === "credit_card" || paymentMethod === "debit_card") {
      return (
        paymentDetails.cardNumber &&
        paymentDetails.expiryDate &&
        paymentDetails.cvv &&
        paymentDetails.cardholderName &&
        paymentDetails.billingAddress &&
        paymentDetails.city &&
        paymentDetails.state &&
        paymentDetails.zipCode &&
        paymentDetails.country
      );
    }
    return true;
  };

  const handleRemoveService = async (
    serviceId: number,
    passengerId?: number,
  ) => {
    const confirmed = await showConfirmation({
      title: "Remove Service",
      description:
        "Are you sure you want to remove this service? You will receive a full refund in your wallet.",
      confirmText: "Yes, Remove Service",
      cancelText: "Keep Service",
      variant: "destructive",
    });

    if (confirmed) {
      removeServiceMutation.mutate({ serviceId, passengerId });
    }
  };

  const getTotalAdditionalCost = () => {
    return selectedServices.reduce(
      (total, service) =>
        total + parseFloat(service.price) * (service.quantity || 1),
      0,
    );
  };

  const handleDownloadTicket = () => {
    // Download e-ticket (placeholder)
    toast({
      title: "Download Started",
      description: "Your e-ticket is being downloaded.",
    });
  };

  const handleCheckIn = () => {
    setLocation("/check-in");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "pending_payment":
        return <Badge className="bg-orange-100 text-orange-800">Pending Payment</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      case "order_expired":
        return <Badge className="bg-gray-100 text-gray-800">Order Expired</Badge>;
      case "completed":
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

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

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Order Not Found
            </h2>
            <p className="text-gray-600 mb-4">
              The order you're looking for doesn't exist or you don't have
              permission to view it.
            </p>
            <Button onClick={() => setLocation("/my-orders")}>
              Go to My Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/my-orders")}
            className="mb-4 text-airline-blue hover:bg-blue-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Orders
          </Button>
        </div>

        {/* Order Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Order #{order?.orderNumber}
                </h1>
                <p className="text-gray-600">
                  Booked on{" "}
                  {order?.createdAt ? formatDate(order.createdAt) : ""}
                </p>
              </div>
              <div className="text-right">
                {order?.status ? getStatusBadge(order.status) : null}
                <p className="text-sm text-gray-600 mt-1">
                  Total:{" "}
                  <span className="font-bold text-lg text-airline-blue">
                    $
                    {order?.total ? parseFloat(order.total).toFixed(2) : "0.00"}
                  </span>
                </p>

                {/* Complete Payment Button for Pending Orders */}
                {order?.status === "pending" &&
                  order?.paymentStatus === "pending" && (
                    <>
                      <Button
                        onClick={() =>
                          setLocation(`/complete-payment/${order.orderNumber}`)
                        }
                        className="mt-3 bg-green-600 hover:bg-green-700 text-white"
                        disabled={paymentTimer?.isExpired}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        {paymentTimer?.isExpired ? "Payment Expired" : "Complete Payment"}
                      </Button>
                      
                      {/* Payment Timer Display */}
                      {paymentTimer && !paymentTimer.isExpired && (
                        <p className="text-xs text-orange-600 mt-1">
                          Payment expires in: {paymentTimer.remainingMinutes}m {paymentTimer.remainingSeconds}s
                        </p>
                      )}
                      
                      {paymentTimer?.isExpired && (
                        <p className="text-xs text-red-600 mt-1">
                          Payment window expired - please create a new booking
                        </p>
                      )}
                    </>
                  )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Flight Details */}
        {flight && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Flight Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Plane className="h-4 w-4 text-airline-blue" />
                      <span className="text-sm text-gray-600">From</span>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {flight?.departureAirport}
                    </p>
                    <p className="text-sm text-gray-600">
                      {flight?.departureTime
                        ? formatDate(flight.departureTime)
                        : ""}{" "}
                      •{" "}
                      {flight?.departureTime
                        ? formatTime(flight.departureTime)
                        : ""}
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Clock className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-600">
                        Flight Duration
                      </span>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 bg-airline-blue rounded-full"></div>
                      <div className="flex-1 border-t border-gray-300 mx-2"></div>
                      <Plane className="h-4 w-4 text-airline-blue" />
                      <div className="flex-1 border-t border-gray-300 mx-2"></div>
                      <div className="w-4 h-4 bg-airline-blue rounded-full"></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {flight?.duration}{" "}
                      {flight?.stops === 0
                        ? "Direct"
                        : `${flight?.stops} Stop${flight?.stops && flight.stops > 1 ? "s" : ""}`}
                    </p>
                  </div>

                  <div className="text-right md:text-left">
                    <div className="flex items-center justify-end md:justify-start space-x-2 mb-2">
                      <MapPin className="h-4 w-4 text-airline-blue" />
                      <span className="text-sm text-gray-600">To</span>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {flight?.arrivalAirport}
                    </p>
                    <p className="text-sm text-gray-600">
                      {flight?.arrivalTime
                        ? formatDate(flight.arrivalTime)
                        : ""}{" "}
                      •{" "}
                      {flight?.arrivalTime
                        ? formatTime(flight.arrivalTime)
                        : ""}
                    </p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Flight</span>
                    <p className="font-medium">
                      {flight?.airline} {flight?.flightNumber}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Aircraft</span>
                    <p className="font-medium">{flight?.aircraft}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Class</span>
                    <p className="font-medium capitalize">
                      {flight?.class ? flight.class.replace("_", " ") : ""}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Multi-Passenger Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              Passenger Information (
              {Array.isArray(order?.passengerInfo)
                ? order.passengerInfo.length
                : 1}{" "}
              passenger
              {Array.isArray(order?.passengerInfo) &&
              order.passengerInfo.length > 1
                ? "s"
                : ""}
              )
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              // Handle both array and single passenger formats
              const passengers = Array.isArray(order?.passengerInfo)
                ? order.passengerInfo
                : order?.passengerInfo
                  ? [order.passengerInfo]
                  : [];

              return passengers.map((passenger: any, index: number) => (
                <div
                  key={index}
                  className={`bg-gray-50 rounded-lg p-4
                  ${index > 0 ? "mt-4" : ""}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-lg text-gray-900">
                      Passenger {index + 1}
                    </h4>
                    <Badge
                      variant="outline"
                      className="text-airline-blue border-airline-blue"
                    >
                      {passenger.firstName} {passenger.lastName}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-gray-600">Name</span>
                      <p className="font-medium">
                        {passenger.firstName} {passenger.lastName}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Email</span>
                      <p className="font-medium">{passenger.email}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Phone</span>
                      <p className="font-medium">{passenger.phone}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-gray-600">
                        Date of Birth
                      </span>
                      <p className="font-medium">
                        {passenger.dateOfBirth
                          ? formatDate(passenger.dateOfBirth)
                          : "Not provided"}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Gender</span>
                      <p className="font-medium capitalize">
                        {passenger.gender || "Not specified"}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Nationality</span>
                      <p className="font-medium">
                        {passenger.nationality?.toUpperCase() ||
                          "Not specified"}
                      </p>
                    </div>
                  </div>

                  {passenger.passportNumber && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <span className="text-sm text-gray-600">
                          Passport Number
                        </span>
                        <p className="font-medium">
                          {passenger.passportNumber}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">
                          Passport Expiry
                        </span>
                        <p className="font-medium">
                          {passenger.passportExpiry
                            ? formatDate(passenger.passportExpiry)
                            : "Not provided"}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-3">
                    <span className="text-sm text-gray-600">
                      Seat Assignment
                    </span>
                    <p className="font-medium">
                      {passenger.seatNumber
                        ? `Seat ${passenger.seatNumber} (${passenger.seatClass || "Economy"})`
                        : "Will be assigned at check-in"}
                    </p>
                  </div>

                  {/* Individual Passenger Services */}
                  {passenger.services &&
                  Array.isArray(passenger.services) &&
                  passenger.services.length > 0 ? (
                    <div className="border-t pt-3 mt-3">
                      <span className="text-sm text-gray-600 block mb-2">
                        Services for {passenger.firstName}
                      </span>
                      <div className="space-y-1">
                        {passenger.services.map(
                          (service: any, serviceIndex: number) => (
                            <div
                              key={serviceIndex}
                              className="flex justify-between text-sm"
                            >
                              <span>
                                {service.name}{" "}
                                {service.quantity > 1 &&
                                  `(x${service.quantity})`}
                              </span>
                              <span className="font-medium">
                                $
                                {(
                                  parseFloat(service.price) * service.quantity
                                ).toFixed(2)}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  ) : (
                    passengers.length === 1 &&
                    order.selectedServices &&
                    Array.isArray(order.selectedServices) &&
                    order.selectedServices.length > 0 && (
                      <div className="border-t pt-3 mt-3">
                        <span className="text-sm text-gray-600 block mb-2">
                          Selected Services
                        </span>
                        <div className="space-y-1">
                          {order.selectedServices.map(
                            (service: any, serviceIndex: number) => (
                              <div
                                key={serviceIndex}
                                className="flex justify-between text-sm"
                              >
                                <span>
                                  {service.name}{" "}
                                  {service.quantity > 1 &&
                                    `(x${service.quantity})`}
                                </span>
                                <span className="font-medium">
                                  $
                                  {(
                                    parseFloat(service.price) * service.quantity
                                  ).toFixed(2)}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              ));
            })()}
          </CardContent>
        </Card>

        {/* Services & Add-ons - Organized by Passenger */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Additional Services</CardTitle>
              {(order as any)?.status === "confirmed" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleModify}
                  className="border-airline-blue text-airline-blue hover:bg-airline-blue hover:text-white"
                >
                  Add Services
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const passengers = (order as any)?.passengerInfo || [
                { firstName: "Guest", lastName: "Passenger" },
              ];

              // Get common services (fare hold, etc.) from selectedServices or cart-based services
              const commonServices = (
                (order as any)?.selectedServices || []
              ).filter(
                (service: any) =>
                  service.name?.includes("Fare Hold") ||
                  service.details?.serviceType === "fare_protection" ||
                  service.details?.isCommonService === true,
              );

              // Check if any passenger has services
              const hasPassengerServices = passengers.some(
                (passenger: any) =>
                  passenger.services &&
                  Array.isArray(passenger.services) &&
                  passenger.services.length > 0,
              );

              // Check for other selected services (non-common)
              const hasOtherServices =
                (order as any)?.selectedServices &&
                (order as any).selectedServices.length > 0 &&
                (order as any).selectedServices.some(
                  (service: any) =>
                    !service.name?.includes("Fare Hold") &&
                    service.details?.serviceType !== "fare_protection" &&
                    service.details?.isCommonService !== true,
                );

              const hasAnyServices =
                hasPassengerServices ||
                hasOtherServices ||
                commonServices.length > 0;

              if (!hasAnyServices) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    <p>No additional services selected</p>
                    {(order as any)?.status === "confirmed" && (
                      <p className="text-sm mt-2">
                        You can add services to enhance your travel experience
                      </p>
                    )}
                  </div>
                );
              }

              return (
                <div className="space-y-6">
                  {/* Common Services Section */}
                  {commonServices.length > 0 && (
                    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                        <Shield className="w-4 h-4" />
                        Travel Protection & Common Services
                      </h4>
                      <div className="space-y-3">
                        {commonServices.map(
                          (service: any, serviceIndex: number) => (
                            <div
                              key={serviceIndex}
                              className="flex items-center justify-between py-3 px-4 bg-white rounded-lg border"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                  <Shield className="text-white w-4 h-4" />
                                </div>
                                <div>
                                  <span className="font-medium">
                                    {service.name}
                                  </span>
                                  {service.quantity > 1 && (
                                    <span className="text-sm text-gray-600 ml-2">
                                      x{service.quantity}
                                    </span>
                                  )}
                                  <p className="text-sm text-gray-600">
                                    {service.description}
                                  </p>
                                  {service.details?.passengerCount && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs mt-1"
                                    >
                                      Covers all{" "}
                                      {service.details.passengerCount} passenger
                                      {service.details.passengerCount !== 1
                                        ? "s"
                                        : ""}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span className="font-semibold text-blue-600">
                                  $
                                  {(
                                    parseFloat(service.price) *
                                    (service.quantity || 1)
                                  ).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  {/* Passenger-Specific Services */}
                  {passengers.map((passenger: any, passengerIndex: number) => {
                    // Get services for this passenger
                    const passengerServices =
                      passenger.services && Array.isArray(passenger.services)
                        ? passenger.services
                        : passengers.length === 1 &&
                            (order as any)?.selectedServices
                          ? (order as any).selectedServices
                          : [];

                    if (!passengerServices || passengerServices.length === 0) {
                      return null;
                    }

                    return (
                      <div
                        key={passengerIndex}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            {passenger.firstName} {passenger.lastName}
                          </h4>
                          <Badge variant="secondary" className="text-xs">
                            {passengerServices.length} service
                            {passengerServices.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>

                        <div className="space-y-3">
                          {passengerServices.map(
                            (service: any, serviceIndex: number) => (
                              <div
                                key={serviceIndex}
                                className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg"
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-airline-blue rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs">
                                      ✓
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-medium">
                                      {service.name}
                                    </span>
                                    {service.quantity > 1 && (
                                      <span className="text-sm text-gray-600 ml-2">
                                        x{service.quantity}
                                      </span>
                                    )}
                                    {service.phase && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs ml-2"
                                      >
                                        {service.phase}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <span className="font-semibold text-airline-blue">
                                    $
                                    {(
                                      parseFloat(service.price) *
                                      (service.quantity || 1)
                                    ).toFixed(2)}
                                  </span>
                                  {(order as any)?.status === "confirmed" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        handleRemoveService(
                                          service.id,
                                          passengerIndex,
                                        )
                                      }
                                      disabled={removeServiceMutation.isPending}
                                      className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                                    >
                                      Remove
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Add Services Modal with Passenger Selection */}
        {showAddServices && (
          <Card className="mb-6 border-airline-blue">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add Services to Your Booking</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddServices(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {services && services.length > 0 ? (
                <div className="space-y-6">
                  {/* Passenger Selection Tabs */}
                  {(() => {
                    const passengers = (order as any)?.passengerInfo || [
                      { firstName: "Guest", lastName: "Passenger" },
                    ];

                    return (
                      <div>
                        <div className="flex space-x-2 mb-6 border-b">
                          {passengers.map((passenger: any, index: number) => (
                            <Button
                              key={index}
                              variant={
                                currentServicePassenger === index
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() => setCurrentServicePassenger(index)}
                              className="flex-1 mb-2"
                            >
                              {passenger.firstName} {passenger.lastName}
                              {selectedPassengerServices[index] &&
                                selectedPassengerServices[index].length > 0 && (
                                  <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                    {selectedPassengerServices[index].length}
                                  </span>
                                )}
                            </Button>
                          ))}
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg mb-4">
                          <h4 className="font-semibold text-blue-900">
                            Selecting services for:{" "}
                            {passengers[currentServicePassenger]?.firstName}{" "}
                            {passengers[currentServicePassenger]?.lastName}
                          </h4>
                          <p className="text-sm text-blue-700">
                            Choose services that will be assigned specifically
                            to this passenger.
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Services by Phase */}
                  <div className="space-y-6">
                    {(() => {
                      // Filter out fare hold services (booking-time only services)
                      const filteredServices = services.filter(
                        (service: any) =>
                          !service.name?.includes("Fare Hold") &&
                          service.name !== "24-Hour Fare Hold Protection",
                      );

                      const servicesByPhase = filteredServices.reduce(
                        (acc: any, service: any) => {
                          if (!acc[service.phase]) acc[service.phase] = [];
                          acc[service.phase].push(service);
                          return acc;
                        },
                        {},
                      );

                      return Object.entries(servicesByPhase).map(
                        ([phase, phaseServices]: [string, any]) => (
                          <div key={phase} className="border rounded-lg p-4">
                            <h3 className="font-semibold text-gray-900 mb-3 capitalize">
                              {phase.replace("_", " ")} Phase Services
                            </h3>
                            <div className="grid gap-3">
                              {(phaseServices as any[]).map((service: any) => {
                                const isSelected = selectedPassengerServices[
                                  currentServicePassenger
                                ]?.find((s: any) => s.id === service.id);
                                return (
                                  <div
                                    key={service.id}
                                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                      isSelected
                                        ? "border-airline-blue bg-blue-50"
                                        : "border-gray-200 hover:border-gray-300"
                                    }`}
                                    onClick={() =>
                                      handlePassengerServiceToggle(
                                        service,
                                        currentServicePassenger,
                                      )
                                    }
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2">
                                          <h4 className="font-semibold">
                                            {service.name}
                                          </h4>
                                          <Badge
                                            variant="secondary"
                                            className="text-xs"
                                          >
                                            {service.phase}
                                          </Badge>
                                          {service.tag && (
                                            <Badge
                                              variant="outline"
                                              className="text-xs"
                                            >
                                              {service.tag.replace("_", " ")}
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">
                                          {service.description}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-bold text-airline-blue">
                                          $
                                          {parseFloat(service.price).toFixed(2)}
                                        </p>
                                        {isSelected && (
                                          <div className="w-5 h-5 bg-airline-blue rounded-full flex items-center justify-center mt-1 ml-auto">
                                            <span className="text-white text-xs">
                                              ✓
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ),
                      );
                    })()}
                  </div>

                  {(() => {
                    const allSelectedServices = Object.values(
                      selectedPassengerServices,
                    ).flat();
                    return (
                      allSelectedServices.length > 0 && (
                        <div className="border-t pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold">
                              Selected Services ({allSelectedServices.length})
                            </h4>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">
                                Cost Breakdown
                              </p>
                              <p className="text-sm">
                                Services: $
                                {getPassengerServicesTotal().toFixed(2)}
                              </p>
                              <p className="text-sm">
                                Taxes: $
                                {(getPassengerServicesTotal() * 0.12).toFixed(
                                  2,
                                )}
                              </p>
                              <p className="font-bold text-airline-blue text-lg">
                                Total: $
                                {(getPassengerServicesTotal() * 1.12).toFixed(
                                  2,
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Show services grouped by passenger */}
                          <div className="space-y-3 mb-4">
                            {Object.entries(selectedPassengerServices).map(
                              ([passengerIndex, services]: [string, any]) => {
                                if (!services || services.length === 0)
                                  return null;
                                const passengers = (order as any)
                                  ?.passengerInfo || [
                                  { firstName: "Guest", lastName: "Passenger" },
                                ];
                                const passenger =
                                  passengers[parseInt(passengerIndex)];

                                return (
                                  <div
                                    key={passengerIndex}
                                    className="bg-gray-50 p-3 rounded-lg"
                                  >
                                    <h5 className="font-medium text-gray-900 mb-2">
                                      {passenger?.firstName}{" "}
                                      {passenger?.lastName}
                                    </h5>
                                    <div className="space-y-1">
                                      {services.map(
                                        (service: any, idx: number) => (
                                          <div
                                            key={idx}
                                            className="flex justify-between text-sm"
                                          >
                                            <span>{service.name}</span>
                                            <span className="font-medium">
                                              $
                                              {parseFloat(
                                                service.price,
                                              ).toFixed(2)}
                                            </span>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                );
                              },
                            )}
                          </div>

                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium text-blue-800 mb-3 block">
                                  Select Payment Method
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {paymentMethods.map((method) => {
                                    const IconComponent = method.icon;
                                    return (
                                      <div
                                        key={method.value}
                                        className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                          paymentMethod === method.value
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 bg-white hover:border-gray-300"
                                        }`}
                                        onClick={() =>
                                          setPaymentMethod(method.value)
                                        }
                                      >
                                        <div className="flex items-center space-x-3">
                                          <IconComponent className="w-5 h-5 text-gray-600" />
                                          <span className="font-medium text-gray-900">
                                            {method.label}
                                          </span>
                                        </div>
                                        {paymentMethod === method.value && (
                                          <div className="mt-2">
                                            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                              <div className="w-2 h-2 bg-white rounded-full"></div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {(paymentMethod === "credit_card" ||
                                paymentMethod === "debit_card") && (
                                <div className="bg-white p-4 rounded-lg border">
                                  <h4 className="font-medium text-gray-900 mb-3">
                                    Card Information
                                  </h4>
                                  <p className="text-xs text-blue-600 mb-3">
                                    <Lock className="w-3 h-3 inline mr-1" />
                                    Your payment information is encrypted and
                                    secure
                                  </p>
                                </div>
                              )}

                              {paymentMethod === "wallet" && (
                                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                  <p className="text-sm text-green-800">
                                    <strong>Wallet Payment:</strong> Amount will
                                    be deducted from your wallet balance.
                                    <br />
                                    <span className="font-medium">
                                      Current balance: ${balance}
                                    </span>
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={handleAddSelectedServices}
                              disabled={
                                addServicesMutation.isPending ||
                                Object.values(selectedPassengerServices).flat()
                                  .length === 0
                              }
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              {addServicesMutation.isPending
                                ? "Processing Payment..."
                                : `Proceed to Payment - $${(getPassengerServicesTotal() * 1.12).toFixed(2)}`}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedServices([]);
                                setSelectedPassengerServices({});
                                setShowAddServices(false);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-airline-blue mx-auto mb-4"></div>
                  <p>Loading available services...</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment Details Modal */}
        {showPaymentDetails && (
          <Dialog
            open={showPaymentDetails}
            onOpenChange={setShowPaymentDetails}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Payment Information
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Payment Summary */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">
                    Payment Summary
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>
                        Services (
                        {Object.values(selectedPassengerServices).flat().length}{" "}
                        items)
                      </span>
                      <span>${getPassengerServicesTotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxes & Fees (12%)</span>
                      <span>
                        ${(getPassengerServicesTotal() * 0.12).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-1">
                      <span>Total Amount</span>
                      <span>
                        ${(getPassengerServicesTotal() * 1.12).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Credit Card Form */}
                {(paymentMethod === "credit_card" ||
                  paymentMethod === "debit_card") && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">
                      Card Information
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cardholder Name
                        </label>
                        <Input
                          placeholder="Full name as on card"
                          value={paymentDetails.cardholderName}
                          onChange={(e) =>
                            setPaymentDetails((prev) => ({
                              ...prev,
                              cardholderName: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Card Number
                        </label>
                        <Input
                          placeholder="1234 5678 9012 3456"
                          value={paymentDetails.cardNumber}
                          onChange={(e) =>
                            setPaymentDetails((prev) => ({
                              ...prev,
                              cardNumber: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Expiry Date
                        </label>
                        <Input
                          placeholder="MM/YY"
                          value={paymentDetails.expiryDate}
                          onChange={(e) =>
                            setPaymentDetails((prev) => ({
                              ...prev,
                              expiryDate: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CVV
                        </label>
                        <Input
                          placeholder="123"
                          value={paymentDetails.cvv}
                          onChange={(e) =>
                            setPaymentDetails((prev) => ({
                              ...prev,
                              cvv: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <Separator />

                    <h4 className="font-semibold text-gray-900">
                      Billing Address
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address
                        </label>
                        <Input
                          placeholder="Street address"
                          value={paymentDetails.billingAddress}
                          onChange={(e) =>
                            setPaymentDetails((prev) => ({
                              ...prev,
                              billingAddress: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City
                        </label>
                        <Input
                          placeholder="City"
                          value={paymentDetails.city}
                          onChange={(e) =>
                            setPaymentDetails((prev) => ({
                              ...prev,
                              city: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          State
                        </label>
                        <Input
                          placeholder="State"
                          value={paymentDetails.state}
                          onChange={(e) =>
                            setPaymentDetails((prev) => ({
                              ...prev,
                              state: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ZIP Code
                        </label>
                        <Input
                          placeholder="ZIP Code"
                          value={paymentDetails.zipCode}
                          onChange={(e) =>
                            setPaymentDetails((prev) => ({
                              ...prev,
                              zipCode: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Country
                        </label>
                        <Input
                          placeholder="Country"
                          value={paymentDetails.country}
                          onChange={(e) =>
                            setPaymentDetails((prev) => ({
                              ...prev,
                              country: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowPaymentDetails(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePaymentDetailsSubmit}
                    disabled={
                      addServicesMutation.isPending || !isPaymentFormValid()
                    }
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {addServicesMutation.isPending
                      ? "Processing..."
                      : `Pay $${(getTotalAdditionalCost() * 1.12).toFixed(2)}`}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Order Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>
                  $
                  {order?.subtotal
                    ? parseFloat(order.subtotal).toFixed(2)
                    : "0.00"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Taxes & Fees</span>
                <span>
                  ${order?.taxes ? parseFloat(order.taxes).toFixed(2) : "0.00"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span className="text-airline-blue">
                  ${order?.total ? parseFloat(order.total).toFixed(2) : "0.00"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Complete Payment Button for Pending Orders */}
          {order?.status === "pending" &&
            order?.paymentStatus === "pending" && (
              <div className="space-y-2">
                <Button
                  onClick={() =>
                    setLocation(`/complete-payment/${order.orderNumber}`)
                  }
                  className="bg-green-600 hover:bg-green-700 text-white w-full"
                  disabled={paymentTimer?.isExpired}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {paymentTimer?.isExpired ? "Payment Expired" : "Complete Payment"}
                </Button>
                
                {/* Payment Timer Display */}
                {paymentTimer && !paymentTimer.isExpired && (
                  <div className="bg-orange-100 border border-orange-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <p className="text-sm text-orange-800">
                        Payment expires in: {paymentTimer.remainingMinutes}m {paymentTimer.remainingSeconds}s
                      </p>
                    </div>
                  </div>
                )}
                
                {paymentTimer?.isExpired && (
                  <div className="bg-red-100 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-red-600" />
                      <p className="text-sm text-red-800">
                        Payment window expired - please create a new booking
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* Confirmed Order Actions */}
          {order?.status === "confirmed" && !order?.isCheckedIn && (
            <>
              <Button
                onClick={handleCheckIn}
                className="bg-yellow-500 hover:bg-yellow-600 text-white"
                disabled={!order?.canCheckIn}
              >
                <Calendar className="w-4 h-4 mr-2" />
                {order?.canCheckIn ? "Web Check-in" : "Check-in Unavailable"}
              </Button>

              <Button
                onClick={handleModify}
                variant="outline"
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                <Edit className="w-4 h-4 mr-2" />
                Modify Services
              </Button>
            </>
          )}

          <Button
            onClick={handleDownloadTicket}
            variant="outline"
            className="text-airline-blue border-airline-blue hover:bg-blue-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Download E-Ticket
          </Button>

          {/* Complete Payment Button below Download E-Ticket for pending orders */}
          {order?.paymentStatus === "pending" && (
            <Button
              onClick={() =>
                setLocation(`/complete-payment/${order.orderNumber}`)
              }
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Complete Payment
            </Button>
          )}

          {(order?.status === "confirmed" || order?.status === "pending") && (
            <Button
              onClick={handleCancel}
              variant="outline"
              className="text-red-600 border-red-600 hover:bg-red-50"
              disabled={cancelOrderMutation.isPending}
            >
              <X className="w-4 h-4 mr-2" />
              {cancelOrderMutation.isPending ? "Cancelling..." : "Cancel Order"}
            </Button>
          )}
        </div>

        {/* Payment Pending Notice */}
        {order?.status === "pending" && order?.paymentStatus === "pending" && (
          <Card className="mt-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-sm text-red-800">
                <strong>Payment Required!</strong> Your order is pending payment
                completion. Seats and services will be reserved once payment is
                processed.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Check-in Available Notice */}
        {order?.canCheckIn && !order?.isCheckedIn && (
          <Card className="mt-6 border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <p className="text-sm text-yellow-800">
                <strong>Check-in now available!</strong> Complete your check-in
                up to 24 hours before departure.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog />
    </div>
  );
}
