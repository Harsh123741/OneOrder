import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plane, Clock, MapPin, User, Ticket, Download, QrCode } from "lucide-react";

interface BoardingPassProps {
  order: any;
  flight: any;
  seat: any;
  user: any;
}

export default function BoardingPass({ order, flight, seat, user }: BoardingPassProps) {
  // Safety check for flight data
  if (!flight) {
    return (
      <Card className="w-full max-w-2xl mx-auto bg-red-500 text-white">
        <CardContent className="p-6 text-center">
          <p>Flight information not available</p>
        </CardContent>
      </Card>
    );
  }
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Generate QR code data for the boarding pass
  const generateQRData = () => {
    return JSON.stringify({
      orderNumber: order.orderNumber,
      passengerName: `${user.firstName} ${user.lastName}`,
      flight: flight.flightNumber,
      seat: seat?.seatNumber || 'Not Assigned',
      departure: flight.departureTime,
      gate: 'A12', // Mock gate for demo
      boardingGroup: 'B' // Mock boarding group
    });
  };

  const generateQRCodeSVG = (data: string) => {
    // Simple QR code representation using SVG
    const qrData = data.split('').map((char, index) => char.charCodeAt(0) + index).join('');
    const hash = qrData.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
    
    const size = 120;
    const moduleSize = 4;
    const modules = size / moduleSize;
    
    return (
      <svg width={size} height={size} className="border">
        {Array.from({ length: modules }, (_, row) =>
          Array.from({ length: modules }, (_, col) => {
            const shouldFill = ((hash + row * col) % 3) === 0;
            return shouldFill ? (
              <rect
                key={`${row}-${col}`}
                x={col * moduleSize}
                y={row * moduleSize}
                width={moduleSize}
                height={moduleSize}
                fill="black"
              />
            ) : null;
          })
        )}
      </svg>
    );
  };

  const handleDownload = () => {
    // Create a simple text version for download
    const boardingPassText = `
SKYLINK AIRLINES BOARDING PASS
===============================
PASSENGER: ${user.firstName} ${user.lastName}
FLIGHT: ${flight.flightNumber}
FROM: ${flight.departureAirport}
TO: ${flight.arrivalAirport}
DATE: ${formatDate(flight.departureTime)}
DEPARTURE: ${formatTime(flight.departureTime)}
SEAT: ${seat?.seatNumber || 'Not Assigned'}
CLASS: ${flight.class.replace('_', ' ').toUpperCase()}
ORDER: ${order.orderNumber}
QR CODE DATA: ${generateQRData()}
===============================
Please arrive at gate 45 minutes before departure
    `.trim();

    const blob = new Blob([boardingPassText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boarding-pass-${order.orderNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-gradient-to-r from-airline-blue to-blue-600 text-white">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold text-white">
            BOARDING PASS
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="text-airline-blue border-white hover:bg-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
        <Badge variant="secondary" className="w-fit bg-green-500 text-white">
          <Ticket className="w-4 h-4 mr-1" />
          CHECKED IN
        </Badge>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Passenger Information */}
        <div className="bg-white/10 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <User className="w-5 h-5 mr-2" />
            <h3 className="font-semibold">PASSENGER</h3>
          </div>
          <p className="text-xl font-bold">{user.firstName} {user.lastName}</p>
          <p className="text-sm opacity-80">Order: {order.orderNumber}</p>
        </div>

        {/* Flight Information */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Plane className="w-5 h-5 mr-2" />
              <h3 className="font-semibold">FLIGHT</h3>
            </div>
            <p className="text-xl font-bold">{flight.airline}</p>
            <p className="text-lg">{flight.flightNumber}</p>
            <p className="text-sm opacity-80">{flight.aircraft}</p>
          </div>

          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <MapPin className="w-5 h-5 mr-2" />
              <h3 className="font-semibold">SEAT</h3>
            </div>
            <p className="text-2xl font-bold">{seat?.seatNumber || 'Not Assigned'}</p>
            <p className="text-sm opacity-80 capitalize">
              {flight.class.replace('_', ' ')} Class
            </p>
            {seat?.isExtraLegroom && (
              <Badge variant="secondary" className="mt-1 bg-orange-500 text-white">
                Extra Legroom
              </Badge>
            )}
          </div>
        </div>

        {/* Route Information with QR Code */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-2xl font-bold">{flight.departureAirport}</p>
                <p className="text-sm opacity-80">DEPARTURE</p>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="border-t border-white border-dashed w-full mx-4 relative">
                  <Plane className="w-6 h-6 absolute left-1/2 -top-3 transform -translate-x-1/2 bg-airline-blue rounded-full p-1" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{flight.arrivalAirport}</p>
                <p className="text-sm opacity-80">ARRIVAL</p>
              </div>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="bg-white/10 rounded-lg p-4 flex flex-col items-center justify-center">
            <div className="flex items-center mb-2">
              <QrCode className="w-5 h-5 mr-2" />
              <h3 className="font-semibold">BOARDING QR</h3>
            </div>
            <div className="bg-white p-2 rounded">
              {generateQRCodeSVG(generateQRData())}
            </div>
            <p className="text-xs opacity-80 mt-2 text-center">
              Scan at security & gate
            </p>
          </div>
        </div>

        {/* Time Information */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Clock className="w-4 h-4 mr-1" />
              <p className="text-sm font-semibold">DATE</p>
            </div>
            <p className="text-lg font-bold">{formatDate(flight.departureTime)}</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Clock className="w-4 h-4 mr-1" />
              <p className="text-sm font-semibold">DEPARTURE</p>
            </div>
            <p className="text-lg font-bold">{formatTime(flight.departureTime)}</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Clock className="w-4 h-4 mr-1" />
              <p className="text-sm font-semibold">ARRIVAL</p>
            </div>
            <p className="text-lg font-bold">{formatTime(flight.arrivalTime)}</p>
          </div>
        </div>

        {/* Important Information */}
        <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 text-center">
          <p className="text-sm font-semibold">
            ⚠️ Please arrive at the gate 45 minutes before departure
          </p>
          <p className="text-xs opacity-80 mt-1">
            Gate information will be announced 2 hours before departure
          </p>
        </div>
      </CardContent>
    </Card>
  );
}