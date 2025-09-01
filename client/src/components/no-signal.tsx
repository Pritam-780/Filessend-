import { useEffect, useState } from "react";
import { Tv, Wifi, WifiOff } from "lucide-react";

export function NoSignal() {
  const [dots, setDots] = useState("");
  const [staticNoise, setStaticNoise] = useState(0);

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
      </div>
      
      {/* Custom CSS animations */}
      <style jsx>{`
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