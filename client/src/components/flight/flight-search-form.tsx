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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (onSearch) {
      onSearch(searchData);
    } else {
      // Store search data and navigate to flights page
      sessionStorage.setItem("flightSearch", JSON.stringify(searchData));
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
                  className="pl-10"
                  min={new Date().toISOString().split('T')[0]}
                />
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
                  className="pl-10"
                  disabled={searchData.tripType === "one_way"}
                  min={searchData.departureDate || new Date().toISOString().split('T')[0]}
                />
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
