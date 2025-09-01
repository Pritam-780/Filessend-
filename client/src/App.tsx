import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Category from "@/pages/category";
import Admin from "@/pages/admin";
import AdminDashboard from "@/pages/admin-dashboard";
import NotFound from "@/pages/not-found";
import { NoSignal } from "@/components/no-signal";
import { queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { io } from "socket.io-client";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/category/:categoryId" component={Category} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isWebsiteOnline, setIsWebsiteOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check initial website status
    const checkWebsiteStatus = async () => {
      try {
        const response = await fetch('/api/website/status');
        if (response.ok) {
          const data = await response.json();
          setIsWebsiteOnline(data.isOnline);
        }
      } catch (error) {
        console.error('Failed to check website status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkWebsiteStatus();

    // Set up socket connection for real-time website status updates
    const socket = io();

    socket.on('website-status-changed', (data) => {
      setIsWebsiteOnline(data.isOnline);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Show loading state briefly
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {/* Show NoSignal component when website is offline, but allow admin routes */}
        {!isWebsiteOnline ? (
          <Router>
            <Switch>
              <Route path="/admin" component={Admin} />
              <Route path="/admin/dashboard" component={AdminDashboard} />
              <Route path="*">
                <NoSignal />
              </Route>
            </Switch>
          </Router>
        ) : (
          <Router />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;