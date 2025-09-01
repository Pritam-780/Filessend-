import { Route, Switch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/home";
import Category from "@/pages/category";
import Admin from "@/pages/admin";
import AdminDashboard from "@/pages/admin-dashboard";
import NotFound from "@/pages/not-found";
import NoSignal from "@/components/no-signal";
import AnnouncementModal from "@/components/announcement-modal";
import NamePromptModal from "@/components/name-prompt-modal";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

const queryClient = new QueryClient();

export default function App() {
  const [isWebsiteOnline, setIsWebsiteOnline] = useState<boolean | null>(null);
  const [announcement, setAnnouncement] = useState<any>(null);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [visitorName, setVisitorName] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    // Check website status
    const checkWebsiteStatus = async () => {
      try {
        const response = await fetch('/api/website/status');
        if (response.ok) {
          const data = await response.json();
          setIsWebsiteOnline(data.isOnline);
        }
      } catch (error) {
        console.error('Failed to check website status:', error);
        setIsWebsiteOnline(true); // Default to online if check fails
      }
    };

    // Check for announcements
    const checkAnnouncement = async () => {
      try {
        const response = await fetch('/api/announcement');
        if (response.ok) {
          const data = await response.json();
          setAnnouncement(data.announcement);
        }
      } catch (error) {
        console.error('Failed to check announcement:', error);
      }
    };

    // Check visitor status and IP blocking
    const checkVisitorStatus = async () => {
      try {
        const response = await fetch('/api/visitor/check');
        if (response.ok) {
          const data = await response.json();
          if (data.isBlocked) {
            setIsBlocked(true);
            return;
          }

          // Always show name prompt (uncomment the line below to enable)
          // setShowNamePrompt(true);
          
          const storedName = localStorage.getItem('visitorName');
          if (storedName) {
            setVisitorName(storedName);
            // Update visitor info with stored name
            await fetch('/api/visitor/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: storedName })
            });
          } else {
            setShowNamePrompt(true);
          }
        }
      } catch (error) {
        console.error('Failed to check visitor status:', error);
        // Show name prompt as fallback
        const storedName = localStorage.getItem('visitorName');
        if (!storedName) {
          setShowNamePrompt(true);
        } else {
          setVisitorName(storedName);
        }
      }
    };

    // Set up WebSocket connection for real-time updates
    const socket: Socket = io('/', {
      path: '/ws'
    });

    // Listen for real-time website status changes
    socket.on('website-status-changed', (data) => {
      console.log('Website status changed:', data);
      setIsWebsiteOnline(data.isOnline);
    });

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    checkWebsiteStatus();
    checkAnnouncement();
    checkVisitorStatus();

    // Cleanup function
    return () => {
      socket.disconnect();
    };
  }, []);

  const handleNameSubmit = async (name: string) => {
    try {
      setVisitorName(name);
      localStorage.setItem('visitorName', name);
      setShowNamePrompt(false);

      // Send visitor info to server
      await fetch('/api/visitor/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
    } catch (error) {
      console.error('Failed to register visitor:', error);
      // Still allow access even if registration fails
      setShowNamePrompt(false);
    }
  };

  // Show blocked page if IP is blocked
  if (isBlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-red-100 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-2xl shadow-2xl max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🚫</span>
          </div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Blocked</h1>
          <p className="text-gray-600">Your IP address has been blocked by the administrator.</p>
          <p className="text-sm text-gray-500 mt-2">Please contact support if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  // Show no signal page if website is offline
  if (isWebsiteOnline === false) {
    return <NoSignal onTurnOn={() => setIsWebsiteOnline(true)} />;
  }

  // Show loading while checking status
  if (isWebsiteOnline === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        {/* Always allow admin routes regardless of website status */}
        <Route path="/admin" component={Admin} />
        <Route path="/admin/dashboard" component={AdminDashboard} />

        {/* If website is online, show normal routes */}
        {isWebsiteOnline ? (
          <>
            <Route path="/" component={Home} />
            <Route path="/category/:categoryId" component={Category} />
            <Route component={NotFound} />
          </>
        ) : (
          /* If website is offline, show NoSignal for all other routes */
          <Route path="*">
            <NoSignal />
          </Route>
        )}
      </Switch>
      <Toaster />
      <AnnouncementModal
        announcement={announcement}
        onClose={() => setAnnouncement(null)}
      />
      <NamePromptModal
        isOpen={showNamePrompt}
        onSubmit={handleNameSubmit}
      />
    </QueryClientProvider>
  );
}