import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";

import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import CartSidebar from "@/components/cart/cart-sidebar";
import Home from "@/pages/home";
import Flights from "@/pages/flights";
import Booking from "@/pages/booking";

import Services from "@/pages/services";
import Checkout from "@/pages/checkout";
import Payment from "@/pages/payment";
import OrderSuccess from "@/pages/order-success";
import OrderDetails from "@/pages/order-details";
import MyOrders from "@/pages/my-orders";
import CheckIn from "@/pages/check-in";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/flights" component={Flights} />
      <Route path="/booking/:flightId" component={Booking} />

      <Route path="/services" component={Services} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/payment" component={Payment} />
      <Route path="/order-success/:orderNumber" component={OrderSuccess} />
      <Route path="/order/:orderNumber" component={OrderDetails} />
      <Route path="/my-orders" component={MyOrders} />
      <Route path="/check-in" component={CheckIn} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              <Router />
            </main>
            <Footer />
            <CartSidebar />
          </div>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
