import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Lock, CreditCard, Wallet, Building2 } from "lucide-react";

const paymentSchema = z.object({
  paymentMethod: z.enum(["credit_card", "paypal", "wallet", "bank_transfer"]),
  // Credit Card Information (conditional)
  cardNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  cvv: z.string().optional(),
  cardholderName: z.string().optional(),
  saveCard: z.boolean().optional(),
  // Address Information
  address: z.string().min(1, "Please enter address"),
  city: z.string().min(1, "Please enter city"),
  state: z.string().min(1, "Please enter state"),
  zipCode: z.string().min(5, "Please enter ZIP code"),
  country: z.string().min(1, "Please enter country"),
}).refine((data) => {
  if (data.paymentMethod === "credit_card") {
    return data.cardNumber && data.expiryDate && data.cvv && data.cardholderName;
  }
  return true;
}, {
  message: "Credit card information is required for card payments",
  path: ["cardNumber"],
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export default function Payment() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [orderData, setOrderData] = useState<any>(null);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: "credit_card",
      saveCard: false,
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }

    // Get order data from localStorage or URL params
    const urlParams = new URLSearchParams(window.location.search);
    const orderNumber = urlParams.get('orderNumber');
    const storedOrder = localStorage.getItem('pendingOrder');
    
    if (storedOrder) {
      const order = JSON.parse(storedOrder);
      setOrderData(order);
    } else if (orderNumber) {
      // Fetch order by number if not in localStorage
      fetchOrderData(orderNumber);
    } else {
      toast({
        title: "No Order Found",
        description: "Please start your booking from the beginning.",
        variant: "destructive",
      });
      setLocation("/flights");
    }
  }, [isAuthenticated, setLocation, toast]);

  const fetchOrderData = async (orderNumber: string) => {
    try {
      const response = await apiRequest('GET', `/api/orders/number/${orderNumber}`);
      if (response.ok) {
        const order = await response.json();
        setOrderData(order);
      } else {
        throw new Error('Order not found');
      }
    } catch (error) {
      toast({
        title: "Order Not Found",
        description: "The order could not be loaded.",
        variant: "destructive",
      });
      setLocation("/flights");
    }
  };

  const completePaymentMutation = useMutation({
    mutationFn: async (paymentData: PaymentFormData) => {
      if (!orderData) throw new Error("No order data available");
      
      const response = await apiRequest('POST', `/api/orders/${orderData.orderNumber}/complete-payment`, {
        paymentMethod: paymentData.paymentMethod,
        paymentDetails: paymentData,
      });
      
      if (!response.ok) {
        throw new Error('Payment processing failed');
      }
      
      return response.json();
    },
    onSuccess: (order) => {
      // Clear stored order data
      localStorage.removeItem('pendingOrder');
      
      toast({
        title: "Payment Successful",
        description: "Your booking has been confirmed!",
      });
      
      setLocation(`/order-success/${order.orderNumber}`);
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: PaymentFormData) => {
    if (!orderData) {
      toast({
        title: "Error",
        description: "Order information is missing. Please start your booking again.",
        variant: "destructive",
      });
      return;
    }

    // Validate wallet balance if using wallet payment
    if (data.paymentMethod === "wallet" && user?.walletBalance) {
      const walletBalance = parseFloat(user.walletBalance);
      const orderTotal = parseFloat(orderData.total);
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

  if (!orderData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-airline-blue"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => setLocation("/checkout")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Checkout
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Details</h1>
          <p className="text-gray-600">Complete your booking payment</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Payment Information */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CreditCard className="w-5 h-5 mr-2" />
                      Payment Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Choose Payment Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="credit_card">Credit/Debit Card</SelectItem>
                              <SelectItem value="paypal">PayPal</SelectItem>
                              <SelectItem value="wallet">Wallet Balance</SelectItem>
                              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Credit Card Fields */}
                    {form.watch("paymentMethod") === "credit_card" && (
                      <div className="space-y-4 border-t pt-4">
                        <FormField
                          control={form.control}
                          name="cardNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Card Number</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="1234 5678 9012 3456" />
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
                                  <Input {...field} placeholder="MM/YY" />
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
                                  <Input {...field} placeholder="123" />
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
                                <Input {...field} placeholder="John Doe" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Wallet Payment Info */}
                    {form.watch("paymentMethod") === "wallet" && (
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700">
                          Your current wallet balance: ${user?.walletBalance || "0.00"}
                        </p>
                      </div>
                    )}

                    {/* PayPal Info */}
                    {form.watch("paymentMethod") === "paypal" && (
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700">
                          You will be redirected to PayPal to complete your payment.
                        </p>
                      </div>
                    )}

                    {/* Bank Transfer Info */}
                    {form.watch("paymentMethod") === "bank_transfer" && (
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-yellow-700">
                          Bank transfer details will be provided after order confirmation.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Billing Address */}
                <Card>
                  <CardHeader>
                    <CardTitle>Billing Address</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="123 Main Street" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="New York" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="NY" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP Code</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="10001" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="United States" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Submit Button */}
                <Card>
                  <CardContent className="pt-6">
                    <Button
                      type="submit"
                      className="w-full bg-airline-blue hover:bg-blue-700 text-white py-3 text-lg"
                      disabled={completePaymentMutation.isPending}
                    >
                      {completePaymentMutation.isPending ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing Payment...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <Lock className="w-4 h-4 mr-2" />
                          Complete Payment - ${orderData.total}
                        </div>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Order Summary */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Order Number:</span>
                        <span className="font-medium">{orderData.orderNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>${orderData.subtotal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Taxes & Fees:</span>
                        <span>${orderData.taxes}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total:</span>
                        <span className="text-airline-blue">${orderData.total}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}