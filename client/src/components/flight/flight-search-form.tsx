import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Plane, Calendar, Users } from "lucide-react";
import { useLocation } from "wouter";

interface FlightSearchFormProps {
  onSearch?: (searchData: any) => void;
}

export default function FlightSearchForm({ onSearch }: FlightSearchFormProps) {
  const [, setLocation] = useLocation();
  const [searchData, setSearchData] = useState({
    tripType: "round_trip",
    from: "",
    to: "",
    departureDate: "",
    returnDate: "",
    passengers: 1,
    class: "economy",
  });

  // Format date from YYYY-MM-DD to MM-DD-YYYY for display
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${month}/${day}/${year}`;
  };

  // Convert MM/DD/YYYY to YYYY-MM-DD for storage
  const formatDateForStorage = (dateString: string) => {
    if (!dateString) return '';
    
    // If already in YYYY-MM-DD format, return as is
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
    
    // Parse MM/DD/YYYY or MM-DD-YYYY format
    const parts = dateString.split(/[\/\-]/);
    if (parts.length === 3) {
      const [month, day, year] = parts;
      if (year.length === 4) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    
    return dateString;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert dates to proper format before submitting
    const formattedSearchData = {
      ...searchData,
      departureDate: formatDateForStorage(searchData.departureDate),
      returnDate: formatDateForStorage(searchData.returnDate),
    };
    
    if (onSearch) {
      onSearch(formattedSearchData);
    } else {
      // Store search data and navigate to flights page
      sessionStorage.setItem("flightSearch", JSON.stringify(formattedSearchData));
      setLocation("/flights");
    }
  };

  const airports = [
    { code: "JFK", name: "New York (JFK)" },
    { code: "LAX", name: "Los Angeles (LAX)" },
    { code: "CHI", name: "Chicago (ORD)" },
    { code: "MIA", name: "Miami (MIA)" },
    { code: "LHR", name: "London (LHR)" },
    { code: "CDG", name: "Paris (CDG)" },
    { code: "NRT", name: "Tokyo (NRT)" },
    { code: "SYD", name: "Sydney (SYD)" },
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Trip Type */}
          <RadioGroup
            value={searchData.tripType}
            onValueChange={(value) => setSearchData({ ...searchData, tripType: value })}
            className="flex flex-wrap gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="round_trip" id="round_trip" />
              <Label htmlFor="round_trip">Round Trip</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="one_way" id="one_way" />
              <Label htmlFor="one_way">One Way</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="multi_city" id="multi_city" />
              <Label htmlFor="multi_city">Multi-City</Label>
            </div>
          </RadioGroup>

          {/* Search Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* From */}
            <div className="space-y-2">
              <Label htmlFor="from">From</Label>
              <div className="relative">
                <Plane className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Select
                  value={searchData.from}
                  onValueChange={(value) => setSearchData({ ...searchData, from: value })}
                >
                  <SelectTrigger className="pl-10">
                    <SelectValue placeholder="Select departure" />
                  </SelectTrigger>
                  <SelectContent>
                    {airports.map((airport) => (
                      <SelectItem key={airport.code} value={airport.code}>
                        {airport.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* To */}
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <div className="relative">
                <Plane className="absolute left-3 top-3 h-4 w-4 text-gray-400 rotate-90" />
                <Select
                  value={searchData.to}
                  onValueChange={(value) => setSearchData({ ...searchData, to: value })}
                >
                  <SelectTrigger className="pl-10">
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {airports.map((airport) => (
                      <SelectItem key={airport.code} value={airport.code}>
                        {airport.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Departure Date */}
            <div className="space-y-2">
              <Label htmlFor="departureDate">Departure</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="departureDate"
                  type="date"
                  value={searchData.departureDate}
                  onChange={(e) => setSearchData({ ...searchData, departureDate: e.target.value })}
                  className="pl-10 [&::-webkit-calendar-picker-indicator]:opacity-100"
                  min={new Date().toISOString().split('T')[0]}
                  placeholder="MM/DD/YYYY"
                  style={{
                    colorScheme: 'light'
                  }}
                />
                {searchData.departureDate && (
                  <div className="absolute inset-0 pl-10 pr-3 py-2 pointer-events-none flex items-center text-sm">
                    {formatDateForDisplay(searchData.departureDate)}
                  </div>
                )}
              </div>
            </div>

            {/* Return Date */}
            <div className="space-y-2">
              <Label htmlFor="returnDate">Return</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="returnDate"
                  type="date"
                  value={searchData.returnDate}
                  onChange={(e) => setSearchData({ ...searchData, returnDate: e.target.value })}
                  className="pl-10 [&::-webkit-calendar-picker-indicator]:opacity-100"
                  disabled={searchData.tripType === "one_way"}
                  min={searchData.departureDate || new Date().toISOString().split('T')[0]}
                  placeholder="MM/DD/YYYY"
                  style={{
                    colorScheme: 'light'
                  }}
                />
                {searchData.returnDate && (
                  <div className="absolute inset-0 pl-10 pr-3 py-2 pointer-events-none flex items-center text-sm">
                    {formatDateForDisplay(searchData.returnDate)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Passengers and Class */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Passengers */}
            <div className="space-y-2">
              <Label htmlFor="passengers">Passengers</Label>
              <div className="relative">
                <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Select
                  value={searchData.passengers.toString()}
                  onValueChange={(value) => setSearchData({ ...searchData, passengers: parseInt(value) })}
                >
                  <SelectTrigger className="pl-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9].map(num => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} {num === 1 ? 'Adult' : 'Adults'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Class */}
            <div className="space-y-2">
              <Label htmlFor="class">Class</Label>
              <Select
                value={searchData.class}
                onValueChange={(value) => setSearchData({ ...searchData, class: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="economy">Economy</SelectItem>
                  <SelectItem value="premium_economy">Premium Economy</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="first">First Class</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search Button */}
            <div className="flex items-end">
              <Button 
                type="submit" 
                className="w-full airline-button-primary"
                disabled={!searchData.from || !searchData.to || !searchData.departureDate}
              >
                Search Flights
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
