import { useState, useEffect } from "react";
import { useLocation } from "wouter";
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
import { Progress } from "@/components/ui/progress";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Lock, CreditCard } from "lucide-react";
import CheckoutExtras from "@/components/checkout-extras";

const passengerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  passportNumber: z.string().min(6, "Please enter passport number"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  passportExpiry: z.string().min(1, "Please enter passport expiry date"),
});

const checkoutSchema = z.object({
  passengers: z.array(passengerSchema),
  agreeTerms: z.boolean().refine(val => val === true, "You must agree to terms and conditions"),
  agreePrivacy: z.boolean().refine(val => val === true, "You must agree to privacy policy"),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { items, total, clearCart } = useCart();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedFlight, setSelectedFlight] = useState<any>(null);
  const [selectedSeats, setSelectedSeats] = useState<any[]>([]);
  const [passengerCount, setPassengerCount] = useState(1);
  const [currentPassengerForm, setCurrentPassengerForm] = useState(0);

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      passengers: [],
      agreeTerms: false,
      agreePrivacy: false,
    },
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }

    const storedFlight = sessionStorage.getItem("selectedFlight");
    const storedSeats = sessionStorage.getItem("selectedSeats");
    const storedSearch = sessionStorage.getItem("flightSearch");
    
    if (storedFlight) {
      setSelectedFlight(JSON.parse(storedFlight));
    }
    
    if (storedSeats) {
      setSelectedSeats(JSON.parse(storedSeats));
    }
    
    if (storedSearch) {
      const searchParams = JSON.parse(storedSearch);
      const count = searchParams.passengers || 1;
      setPassengerCount(count);
      
      // Initialize passenger forms with default values from user profile
      const initialPassengers = Array.from({ length: count }, (_, index) => ({
        firstName: index === 0 ? (user?.firstName || "") : "",
        lastName: index === 0 ? (user?.lastName || "") : "",
        passportNumber: index === 0 ? (user?.passportNumber || "") : "",
        dateOfBirth: index === 0 ? (user?.dateOfBirth || "") : "",
        passportExpiry: index === 0 ? (user?.passportExpiry || "") : "",
      }));
      
      form.setValue("passengers", initialPassengers);
    }

    if (items.length === 0) {
      setLocation("/");
    }
  }, [isAuthenticated, items.length, setLocation, user, form]);

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest("POST", "/api/orders", orderData);
      return response.json();
    },
    onSuccess: (data) => {
      clearCart();
      sessionStorage.removeItem("selectedFlight");
      sessionStorage.removeItem("selectedSeats");
      sessionStorage.removeItem("flightSearch");
      toast({
        title: "Booking Confirmed!",
        description: `Your order ${data.orderNumber} has been successfully created.`,
      });
      setLocation(`/order/${data.orderNumber}`);
    },
    onError: (error) => {
      toast({
        title: "Booking Failed",
        description: "There was an error processing your booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: CheckoutFormData) => {
    const flightItem = items.find(item => item.type === 'flight');
    const serviceItems = items.filter(item => item.type === 'service');

    // If no flight in cart but we have selectedFlight, use that
    let flightId = flightItem?.flightId;
    if (!flightId && selectedFlight) {
      flightId = selectedFlight.id;
    }

    // Update user profile with passenger information for future use
    if (user && data.passengers.length > 0) {
      const primaryPassenger = data.passengers[0];
      try {
        await apiRequest("PATCH", `/api/users/${user.id}`, {
          passportNumber: primaryPassenger.passportNumber,
          dateOfBirth: primaryPassenger.dateOfBirth,
          passportExpiry: primaryPassenger.passportExpiry,
        });
      } catch (error) {
        console.error("Failed to update user information:", error);
      }
    }

    const orderData = {
      flightId: flightId,
      passengerInfo: data.passengers,
      selectedServices: serviceItems.map(item => ({
        id: item.serviceId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      subtotal: (total / 1.12).toFixed(2), // Remove taxes for subtotal
      taxes: (total * 0.12).toFixed(2),
      total: total.toFixed(2),
      status: "pending",
      paymentStatus: "pending",
      canCheckIn: false,
      isCheckedIn: false,
    };

    // Store order data for payment page
    sessionStorage.setItem("pendingOrderData", JSON.stringify(orderData));
    
    // Redirect to payment page
    setLocation("/payment/booking");
  };

  const handleBack = () => {
    setLocation("/services");
  };

  if (!isAuthenticated || !selectedFlight) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-airline-blue mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-airline-blue">Step 3 of 3</span>
            <span className="text-sm text-gray-500">Payment & Confirmation</span>
          </div>
          <Progress value={100} className="h-2" />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit as any)}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Payment Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Passenger Information */}
                {Array.from({ length: passengerCount }, (_, passengerIndex) => (
                  <Card key={passengerIndex}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Passenger {passengerIndex + 1} Information</span>
                        {selectedSeats[passengerIndex] && (
                          <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Seat {selectedSeats[passengerIndex].seatNumber}
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control as any}
                          name={`passengers.${passengerIndex}.firstName`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="John" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control as any}
                          name={`passengers.${passengerIndex}.lastName`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Doe" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control as any}
                          name={`passengers.${passengerIndex}.email`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email *</FormLabel>
                              <FormControl>
                                <Input {...field} type="email" placeholder="john.doe@example.com" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control as any}
                          name={`passengers.${passengerIndex}.phone`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="+1 (555) 123-4567" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name={`passengers.${passengerIndex}.dateOfBirth`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date of Birth *</FormLabel>
                              <FormControl>
                                <Input {...field} type="date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`passengers.${passengerIndex}.gender`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Gender *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Gender" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="male">Male</SelectItem>
                                  <SelectItem value="female">Female</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`passengers.${passengerIndex}.nationality`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nationality *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Country" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="us">United States</SelectItem>
                                  <SelectItem value="ca">Canada</SelectItem>
                                  <SelectItem value="uk">United Kingdom</SelectItem>
                                  <SelectItem value="au">Australia</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`passengers.${passengerIndex}.passportNumber`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Passport Number *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="123456789" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`passengers.${passengerIndex}.passportExpiry`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Passport Expiry *</FormLabel>
                              <FormControl>
                                <Input {...field} type="date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Terms and Conditions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Terms and Conditions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="agreeTerms"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                I agree to the Terms and Conditions *
                              </FormLabel>
                              <p className="text-xs text-muted-foreground">
                                By checking this box, you agree to our booking terms
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="agreePrivacy"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                I agree to the Privacy Policy *
                              </FormLabel>
                              <p className="text-xs text-muted-foreground">
                                We will use your information according to our privacy policy
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Submit Button */}
                    <Button
                      type="submit"
                      className="w-full bg-airline-blue hover:bg-blue-700 text-white py-3 text-lg"
                      disabled={createOrderMutation.isPending}
                    >
                      {createOrderMutation.isPending ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </div>
                      ) : (
                        `Continue to Payment`
                      )}
                    </Button>
                  </CardContent>
                </Card>
                  <CardContent className="space-y-4">
                    {/* Payment Method Selection */}
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

                    {/* Credit Card Fields (shown only when credit_card is selected) */}
                    {form.watch("paymentMethod") === "credit_card" && (
                      <div className="space-y-4 border-t pt-4">
                    <FormField
                      control={form.control}
                      name="cardNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Number *</FormLabel>
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
                            <FormLabel>Expiry Date *</FormLabel>
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
                            <FormLabel>CVV *</FormLabel>
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
                          <FormLabel>Cardholder Name *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="John Doe" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="123 Main Street" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="New York" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State/Province *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="NY" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP Code *</FormLabel>
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
                            <FormLabel>Country *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="USA" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
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
              </div>

              {/* Order Summary */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Booking Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Group items by type and passenger */}
                    {(() => {
                      const flightItems = items.filter(item => item.type === 'flight');
                      const servicesByPassenger: { [key: number]: any[] } = {};
                      const generalServices: any[] = [];
                      
                      items.filter(item => item.type === 'service').forEach(item => {
                        if (item.passengerId !== undefined) {
                          if (!servicesByPassenger[item.passengerId]) {
                            servicesByPassenger[item.passengerId] = [];
                          }
                          servicesByPassenger[item.passengerId].push(item);
                        } else {
                          generalServices.push(item);
                        }
                      });
                      
                      return (
                        <>
                          {/* Flight Items */}
                          {flightItems.map((item) => (
                            <div key={item.id} className="flex justify-between items-start py-3 border-b border-gray-200">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{item.name}</h4>
                                {item.description && (
                                  <p className="text-sm text-gray-600">{item.description}</p>
                                )}
                                {item.details?.passengerCount > 1 && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    ${(item.price / item.details.passengerCount).toFixed(2)} per passenger × {item.details.passengerCount} passengers
                                  </p>
                                )}
                              </div>
                              <div className="text-right ml-4">
                                <span className="font-bold text-lg">${(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                          
                          {/* Passenger-Specific Services */}
                          {Object.entries(servicesByPassenger).map(([passengerId, services]) => (
                            <div key={`passenger-${passengerId}`} className="border-l-4 border-blue-500 pl-4 py-2">
                              <h5 className="font-medium text-blue-900 mb-2">Passenger {parseInt(passengerId) + 1} Services</h5>
                              {services.map((item) => (
                                <div key={item.id} className="flex justify-between items-start py-1">
                                  <div className="flex-1">
                                    <h6 className="text-sm font-medium text-gray-800">{item.name}</h6>
                                    {item.description && (
                                      <p className="text-xs text-gray-500">{item.description.replace(/ \(Passenger \d+\)/, '')}</p>
                                    )}
                                  </div>
                                  <div className="text-right ml-4">
                                    <span className="font-medium text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                          
                          {/* General Services */}
                          {generalServices.map((item) => (
                            <div key={item.id} className="flex justify-between items-start py-2 border-b border-gray-100">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{item.name}</h4>
                                {item.description && (
                                  <p className="text-sm text-gray-600">{item.description}</p>
                                )}
                              </div>
                              <div className="text-right ml-4">
                                <span className="font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </>
                      );
                    })()}

                    <div className="space-y-2 pt-4">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>${(total / 1.12).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Taxes & Fees (12%)</span>
                        <span>${(total * 0.12).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total Amount</span>
                        <span className="text-airline-blue">${total.toFixed(2)}</span>
                      </div>
                      {passengerCount > 1 && (
                        <p className="text-xs text-gray-500 mt-2">
                          Total includes flights for {passengerCount} passengers and selected services
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Terms and Conditions */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <FormField
                      control={form.control}
                      name="agreeTerms"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm cursor-pointer">
                              I agree to the Terms and Conditions *
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="agreePrivacy"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm cursor-pointer">
                              I accept the Privacy Policy *
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="subscribeNews"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm cursor-pointer">
                              Subscribe to promotional emails (optional)
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Complete Booking Button */}
                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg font-bold text-lg"
                  disabled={createOrderMutation.isPending}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  {createOrderMutation.isPending ? "Processing..." : `Complete Booking - $${total.toFixed(2)}`}
                </Button>

                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    <Lock className="w-3 h-3 inline mr-1" />
                    Your payment is secured with 256-bit SSL encryption
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Services</span>
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
