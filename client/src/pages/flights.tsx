import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import FlightCard from "@/components/flight/flight-card";
import { apiRequest } from "@/lib/queryClient";
import { Filter, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Flights() {
  const [, setLocation] = useLocation();
  const [searchParams, setSearchParams] = useState<any>(null);
  const [filters, setFilters] = useState({
    priceRange: [0, 2000],
    airlines: [] as string[],
    stops: [] as number[],
    departureTime: [] as string[],
  });
  const [sortBy, setSortBy] = useState("price");

  // Load search parameters from session storage
  useEffect(() => {
    const stored = sessionStorage.getItem("flightSearch");
    if (stored) {
      const params = JSON.parse(stored);
      // Ensure dates are properly formatted
      if (params.departureDate && !params.departureDate.includes('T')) {
        params.departureDate = `${params.departureDate}T00:00:00Z`;
      }
      if (params.returnDate && !params.returnDate.includes('T')) {
        params.returnDate = `${params.returnDate}T00:00:00Z`;
      }
      setSearchParams(params);
    } else {
      // Redirect back to home if no search params
      setLocation("/");
    }
  }, [setLocation]);

  // Fetch flights based on search parameters
  const { data: flights = [], isLoading, error } = useQuery({
    queryKey: ["/api/flights/search", searchParams],
    queryFn: async () => {
      if (!searchParams) return [];
      const response = await apiRequest("POST", "/api/flights/search", searchParams);
      return response.json();
    },
    enabled: !!searchParams,
  });

  // Filter and sort flights
  const filteredFlights = flights
    .filter((flight: any) => {
      const price = parseFloat(flight.price);
      if (price < filters.priceRange[0] || price > filters.priceRange[1]) return false;
      
      if (filters.airlines.length > 0 && !filters.airlines.includes(flight.airline)) return false;
      
      if (filters.stops.length > 0 && !filters.stops.includes(flight.stops)) return false;
      
      return true;
    })
    .sort((a: any, b: any) => {
      switch (sortBy) {
        case "price":
          return parseFloat(a.price) - parseFloat(b.price);
        case "duration":
          return a.duration.localeCompare(b.duration);
        case "departure":
          return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
        default:
          return 0;
      }
    });

  const handleBackToSearch = () => {
    setLocation("/");
  };

  const handleAirlineFilter = (airline: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      airlines: checked 
        ? [...prev.airlines, airline]
        : prev.airlines.filter(a => a !== airline)
    }));
  };

  const handleStopsFilter = (stops: number, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      stops: checked
        ? [...prev.stops, stops]
        : prev.stops.filter(s => s !== stops)
    }));
  };

  const uniqueAirlines = [...new Set(flights.map((f: any) => f.airline))];

  if (!searchParams) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Search Summary */}
        <Card className="mb-8 shadow-lg border-0 bg-white">
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center">
              <div className="flex-1">
                <Button
                  variant="ghost"
                  onClick={handleBackToSearch}
                  className="mb-4 text-airline-blue hover:bg-blue-100 transition-colors duration-200 p-0"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Modify Search
                </Button>
                
                <div className="mb-4">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {searchParams.from} → {searchParams.to}
                  </h1>
                  
                  <div className="flex flex-wrap gap-4 text-gray-600">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="font-medium">
                        {new Date(searchParams.departureDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        {searchParams.passengers} {searchParams.passengers === 1 ? 'Adult' : 'Adults'}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium capitalize">
                        {searchParams.class.charAt(0).toUpperCase() + searchParams.class.slice(1)} Class
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 lg:mt-0 flex items-center space-x-4">
                <div className="bg-green-50 px-4 py-2 rounded-lg">
                  <span className="text-sm font-semibold text-green-800">
                    {filteredFlights.length} flights found
                  </span>
                </div>
                
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price">Price (Low to High)</SelectItem>
                    <SelectItem value="duration">Duration</SelectItem>
                    <SelectItem value="departure">Departure Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Enhanced Filters Sidebar */}
          <div className="lg:w-1/4">
            <Card className="sticky top-4 shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filter Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Price Range */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Price Range</Label>
                  <Slider
                    value={filters.priceRange}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value }))}
                    max={2000}
                    min={0}
                    step={50}
                    className="mb-2"
                  />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>${filters.priceRange[0]}</span>
                    <span>${filters.priceRange[1]}</span>
                  </div>
                </div>

                {/* Airlines */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Airlines</Label>
                  <div className="space-y-2">
                    {uniqueAirlines.map((airline: string) => (
                      <div key={airline} className="flex items-center space-x-2">
                        <Checkbox
                          id={airline}
                          checked={filters.airlines.includes(airline)}
                          onCheckedChange={(checked) => handleAirlineFilter(airline, checked as boolean)}
                        />
                        <Label htmlFor={airline} className="text-sm cursor-pointer">
                          {airline}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stops */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Stops</Label>
                  <div className="space-y-2">
                    {[0, 1, 2].map((stops) => (
                      <div key={stops} className="flex items-center space-x-2">
                        <Checkbox
                          id={`stops-${stops}`}
                          checked={filters.stops.includes(stops)}
                          onCheckedChange={(checked) => handleStopsFilter(stops, checked as boolean)}
                        />
                        <Label htmlFor={`stops-${stops}`} className="text-sm cursor-pointer">
                          {stops === 0 ? 'Direct' : stops === 1 ? '1 Stop' : '2+ Stops'}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Flight Results */}
          <div className="lg:w-3/4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Flight Options
                </h2>
                <p className="text-gray-600">
                  {filteredFlights.length} flight{filteredFlights.length !== 1 ? 's' : ''} available for your search
                </p>
              </div>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-airline-blue"></div>
              </div>
            )}

            {error && (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-red-600">Error loading flights. Please try again.</p>
                </CardContent>
              </Card>
            )}

            {!isLoading && !error && filteredFlights.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-gray-600">No flights found matching your criteria.</p>
                  <Button
                    variant="outline"
                    onClick={handleBackToSearch}
                    className="mt-4"
                  >
                    Modify Search
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="space-y-6">
              {filteredFlights.map((flight: any, index: number) => (
                <div key={flight.id} className="transform transition-all duration-200 hover:scale-[1.02]">
                  <FlightCard flight={{...flight, searchParams}} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
