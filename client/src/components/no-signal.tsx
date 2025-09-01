import { useEffect, useState } from "react";
import { Tv } from "lucide-react";

export function NoSignal() {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center space-y-8">
        {/* TV Icon with Static Effect */}
        <div className="relative">
          <Tv 
            className="h-24 w-24 mx-auto text-gray-400" 
            data-testid="icon-no-signal-tv" 
          />
          
          {/* Static noise effect */}
          <div className="absolute inset-0 opacity-20">
            <div className="animate-pulse bg-gray-300 h-24 w-24 mx-auto rounded-lg"></div>
          </div>
        </div>

        {/* No Signal Text */}
        <div className="text-white space-y-4">
          <h1 
            className="text-4xl font-bold tracking-wider" 
            data-testid="text-no-signal-title"
          >
            NO SIGNAL
          </h1>
          
          <p 
            className="text-gray-400 text-lg" 
            data-testid="text-loading-message"
          >
            Please wait{dots}
          </p>
        </div>

        {/* Animated Bars */}
        <div className="flex justify-center space-x-1" data-testid="animation-signal-bars">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-2 bg-gray-600 animate-pulse"
              style={{
                height: `${Math.random() * 40 + 10}px`,
                animationDelay: `${i * 0.2}s`,
                animationDuration: "1s"
              }}
            />
          ))}
        </div>

        {/* System Message */}
        <div className="text-xs text-gray-500 max-w-md mx-auto" data-testid="text-system-message">
          The website is currently offline for maintenance. It will be back online shortly.
        </div>
      </div>
    </div>
  );
}