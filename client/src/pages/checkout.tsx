import React, { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/hooks/use-cart';
import { apiRequest } from '@/lib/queryClient';
import { Plane, Users, CreditCard, MapPin, CalendarDays, Passport } from 'lucide-react';

const passengerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  passportNumber: z.string().min(6, 'Passport number must be at least 6 characters'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  passportExpiry: z.string().min(1, 'Passport expiry is required'),
});

const checkoutSchema = z.object({
  passengers: z.array(passengerSchema),
  agreeTerms: z.boolean().refine(val => val === true, 'You must agree to the terms and conditions'),
  agreePrivacy: z.boolean().refine(val => val === true, 'You must agree to the privacy policy'),
});

export default function Checkout() {
  const { user } = useAuth();
  const { items, total, clearCart } = useCart();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get flight details and passenger count
  const flight = items.find(item => item.type === 'flight');
  const passengerCount = flight?.details?.passengerCount || 1;

  const form = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      passengers: Array.from({ length: passengerCount }, (_, index) => ({
        firstName: index === 0 ? user?.firstName || '' : '',
        lastName: index === 0 ? user?.lastName || '' : '',
        passportNumber: index === 0 ? user?.passportNumber || '' : '',
        dateOfBirth: index === 0 ? user?.dateOfBirth || '' : '',
        passportExpiry: index === 0 ? user?.passportExpiry || '' : '',
      })),
      agreeTerms: false,
      agreePrivacy: false,
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const orderData = {
        ...data,
        items: items,
        total: total,
        status: 'pending_payment',
        paymentStatus: 'pending',
        canCheckIn: false,
      };
      
      const response = await apiRequest('POST', '/api/orders/create-draft', orderData);
      if (!response.ok) {
        throw new Error('Failed to create order draft');
      }
      return await response.json();
    },
    onSuccess: (order) => {
      toast({
        title: 'Order Created',
        description: 'Redirecting to payment page...',
      });
      
      // Store order details for payment page
      localStorage.setItem('pendingOrder', JSON.stringify(order));
      clearCart();
      setLocation(`/payment?orderNumber=${order.orderNumber}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Order Creation Failed',
        description: error.message || 'An error occurred while creating your order.',
        variant: 'destructive',
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest('PATCH', `/api/users/${user?.id}`, userData);
      if (!response.ok) throw new Error('Failed to update user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
  });

  const onSubmit = async (data: any) => {
    // Update user profile with passenger info from first passenger
    if (user && data.passengers[0]) {
      const userData = {
        passportNumber: data.passengers[0].passportNumber,
        dateOfBirth: data.passengers[0].dateOfBirth,
        passportExpiry: data.passengers[0].passportExpiry,
      };
      await updateUserMutation.mutateAsync(userData);
    }

    // Create order with passenger information
    const orderData = {
      passengerInfo: data.passengers,
      flightId: flight?.flightId,
      selectedServices: items.filter(item => item.type === 'service'),
      total: total,
    };

    createOrderMutation.mutate(orderData);
  };

  if (!user) {
    setLocation('/login');
    return null;
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
          <Button onClick={() => setLocation('/flights')}>Search Flights</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Passenger Information</h1>
          <p className="text-gray-600">Please provide passenger details for your booking</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Passenger Information */}
              <div className="lg:col-span-2 space-y-6">
                {Array.from({ length: passengerCount }, (_, passengerIndex) => (
                  <Card key={passengerIndex} className="shadow-sm border-l-4 border-l-airline-blue">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Users className="w-5 h-5 mr-2 text-airline-blue" />
                        Passenger {passengerIndex + 1}
                        {passengerIndex === 0 && <Badge variant="secondary" className="ml-2">Primary</Badge>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
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
                          control={form.control}
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

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name={`passengers.${passengerIndex}.passportNumber`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Passport Number *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="A12345678" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
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