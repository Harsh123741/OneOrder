import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Download, Home, Plane } from "lucide-react";
import BoardingPass from "@/components/boarding-pass";
import { useAuth } from "@/hooks/use-auth";

interface BoardingPassSuccessProps {
  boardingPassData?: any;
  eligibleOrder?: any;
  passengerSeats?: { [key: number]: any };
  availableSeats?: any[];
}

export default function BoardingPassSuccess({
  boardingPassData: propBoardingPassData,
  eligibleOrder: propEligibleOrder,
  passengerSeats: propPassengerSeats = {},
  availableSeats: propAvailableSeats = []
}: BoardingPassSuccessProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Try to get data from props first, then session storage
  let boardingPassData = propBoardingPassData;
  let eligibleOrder = propEligibleOrder;
  let passengerSeats = propPassengerSeats;
  let availableSeats = propAvailableSeats;

  if (!boardingPassData || !eligibleOrder) {
    const storedData = sessionStorage.getItem('boardingPassData');
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        boardingPassData = parsed.boardingPassData;
        eligibleOrder = parsed.eligibleOrder;
        passengerSeats = parsed.passengerSeats || {};
        availableSeats = parsed.availableSeats || [];
        // Clear the stored data after use
        sessionStorage.removeItem('boardingPassData');
      } catch (error) {
        console.error('Failed to parse stored boarding pass data:', error);
      }
    }
  }

  // If still no data, redirect to check-in
  if (!boardingPassData || !eligibleOrder) {
    setLocation('/check-in');
    return null;
  }

  const getPassengerList = () => {
    if (eligibleOrder?.passengerInfo && Array.isArray(eligibleOrder.passengerInfo)) {
      return eligibleOrder.passengerInfo;
    }
    return [{ firstName: user?.firstName || '', lastName: user?.lastName || '' }];
  };

  const handlePrintAll = () => {
    window.print();
  };

  const handleDownloadAll = () => {
    // This would implement PDF generation for all boarding passes
    console.log('Download all boarding passes');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Success Header */}
        <Card className="mb-8 border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-green-800 mb-2">
                Check-in Complete!
              </h1>
              <p className="text-green-700 text-lg">
                Your boarding pass{getPassengerList().length > 1 ? 'es are' : ' is'} ready
              </p>
              <p className="text-sm text-green-600 mt-2">
                Order #{eligibleOrder.orderNumber} • Flight {eligibleOrder.flight?.flightNumber}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Flight Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-airline-blue" />
              Flight Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600">From</p>
                <p className="font-semibold text-lg">{eligibleOrder.flight?.departureAirport}</p>
                <p className="text-sm text-gray-500">
                  {new Date(eligibleOrder.flight?.departureTime).toLocaleDateString()} •{' '}
                  {new Date(eligibleOrder.flight?.departureTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">To</p>
                <p className="font-semibold text-lg">{eligibleOrder.flight?.arrivalAirport}</p>
                <p className="text-sm text-gray-500">
                  {new Date(eligibleOrder.flight?.arrivalTime).toLocaleDateString()} •{' '}
                  {new Date(eligibleOrder.flight?.arrivalTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Multiple Boarding Passes */}
        <div className="space-y-6 mb-8">
          {getPassengerList().map((passenger: any, index: number) => (
            <Card key={index} className="border-2 border-airline-blue/20">
              <CardHeader>
                <CardTitle className="text-center text-lg text-airline-blue">
                  Boarding Pass - {passenger.firstName} {passenger.lastName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <BoardingPass
                    order={eligibleOrder}
                    flight={eligibleOrder.flight}
                    seat={passengerSeats[index] || (eligibleOrder.seatId ? availableSeats.find(s => s.id === eligibleOrder.seatId) : null)}
                    user={{
                      ...user,
                      firstName: passenger.firstName,
                      lastName: passenger.lastName
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                variant="outline" 
                onClick={handlePrintAll}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Print All Boarding Passes
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDownloadAll}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              <Button 
                onClick={() => setLocation('/my-orders')}
                className="flex items-center gap-2 bg-airline-blue hover:bg-blue-700"
              >
                <Home className="h-4 w-4" />
                View All Orders
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Important Information */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-blue-900 mb-3">Important Reminders</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• Arrive at the airport at least 2 hours before domestic flights and 3 hours before international flights</li>
              <li>• Have your boarding pass and valid ID ready at security and boarding</li>
              <li>• Check the departure gate as it may change - monitor airport displays</li>
              <li>• Ensure your mobile device is charged if using digital boarding passes</li>
              <li>• Review baggage allowance and restrictions before departure</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}