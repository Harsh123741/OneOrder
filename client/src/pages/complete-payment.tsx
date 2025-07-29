import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  CreditCard,
  Wallet,
  DollarSign,
  Users,
  Plane,
} from "lucide-react";

const paymentFormSchema = z.object({
  paymentMethod: z.string().min(1, "Payment method is required"),
  cardNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  cvv: z.string().optional(),
  cardholderName: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

export default function CompletePayment() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/complete-payment/:orderNumber");
  const { user } = useAuth();
  const { toast } = useToast();
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      paymentMethod: "",
    },
  });

  const { data: order, isLoading } = useQuery({
    queryKey: [`/api/orders/number/${params?.orderNumber}`],
    enabled: !!params?.orderNumber,
  });

  // Type guard for order
  const typedOrder = order as any;

  // Calculate remaining payment time using paymentExpiresAt
  const getRemainingPaymentTime = () => {
    if (!typedOrder?.paymentExpiresAt) return null;
    
    const expiresAt = new Date(typedOrder.paymentExpiresAt);
    const currentTime = new Date();
    const remainingTime = Math.max(0, expiresAt.getTime() - currentTime.getTime());
    const remainingMinutes = remainingTime / (1000 * 60);
    
    return {
      isExpired: remainingMinutes <= 0,
      remainingMinutes: Math.floor(remainingMinutes),
      remainingSeconds: Math.floor((remainingMinutes % 1) * 60)
    };
  };

  const [paymentTimer, setPaymentTimer] = useState(getRemainingPaymentTime());

  // Update timer every second
  useEffect(() => {
    if (!typedOrder?.paymentExpiresAt) return;
    
    const interval = setInterval(() => {
      const timeInfo = getRemainingPaymentTime();
      setPaymentTimer(timeInfo);
      
      // Redirect if expired
      if (timeInfo?.isExpired) {
        toast({
          title: "Payment Window Expired",
          description: "This order has expired and status updated to Order Expired. Please create a new booking.",
          variant: "destructive",
        });
        setLocation("/my-orders");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [typedOrder?.paymentExpiresAt, setLocation, toast]);

  const completePaymentMutation = useMutation({
    mutationFn: async (paymentData: PaymentFormData) => {
      const response = await apiRequest(
        "POST",
        `/api/orders/${params?.orderNumber}/complete-payment`,
        {
          paymentMethod: paymentData.paymentMethod,
          paymentDetails: {
            cardNumber: paymentData.cardNumber,
            expiryDate: paymentData.expiryDate,
            cvv: paymentData.cvv,
            cardholderName: paymentData.cardholderName,
          },
        },
      );
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Completed!",
        description:
          "Your order has been confirmed and seats have been reserved.",
      });

      // Invalidate order queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });

      // Redirect to order success page
      setLocation(`/order-success/${data.orderNumber}`);
    },
    onError: (error: any) => {
      const errorMessage = error.message || "There was an error processing your payment.";
      
      // Handle payment window expiry
      if (error.message?.includes("Payment window expired")) {
        toast({
          title: "Payment Window Expired",
          description: "This order has expired. Please create a new booking.",
          variant: "destructive",
        });
        setTimeout(() => setLocation("/"), 2000); // Redirect after showing error
        return;
      }
      
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PaymentFormData) => {
    // Validate wallet balance if using wallet payment
    if (data.paymentMethod === "wallet" && user?.walletBalance) {
      const walletBalance = parseFloat(user.walletBalance);
      const orderTotal = parseFloat(typedOrder?.total || "0");
      if (walletBalance < orderTotal) {
        toast({
          title: "Insufficient Funds",
          description: "Your wallet balance is insufficient for this payment.",
          variant: "destructive",
        });
        return;
      }
    }

    completePaymentMutation.mutate(data);
  };

  const watchPaymentMethod = form.watch("paymentMethod");

  useEffect(() => {
    setShowPaymentDetails(watchPaymentMethod === "credit_card");
  }, [watchPaymentMethod]);

  if (!params?.orderNumber) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Order Not Found
          </h1>
          <Button onClick={() => setLocation("/my-orders")}>
            View My Orders
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-airline-blue"></div>
      </div>
    );
  }

  if (!typedOrder || typedOrder.paymentStatus !== "pending") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {!order ? "Order Not Found" : "Payment Already Completed"}
          </h1>
          <p className="text-gray-600 mb-4">
            {!order
              ? "The order you're looking for doesn't exist."
              : "This order has already been paid for and confirmed."}
          </p>
          <Button onClick={() => setLocation("/my-orders")}>
            View My Orders
          </Button>
        </div>
      </div>
    );
  }

  const passengerCount = Array.isArray(typedOrder.passengerInfo)
    ? typedOrder.passengerInfo.length
    : 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => setLocation("/my-orders")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Complete Payment
          </h1>
          <p className="text-gray-600">
            Complete your booking payment to confirm your order
          </p>
          
          {/* Payment Timer */}
          {paymentTimer && !paymentTimer.isExpired && (
            <div className="mt-4 bg-orange-100 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                <p className="text-orange-800 font-medium">
                  Payment window expires in: {paymentTimer.remainingMinutes}m {paymentTimer.remainingSeconds}s
                </p>
              </div>
              <p className="text-orange-700 text-sm mt-1">
                Complete payment within 15 minutes of order creation to secure your booking.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plane className="w-5 h-5 mr-2" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm text-gray-600">Order Number</span>
                <span className="font-semibold">#{typedOrder.orderNumber}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm text-gray-600">Passengers</span>
                <span className="font-semibold flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  {passengerCount}
                </span>
              </div>

              {/* Flight Details */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Flight Details</h4>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                  {typedOrder.flightDetails ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Plane className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-700">
                            {typedOrder.flightDetails.airline} {typedOrder.flightDetails.flightNumber}
                          </span>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          {typedOrder.flightDetails.aircraft || 'Commercial Flight'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">From</div>
                          <div className="font-medium text-gray-900">{typedOrder.flightDetails.departureAirport}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(typedOrder.flightDetails.departureTime).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </div>
                          <div className="text-sm font-medium text-blue-600">
                            {new Date(typedOrder.flightDetails.departureTime).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-gray-500 mb-1">To</div>
                          <div className="font-medium text-gray-900">{typedOrder.flightDetails.arrivalAirport}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(typedOrder.flightDetails.arrivalTime).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </div>
                          <div className="text-sm font-medium text-blue-600">
                            {new Date(typedOrder.flightDetails.arrivalTime).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                        <div className="text-sm text-gray-600">
                          Duration: <span className="font-medium">{typedOrder.flightDetails.duration || 'N/A'}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Class: <span className="font-medium capitalize">
                            {typedOrder.flightDetails.class?.replace('_', ' ') || 'Economy'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Plane className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <div className="text-sm text-gray-500">Flight details not available</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Passenger Information */}
              {typedOrder.passengerInfo && typedOrder.passengerInfo.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Passenger Information</h4>
                  <div className="space-y-2">
                    {typedOrder.passengerInfo.map((passenger: any, index: number) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-gray-600" />
                            <span className="font-medium text-gray-900">
                              {passenger.firstName} {passenger.lastName}
                            </span>
                          </div>
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                            Passenger {index + 1}
                          </span>
                        </div>
                        {passenger.email && (
                          <div className="text-sm text-gray-600 mt-1">{passenger.email}</div>
                        )}
                        {passenger.phone && (
                          <div className="text-sm text-gray-600">{passenger.phone}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Services */}
              {typedOrder.selectedServices && typedOrder.selectedServices.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Selected Services</h4>
                  <div className="space-y-2">
                    {typedOrder.selectedServices.map((service: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{service.name}</div>
                          {service.description && (
                            <div className="text-xs text-gray-600 mt-1">{service.description}</div>
                          )}
                          {service.passengerName && (
                            <div className="text-xs text-blue-600 mt-1">
                              For: {service.passengerName}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">
                            ${parseFloat(service.price).toFixed(2)}
                          </div>
                          {service.phase && (
                            <div className="text-xs text-gray-500 capitalize">
                              {service.phase.replace('_', ' ')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Flight Cost Breakdown */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Cost Breakdown</h4>
                <div className="bg-gray-50 p-3 rounded-lg border space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Base Flight Cost ({passengerCount} passenger{passengerCount > 1 ? 's' : ''})</span>
                    <span className="font-medium">
                      ${((parseFloat(typedOrder.subtotal || "0") - 
                          (typedOrder.selectedServices || []).reduce((sum: number, service: any) => 
                            sum + parseFloat(service.price || "0"), 0))).toFixed(2)}
                    </span>
                  </div>
                  
                  {typedOrder.selectedServices && typedOrder.selectedServices.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Additional Services</span>
                      <span className="font-medium">
                        ${typedOrder.selectedServices.reduce((sum: number, service: any) => 
                          sum + parseFloat(service.price || "0"), 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                  
                  <div className="border-t border-gray-300 pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">${parseFloat(typedOrder.subtotal || "0").toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Taxes & Fees</span>
                      <span className="font-medium">${parseFloat(typedOrder.taxes || "0").toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Final Total */}
              <div className="pt-4 border-t-2 border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-900">Total Amount</span>
                  <span className="text-2xl font-bold text-airline-blue">
                    ${parseFloat(typedOrder.total).toFixed(2)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Includes all taxes and fees
                </div>
              </div>

              {/* Order Status */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-blue-900">Payment Pending</span>
                </div>
                <p className="text-sm text-blue-800 mt-1">
                  Complete payment to confirm your booking and reserve seats.
                </p>
              </div>


            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="credit_card">
                              <div className="flex items-center">
                                <CreditCard className="w-4 h-4 mr-2" />
                                Credit/Debit Card
                              </div>
                            </SelectItem>
                            <SelectItem value="wallet">
                              <div className="flex items-center">
                                <Wallet className="w-4 h-4 mr-2" />
                                Wallet Balance (${user?.walletBalance || "0.00"}
                                )
                              </div>
                            </SelectItem>
                            <SelectItem value="bank_transfer">
                              <div className="flex items-center">
                                <DollarSign className="w-4 h-4 mr-2" />
                                Bank Transfer
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {showPaymentDetails && (
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="cardNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Card Number</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="1234 5678 9012 3456"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="expiryDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Expiry Date</FormLabel>
                              <FormControl>
                                <Input placeholder="MM/YY" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="cvv"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CVV</FormLabel>
                              <FormControl>
                                <Input placeholder="123" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="cardholderName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cardholder Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full airline-button-primary"
                    disabled={completePaymentMutation.isPending}
                  >
                    {completePaymentMutation.isPending ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing Payment...
                      </div>
                    ) : (
                      `Complete Payment - $${parseFloat(typedOrder.total).toFixed(2)}`
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
