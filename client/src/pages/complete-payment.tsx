import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, CreditCard, Wallet, DollarSign, Users, Plane } from "lucide-react";

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

  const completePaymentMutation = useMutation({
    mutationFn: async (paymentData: PaymentFormData) => {
      const response = await apiRequest("POST", `/api/orders/${params?.orderNumber}/complete-payment`, {
        paymentMethod: paymentData.paymentMethod,
        paymentDetails: {
          cardNumber: paymentData.cardNumber,
          expiryDate: paymentData.expiryDate,
          cvv: paymentData.cvv,
          cardholderName: paymentData.cardholderName,
        },
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Completed!",
        description: "Your order has been confirmed and seats have been reserved.",
      });
      
      // Invalidate order queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      
      // Redirect to order details
      setLocation(`/order-details/${data.orderNumber}`);
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "There was an error processing your payment.",
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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
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

  if (!typedOrder || typedOrder.status !== "pending" || typedOrder.paymentStatus !== "pending") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {!order ? "Order Not Found" : "Payment Already Completed"}
          </h1>
          <p className="text-gray-600 mb-4">
            {!order 
              ? "The order you're looking for doesn't exist."
              : "This order has already been paid for and confirmed."
            }
          </p>
          <Button onClick={() => setLocation("/my-orders")}>
            View My Orders
          </Button>
        </div>
      </div>
    );
  }

  const passengerCount = Array.isArray(typedOrder.passengerInfo) ? typedOrder.passengerInfo.length : 1;

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Payment</h1>
          <p className="text-gray-600">Complete your booking payment to confirm your order</p>
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

              <div className="space-y-2">
                <h4 className="font-semibold">Flight Details</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">
                    Flight: <span className="font-medium text-gray-900">{typedOrder.flightNumber}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Route: <span className="font-medium text-gray-900">{typedOrder.route}</span>
                  </div>
                </div>
              </div>

              {typedOrder.selectedServices && typedOrder.selectedServices.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Selected Services</h4>
                  <div className="space-y-1">
                    {typedOrder.selectedServices.map((service: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{service.name}</span>
                        <span>${parseFloat(service.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${parseFloat(typedOrder.subtotal || "0").toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes</span>
                  <span>${parseFloat(typedOrder.taxes || "0").toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg text-airline-blue">
                  <span>Total</span>
                  <span>${parseFloat(typedOrder.total).toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> Seats and services will be reserved only after successful payment completion.
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
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                Wallet Balance (${user?.walletBalance || "0.00"})
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
                              <Input placeholder="1234 5678 9012 3456" {...field} />
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