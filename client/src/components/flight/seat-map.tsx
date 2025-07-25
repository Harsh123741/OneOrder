import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Plane } from "lucide-react";
import { Seat } from "@shared/schema";

interface SeatMapProps {
  flightId: number;
  onSeatSelect: (seat: Seat, passengerIndex?: number) => void;
  selectedSeats?: Seat[];
  passengerCount?: number;
  currentPassenger?: number;
}

export default function SeatMap({ 
  flightId, 
  onSeatSelect, 
  selectedSeats = [], 
  passengerCount = 1,
  currentPassenger = 0 
}: SeatMapProps) {
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);

  const { data: seats = [], isLoading } = useQuery<Seat[]>({
    queryKey: ["/api/flights", flightId, "seats"],
    enabled: !!flightId && flightId !== null,
  });

  // Use useMemo to compute selected seat IDs to avoid infinite re-renders
  useEffect(() => {
    const newSelectedIds = selectedSeats.map(seat => seat.id);
    if (JSON.stringify(newSelectedIds) !== JSON.stringify(selectedSeatIds)) {
      setSelectedSeatIds(newSelectedIds);
    }
  }, [selectedSeats, selectedSeatIds]);

  const handleSeatClick = (seat: Seat) => {
    if (!seat.isAvailable) return;
    
    // Check if seat is already selected by another passenger
    if (selectedSeatIds.includes(seat.id)) return;
    
    // For multi-passenger bookings, mark seat as unavailable for other passengers
    const newSelectedSeatIds = [...selectedSeatIds];
    newSelectedSeatIds[currentPassenger] = seat.id;
    setSelectedSeatIds(newSelectedSeatIds);
    onSeatSelect(seat, currentPassenger);
  };

  const getSeatClassName = (seat: Seat) => {
    const baseClasses = "w-10 h-10 rounded-lg text-xs font-bold border-2 cursor-pointer transition-all duration-200 hover:scale-105 flex items-center justify-center";
    
    // Check if seat is selected by any passenger
    const isSelectedBySomeone = selectedSeatIds.includes(seat.id);
    const passengerIndex = selectedSeatIds.indexOf(seat.id);
    
    if (!seat.isAvailable || (isSelectedBySomeone && passengerIndex !== currentPassenger)) {
      return `${baseClasses} bg-red-100 border-red-300 text-red-600 cursor-not-allowed`;
    }
    
    if (isSelectedBySomeone && passengerIndex === currentPassenger) {
      return `${baseClasses} bg-green-500 border-green-600 text-white shadow-lg`;
    }
    
    if (seat.isExtraLegroom) {
      return `${baseClasses} bg-purple-100 border-purple-300 text-purple-700 hover:bg-purple-200`;
    }
    
    if (seat.price && parseFloat(seat.price) > 0) {
      return `${baseClasses} bg-yellow-100 border-yellow-300 text-yellow-700 hover:bg-yellow-200`;
    }
    
    return `${baseClasses} bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200`;
  };

  const groupSeatsByRow = (seats: Seat[]): Record<string, Seat[]> => {
    const rows = seats.reduce((acc: Record<string, Seat[]>, seat) => {
      const row = seat.seatNumber.match(/\d+/)?.[0];
      if (!acc[row!]) acc[row!] = [];
      acc[row!].push(seat);
      return acc;
    }, {});

    // Sort rows numerically and seats alphabetically within each row
    Object.keys(rows).forEach(row => {
      rows[row].sort((a: Seat, b: Seat) => 
        a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true })
      );
    });

    return rows;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-airline-blue"></div>
      </div>
    );
  }

  if (!seats.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">No seats available for this flight</p>
        </CardContent>
      </Card>
    );
  }

  const seatRows = groupSeatsByRow(seats);
  const sortedRowNumbers = Object.keys(seatRows).sort((a, b) => parseInt(a) - parseInt(b));

  return (
    <div className="space-y-6">
      {/* Seat Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plane className="h-5 w-5" />
            <span>Seat Selection</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-gray-100 border-2 border-gray-300 rounded-lg"></div>
              <span className="font-medium">Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-red-100 border-2 border-red-300 rounded-lg"></div>
              <span className="font-medium">Occupied</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-green-500 border-2 border-green-600 rounded-lg"></div>
              <span className="font-medium">Selected</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-yellow-100 border-2 border-yellow-300 rounded-lg"></div>
              <span className="font-medium">Premium (+$10-15)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-purple-100 border-2 border-purple-300 rounded-lg"></div>
              <span className="font-medium">Extra Legroom (+$25)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aircraft Cabin */}
      <Card className="bg-gradient-to-b from-sky-50 via-blue-50 to-white border-2 border-sky-200">
        <CardContent className="p-8">
          {/* Aircraft Header */}
          <div className="text-center mb-8 relative">
            <div className="bg-gradient-to-r from-sky-100 to-blue-100 rounded-full p-4 w-fit mx-auto mb-4">
              <Plane className="h-12 w-12 text-sky-600 mx-auto" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Aircraft Seat Map</h3>
            <p className="text-sm text-gray-600 mt-1">Choose your preferred seat</p>
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-sky-300 to-transparent"></div>
          </div>

          {/* Cockpit Area */}
          <div className="text-center mb-6">
            <div className="w-20 h-8 bg-gray-800 rounded-t-full mx-auto mb-2 relative">
              <div className="absolute inset-x-2 top-1 h-2 bg-sky-200 rounded-full"></div>
            </div>
            <p className="text-xs text-gray-500 font-medium">COCKPIT</p>
          </div>

          {/* Seat Grid Container */}
          <div className="max-w-sm mx-auto space-y-2 bg-white rounded-xl p-6 shadow-inner border border-gray-200">
            {/* Business Class */}
            {sortedRowNumbers.filter(row => parseInt(row) <= 3).length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="h-px bg-purple-300 flex-1"></div>
                  <span className="px-3 text-sm font-bold text-purple-700 bg-purple-100 rounded-full">
                    BUSINESS CLASS
                  </span>
                  <div className="h-px bg-purple-300 flex-1"></div>
                </div>
                {sortedRowNumbers
                  .filter(row => parseInt(row) <= 3)
                  .map(rowNumber => (
                    <div key={rowNumber} className="flex items-center justify-center space-x-2 mb-3">
                      <span className="w-8 text-sm font-bold text-gray-600 text-center">{rowNumber}</span>
                      {seatRows[rowNumber].map((seat: any, index: number) => (
                        <div key={seat.id} className="flex items-center">
                          <button
                            onClick={() => handleSeatClick(seat)}
                            className={getSeatClassName(seat)}
                            disabled={!seat.isAvailable}
                            title={`Seat ${seat.seatNumber} - ${seat.seatClass} - ${seat.isAvailable ? 'Available' : 'Occupied'}`}
                          >
                            {seat.seatNumber.slice(-1)}
                          </button>
                          {/* Aisle gap */}
                          {index === 2 && <div className="w-6 border-l border-r border-gray-300 h-8 bg-gray-50 ml-2"></div>}
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            )}

            {/* Class Divider */}
            {sortedRowNumbers.filter(row => parseInt(row) <= 3).length > 0 && (
              <div className="py-4">
                <div className="h-px bg-gray-300 w-full"></div>
              </div>
            )}

            {/* Economy Class */}
            <div>
              <div className="flex items-center justify-center mb-4">
                <div className="h-px bg-sky-300 flex-1"></div>
                <span className="px-3 text-sm font-bold text-sky-700 bg-sky-100 rounded-full">
                  ECONOMY CLASS
                </span>
                <div className="h-px bg-sky-300 flex-1"></div>
              </div>
              {sortedRowNumbers
                .filter(row => parseInt(row) > 3)
                .map(rowNumber => (
                  <div key={rowNumber} className="flex items-center justify-center space-x-2 mb-3">
                    <span className="w-8 text-sm font-bold text-gray-600 text-center">{rowNumber}</span>
                    {seatRows[rowNumber].map((seat: any, index: number) => (
                      <div key={seat.id} className="flex items-center">
                        <button
                          onClick={() => handleSeatClick(seat)}
                          className={getSeatClassName(seat)}
                          disabled={!seat.isAvailable}
                          title={`Seat ${seat.seatNumber} - ${seat.seatClass} - ${seat.isAvailable ? 'Available' : 'Occupied'}${seat.isExtraLegroom ? ' - Extra Legroom' : ''}${seat.price && parseFloat(seat.price) > 0 ? ` - $${seat.price}` : ''}`}
                        >
                          {seat.seatNumber.slice(-1)}
                        </button>
                        {/* Aisle gap */}
                        {index === 2 && <div className="w-6 border-l border-r border-gray-300 h-8 bg-gray-50 relative ml-2">
                          <div className="absolute inset-0 bg-gradient-to-b from-gray-100 to-gray-200"></div>
                        </div>}
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          </div>

          {/* Selected Seats Info */}
          {selectedSeatIds.length > 0 && (
            <div className="mt-6 bg-blue-50 rounded-lg p-4 text-center">
              <h4 className="font-semibold mb-2">Selected Seats</h4>
              {selectedSeatIds.map((seatId, index) => {
                const seat = seats.find((s: any) => s.id === seatId);
                if (!seat) return null;
                return (
                  <div key={index} className="mb-3 pb-3 border-b border-blue-200 last:border-b-0">
                    <p className="text-xs text-gray-500">Passenger {index + 1}</p>
                    <p className="font-medium">Seat {seat.seatNumber}</p>
                    <p className="text-sm text-gray-600 capitalize">
                      {seat.seatType.replace('_', ' ')} • {seat.seatClass}
                    </p>
                    {seat.isExtraLegroom && (
                      <Badge className="mt-1">Extra Legroom</Badge>
                    )}
                    <p className="text-lg font-bold text-airline-blue mt-2">
                      {seat.price && parseFloat(seat.price) > 0 ? `+$${seat.price}` : 'Included'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
