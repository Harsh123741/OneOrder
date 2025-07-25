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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/hooks/use-cart';
import { apiRequest } from '@/lib/queryClient';
import { Plane, Users, CreditCard, MapPin, CalendarDays, Passport, Plus, UserCheck, Edit } from 'lucide-react';

const passengerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  passportNumber: z.string().min(6, 'Passport number must be at least 6 characters'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  passportExpiry: z.string().min(1, 'Passport expiry is required'),
});

const checkoutSchema = z.object({
  agreeTerms: z.boolean().refine(val => val === true, 'You must agree to the terms and conditions'),
  agreePrivacy: z.boolean().refine(val => val === true, 'You must agree to the privacy policy'),
});

export default function Checkout() {
  const { user } = useAuth();
  const { items, total, clearCart } = useCart();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddPassenger, setShowAddPassenger] = useState(false);
  const [editingPassenger, setEditingPassenger] = useState<any>(null);

  // Get flight details and passenger count
  const flight = items.find(item => item.type === 'flight');
  const passengerCount = flight?.details?.passengerCount || 1;

  // Fetch saved passengers
  const { data: savedPassengers = [] } = useQuery({
    queryKey: ['/api/passengers'],
    enabled: !!user,
  });

  // State for selected passengers (mix of saved and new)
  const [selectedPassengers, setSelectedPassengers] = useState<any[]>([]);

  const form = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      agreeTerms: false,
      agreePrivacy: false,
    },
  });

  // Initialize selected passengers - start with empty array to allow manual selection
  useEffect(() => {
    if (selectedPassengers.length === 0) {
      const initialSelection = Array.from({ length: passengerCount }, () => null);
      setSelectedPassengers(initialSelection);
    }
  }, [passengerCount]);

  // Mutation to save new passenger
  const savePassengerMutation = useMutation({
    mutationFn: async (passengerData: any) => {
      const response = await apiRequest('POST', '/api/passengers', passengerData);
      if (!response.ok) {
        throw new Error('Failed to save passenger');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/passengers'] });
      toast({
        title: 'Passenger Saved',
        description: 'Passenger information has been saved for future bookings.',
      });
      setShowAddPassenger(false);
      setEditingPassenger(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save passenger information.',
        variant: 'destructive',
      });
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
    // Validate that all passengers are selected
    if (selectedPassengers.some(p => !p || !p.firstName || !p.lastName || !p.passportNumber || !p.dateOfBirth || !p.passportExpiry)) {
      toast({
        title: 'Missing Passenger Information',
        description: 'Please complete all passenger information before proceeding.',
        variant: 'destructive',
      });
      return;
    }

    // Save new passengers to database for future use
    const passengersToSave = selectedPassengers.filter(p => !p.isExisting && p.firstName && p.lastName);
    
    for (const passenger of passengersToSave) {
      try {
        await savePassengerMutation.mutateAsync({
          firstName: passenger.firstName,
          lastName: passenger.lastName,
          email: passenger.email,
          phone: passenger.phone,
          dateOfBirth: passenger.dateOfBirth,
          passportNumber: passenger.passportNumber,
          passportExpiry: passenger.passportExpiry,
          gender: passenger.gender,
          nationality: passenger.nationality,
        });
      } catch (error) {
        console.error('Failed to save passenger:', error);
        // Continue with booking even if passenger saving fails
      }
    }

    // Update user profile with passenger info from first passenger
    if (user && selectedPassengers[0]) {
      const userData = {
        passportNumber: selectedPassengers[0].passportNumber,
        dateOfBirth: selectedPassengers[0].dateOfBirth,
        passportExpiry: selectedPassengers[0].passportExpiry,
      };
      await updateUserMutation.mutateAsync(userData);
    }

    // Create order with passenger information
    const orderData = {
      passengerInfo: selectedPassengers.map(p => ({
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        phone: p.phone,
        dateOfBirth: p.dateOfBirth,
        passportNumber: p.passportNumber,
        passportExpiry: p.passportExpiry,
        gender: p.gender,
        nationality: p.nationality,
      })),
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
              {/* Passenger Selection and Management */}
              <div className="lg:col-span-2 space-y-6">
                {Array.from({ length: passengerCount }, (_, passengerIndex) => (
                  <Card key={passengerIndex} className="shadow-sm border-l-4 border-l-airline-blue">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Users className="w-5 h-5 mr-2 text-airline-blue" />
                          Passenger {passengerIndex + 1}
                          {passengerIndex === 0 && <Badge variant="secondary" className="ml-2">Primary</Badge>}
                        </div>
                        <div className="flex gap-2">
                          {savedPassengers.length > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowAddPassenger(true);
                                setEditingPassenger({ index: passengerIndex, type: 'select' });
                              }}
                            >
                              <UserCheck className="w-4 h-4 mr-1" />
                              Select Saved
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowAddPassenger(true);
                              setEditingPassenger({ index: passengerIndex, type: 'new' });
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add New
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedPassengers[passengerIndex] ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-green-900">
                                {selectedPassengers[passengerIndex].firstName} {selectedPassengers[passengerIndex].lastName}
                              </h4>
                              <p className="text-sm text-green-700">
                                {selectedPassengers[passengerIndex].email} • {selectedPassengers[passengerIndex].phone}
                              </p>
                              <p className="text-sm text-green-600">
                                Passport: {selectedPassengers[passengerIndex].passportNumber}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setShowAddPassenger(true);
                                  setEditingPassenger({ 
                                    index: passengerIndex, 
                                    type: 'edit', 
                                    data: selectedPassengers[passengerIndex] 
                                  });
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-500">
                          <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                          <p>Please select or add passenger information</p>
                        </div>
                      )}
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
                      disabled={createOrderMutation.isPending || selectedPassengers.some(p => !p || !p.firstName)}
                    >
                      {createOrderMutation.isPending ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </div>
                      ) : selectedPassengers.some(p => !p || !p.firstName) ? (
                        "Please complete all passenger information"
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Continue to Payment
                        </>
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
        
        {/* Passenger Management Modal */}
        <Dialog open={showAddPassenger} onOpenChange={setShowAddPassenger}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPassenger?.type === 'select' ? 'Select Saved Passenger' : 
                 editingPassenger?.type === 'edit' ? 'Edit Passenger Information' : 
                 'Add New Passenger'}
              </DialogTitle>
              <DialogDescription>
                {editingPassenger?.type === 'select' ? 'Choose from your saved passenger information' : 
                 editingPassenger?.type === 'edit' ? 'Update passenger details' : 
                 'Enter new passenger information for this booking'}
              </DialogDescription>
            </DialogHeader>
            
            {editingPassenger?.type === 'select' ? (
              <SavedPassengerSelection />
            ) : (
              <PassengerForm />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );

  // Component for selecting saved passengers
  function SavedPassengerSelection() {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
          {savedPassengers.map((passenger: any) => (
            <Card 
              key={passenger.id} 
              className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-airline-blue"
              onClick={() => {
                const newSelectedPassengers = [...selectedPassengers];
                newSelectedPassengers[editingPassenger.index] = { 
                  ...passenger, 
                  isExisting: true 
                };
                setSelectedPassengers(newSelectedPassengers);
                setShowAddPassenger(false);
                setEditingPassenger(null);
              }}
            >
              <CardContent className="p-4">
                <h4 className="font-semibold">{passenger.firstName} {passenger.lastName}</h4>
                <p className="text-sm text-gray-600">{passenger.email}</p>
                <p className="text-sm text-gray-600">Passport: {passenger.passportNumber}</p>
                <p className="text-sm text-gray-500">DOB: {passenger.dateOfBirth}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowAddPassenger(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => {
              setEditingPassenger({ ...editingPassenger, type: 'new' });
            }}
          >
            Add New Instead
          </Button>
        </div>
      </div>
    );
  }

  // Component for adding/editing passenger information
  function PassengerForm() {
    const [formData, setFormData] = useState(
      editingPassenger?.data || {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        passportNumber: '',
        passportExpiry: '',
        gender: '',
        nationality: '',
      }
    );

    const handleSave = () => {
      const newSelectedPassengers = [...selectedPassengers];
      newSelectedPassengers[editingPassenger.index] = { 
        ...formData, 
        isExisting: false 
      };
      setSelectedPassengers(newSelectedPassengers);
      setShowAddPassenger(false);
      setEditingPassenger(null);
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              placeholder="John"
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              placeholder="Doe"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="john.doe@example.com"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="+1 234 567 8900"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="dateOfBirth">Date of Birth *</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="passportNumber">Passport Number *</Label>
            <Input
              id="passportNumber"
              value={formData.passportNumber}
              onChange={(e) => setFormData({...formData, passportNumber: e.target.value})}
              placeholder="A12345678"
            />
          </div>
          <div>
            <Label htmlFor="passportExpiry">Passport Expiry *</Label>
            <Input
              id="passportExpiry"
              type="date"
              value={formData.passportExpiry}
              onChange={(e) => setFormData({...formData, passportExpiry: e.target.value})}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="gender">Gender</Label>
            <Select value={formData.gender} onValueChange={(value) => setFormData({...formData, gender: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="nationality">Nationality</Label>
            <Input
              id="nationality"
              value={formData.nationality}
              onChange={(e) => setFormData({...formData, nationality: e.target.value})}
              placeholder="American"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setShowAddPassenger(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!formData.firstName || !formData.lastName || !formData.passportNumber || !formData.dateOfBirth || !formData.passportExpiry}
          >
            {editingPassenger?.type === 'edit' ? 'Update' : 'Add'} Passenger
          </Button>
        </div>
      </div>
    );
  }
}