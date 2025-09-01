import { useEffect, useState } from "react";
import { Tv, Wifi, WifiOff, Power, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface NoSignalProps {
  onTurnOn?: () => void;
}

function NoSignal({ onTurnOn }: NoSignalProps) {
  const [dots, setDots] = useState("");
  const [staticNoise, setStaticNoise] = useState(0);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const { toast } = useToast();

  const handleButtonClick = () => {
    const newClickCount = clickCount + 1;
    setClickCount(newClickCount);
    
    if (newClickCount >= 35) {
      setShowPasswordInput(true);
      toast({
        title: "Password Required",
        description: "Enter the password to activate the website.",
        variant: "default",
      });
    } else {
      toast({
        title: `Please wait...`,
        description: `Click ${35 - newClickCount} more times to continue.`,
        variant: "default",
      });
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      toast({
        title: "Password Required",
        description: "Please enter the password to turn on the website.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if the password is correct
      if (password === "@gmail.pritam@") {
        // Call the API to turn the website online for everyone
        const response = await fetch('/api/admin/toggle-website', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isOnline: true })
        });

        if (response.ok) {
          toast({
            title: "Website Activated",
            description: "Website is now online for everyone!",
            variant: "default",
          });
          
          // The website will automatically update via WebSocket
          // Call the onTurnOn callback if provided
          if (onTurnOn) {
            setTimeout(() => {
              onTurnOn();
            }, 1000);
          }
        } else {
          throw new Error('Failed to activate website');
        }
      } else {
        toast({
          title: "Access Denied",
          description: "Incorrect password. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setPassword("");
    }
  };

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 500);

    const noiseInterval = setInterval(() => {
      setStaticNoise(Math.random());
    }, 100);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(noiseInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center animate-fadeIn">
      <div className="text-center space-y-8 animate-slideUp">
        {/* TV Icon with Enhanced Static Effect */}
        <div className="relative">
          <div className="relative z-10">
            <Tv 
              className="h-32 w-32 mx-auto text-gray-400 animate-pulse" 
              data-testid="icon-no-signal-tv" 
            />
          </div>

          {/* Enhanced static noise effect */}
          <div className="absolute inset-0 opacity-30">
            <div 
              className="bg-gray-300 h-32 w-32 mx-auto rounded-lg transition-opacity duration-100"
              style={{ opacity: staticNoise * 0.5 }}
            />
          </div>

          {/* Glitch effect */}
          <div className="absolute inset-0 opacity-20 animate-pulse">
            <div className="bg-red-500 h-1 w-32 mx-auto mb-4 animate-bounce"></div>
            <div className="bg-blue-500 h-1 w-32 mx-auto animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>

        {/* No Signal Text with Glitch Effect */}
        <div className="text-white space-y-6">
          <h1 
            className="text-6xl font-bold tracking-wider animate-pulse relative" 
            data-testid="text-no-signal-title"
          >
            <span className="relative z-10">NO SIGNAL</span>
            <div className="absolute inset-0 text-red-500 opacity-20 animate-ping">NO SIGNAL</div>
          </h1>

          <div className="flex items-center justify-center gap-3">
            <WifiOff className="h-6 w-6 text-red-400 animate-bounce" />
            <p 
              className="text-gray-400 text-xl font-mono" 
              data-testid="text-loading-message"
            >
              Connection Lost{dots}
            </p>
            <WifiOff className="h-6 w-6 text-red-400 animate-bounce" style={{ animationDelay: '0.5s' }} />
          </div>
        </div>

        {/* Enhanced Animated Bars */}
        <div className="flex justify-center space-x-2" data-testid="animation-signal-bars">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="w-3 bg-gray-600 rounded-t-sm transition-all duration-300"
              style={{
                height: `${(Math.sin(Date.now() / 500 + i) + 1) * 30 + 10}px`,
                animationDelay: `${i * 0.1}s`,
                opacity: 0.3 + (Math.random() * 0.7)
              }}
            />
          ))}
        </div>

        {/* Enhanced System Message */}
        <div className="space-y-4">
          <div className="text-red-400 text-lg font-bold animate-pulse" data-testid="text-system-message">
            ⚠️ WEBSITE OFFLINE ⚠️
          </div>
          <div className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
            The website is currently offline for maintenance.<br />
            Please wait while we restore the connection.
          </div>
        </div>

        {/* Scanning Effect */}
        <div className="relative w-full max-w-md mx-auto h-2 bg-gray-800 rounded-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500 to-transparent h-full animate-pulse"></div>
          <div className="absolute w-full h-full">
            <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-slideRight"></div>
          </div>
        </div>

        {/* Please Wait Button */}
        {!showPasswordInput ? (
          <div className="mt-8">
            <Button
              onClick={handleButtonClick}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold px-8 py-3 rounded-lg shadow-xl transform transition-all duration-300 hover:scale-105 animate-pulse"
              data-testid="button-please-wait"
            >
              <Power className="h-5 w-5 mr-2" />
              Please Wait
            </Button>
          </div>
        ) : (
          <div className="mt-8 w-full max-w-sm mx-auto">
            <div className="bg-gray-900 bg-opacity-80 backdrop-blur-sm rounded-xl p-6 border border-gray-700 shadow-2xl">
              <div className="text-center mb-4">
                <Lock className="h-8 w-8 mx-auto text-green-400 mb-2" />
                <h3 className="text-white text-lg font-bold">Enter Access Code</h3>
                <p className="text-gray-400 text-sm">Password required to activate website</p>
              </div>
              
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full h-12 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-green-500 focus:ring-green-500 rounded-lg text-center font-mono"
                    disabled={isSubmitting}
                    required
                  />
                </div>
                
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowPasswordInput(false);
                      setPassword("");
                    }}
                    className="flex-1 h-12 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold shadow-lg"
                    disabled={isSubmitting || !password}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Activating...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Power className="h-4 w-4" />
                        Activate
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Custom CSS animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @keyframes slideRight {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }

        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.6s ease-out;
        }

        .animate-slideRight {
          animation: slideRight 2s infinite linear;
        }
      `}</style>
    </div>
  );
}

export default NoSignal;