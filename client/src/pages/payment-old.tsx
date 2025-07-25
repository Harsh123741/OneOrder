import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
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
  const { items, total, clearCart } = useCart();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [orderData, setOrderData] = useState<any>(null);
  const [selectedSeats, setSelectedSeats] = useState<any[]>([]);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: "credit_card",
      saveCard: false,
      address: user?.address || "",
      city: user?.city || "",
      state: user?.state || "",
      zipCode: user?.zipCode || "",
      country: user?.country || "",
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

    // Get order data from session storage
    const storedOrderData = sessionStorage.getItem("pendingOrderData");
    const storedSeats = sessionStorage.getItem("selectedSeats");
    
    if (storedOrderData) {
      setOrderData(JSON.parse(storedOrderData));
    }
    
    if (storedSeats) {
      setSelectedSeats(JSON.parse(storedSeats));
    }

    if (!storedOrderData && items.length === 0) {
      setLocation("/");
    }
  }, [isAuthenticated, items.length, setLocation]);

  const processPaymentMutation = useMutation({
    mutationFn: async (paymentData: PaymentFormData) => {
      if (orderType === 'booking') {
        // Create new order
        const response = await apiRequest("POST", "/api/orders", {
          ...orderData,
          paymentMethod: paymentData.paymentMethod,
          address: paymentData.address,
          city: paymentData.city,
          state: paymentData.state,
          zipCode: paymentData.zipCode,
          country: paymentData.country,
        });
        return response.json();
      } else {
        // Process service modification payment
        const response = await apiRequest("POST", "/api/orders/payment/services", {
          ...orderData,
          paymentMethod: paymentData.paymentMethod,
        });
        return response.json();
      }
    },
    onSuccess: (data) => {
      // Update user address information
      if (user && form.getValues().address) {
        apiRequest("PATCH", `/api/users/${user.id}`, {
          address: form.getValues().address,
          city: form.getValues().city,
          state: form.getValues().state,
          zipCode: form.getValues().zipCode,
          country: form.getValues().country,
        }).catch(console.error);
      }

      clearCart();
      sessionStorage.removeItem("selectedFlight");
      sessionStorage.removeItem("selectedSeats");
      sessionStorage.removeItem("flightSearch");
      sessionStorage.removeItem("pendingOrderData");
      
      if (orderType === 'booking') {
        setLocation(`/order-success/${data.orderNumber}`);
      } else {
        setLocation(`/service-success/${data.orderNumber}`);
      }
    },
    onError: (error) => {
      toast({
        title: "Payment Failed",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: PaymentFormData) => {
    processPaymentMutation.mutate(data);
  };

  const handleBackToCheckout = () => {
    setLocation("/checkout");
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'credit_card':
        return <CreditCard className="w-5 h-5" />;
      case 'wallet':
        return <Wallet className="w-5 h-5" />;
      case 'bank_transfer':
        return <Building2 className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  if (!orderData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-airline-blue mx-auto mb-4"></div>
          <p>Loading payment information...</p>
        </div>
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
            onClick={handleBackToCheckout}
            className="mb-4 text-airline-blue hover:bg-blue-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Checkout
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Payment Information</h1>
          <p className="text-gray-600 mt-2">Secure payment processing</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Payment Method Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Lock className="w-5 h-5 mr-2" />
                      Payment Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Payment Method</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose payment method" />
                              </SelectTrigger>
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
                                    Wallet Balance
                                  </div>
                                </SelectItem>
                                <SelectItem value="paypal">
                                  <div className="flex items-center">
                                    <CreditCard className="w-4 h-4 mr-2" />
                                    PayPal
                                  </div>
                                </SelectItem>
                                <SelectItem value="bank_transfer">
                                  <div className="flex items-center">
                                    <Building2 className="w-4 h-4 mr-2" />
                                    Bank Transfer
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Credit Card Details */}
                    {form.watch("paymentMethod") === "credit_card" && (
                      <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="cardholderName"
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel>Cardholder Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="John Doe" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="cardNumber"
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel>Card Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="1234 5678 9012 3456" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
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
                          name="saveCard"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Save card for future purchases</FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  Your card details will be securely stored for faster checkout
                                </p>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Wallet Balance Display */}
                    {form.watch("paymentMethod") === "wallet" && (
                      <div className="p-4 border rounded-lg bg-green-50">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Current Wallet Balance:</span>
                          <span className="text-lg font-bold text-green-600">
                            ${user?.walletBalance || "0.00"}
                          </span>
                        </div>
                        {parseFloat(user?.walletBalance || "0") < total && (
                          <p className="text-sm text-red-600 mt-2">
                            Insufficient wallet balance. Please choose another payment method.
                          </p>
                        )}
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
                            <Input placeholder="123 Main Street" {...field} />
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
                              <Input placeholder="New York" {...field} />
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
                              <Input placeholder="NY" {...field} />
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
                              <Input placeholder="10001" {...field} />
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
                              <Input placeholder="United States" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-airline-blue hover:bg-blue-700 text-white py-3"
                  disabled={processPaymentMutation.isPending || 
                    (form.watch("paymentMethod") === "wallet" && parseFloat(user?.walletBalance || "0") < total)}
                >
                  {processPaymentMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing Payment...
                    </div>
                  ) : (
                    `Pay $${total.toFixed(2)}`
                  )}
                </Button>
              </form>
            </Form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      {item.passengerName && (
                        <p className="text-sm text-gray-600">{item.passengerName}</p>
                      )}
                      {item.quantity > 1 && (
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      )}
                    </div>
                    <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
                
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}