import React, { useEffect, useState } from 'react';

export function NoSignal() {
  const [animationTime, setAnimationTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationTime(Date.now());
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex flex-col items-center justify-center p-8 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:50px_50px] opacity-20"></div>

      <div className="relative z-10 text-center space-y-8 max-w-lg">
        {/* TV Static Effect */}
        <div className="relative mx-auto w-80 h-48 bg-black rounded-lg border-4 border-gray-700 shadow-2xl overflow-hidden">
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              background: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(255,255,255,0.03) 2px,
                rgba(255,255,255,0.03) 4px
              ), repeating-linear-gradient(
                90deg,
                transparent,
                transparent 2px,
                rgba(255,255,255,0.03) 2px,
                rgba(255,255,255,0.03) 4px
              )`,
              animation: 'flicker 0.15s infinite linear alternate'
            }}
          ></div>

          {/* Static noise */}
          <div className="absolute inset-0 opacity-60 animate-pulse">
            {[...Array(100)].map((_, i) => (
              <div
                key={i}
                className="absolute bg-white rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  width: `${Math.random() * 3 + 1}px`,
                  height: `${Math.random() * 3 + 1}px`,
                  opacity: Math.random() * 0.8,
                  animation: `flicker ${Math.random() * 0.5 + 0.1}s infinite`
                }}
              />
            ))}
          </div>
        </div>

        {/* Enhanced Animated Bars */}
        <div className="flex justify-center space-x-2" data-testid="animation-signal-bars">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="w-3 bg-gray-600 rounded-t-sm transition-all duration-300"
              style={{
                height: `${(Math.sin(animationTime / 500 + i) + 1) * 30 + 10}px`,
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

        {/* Status Indicator */}
        <div className="flex items-center justify-center space-x-2 text-gray-500 text-xs">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
          <span>Attempting to reconnect...</span>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes flicker {
            0% { opacity: 0.8; }
            100% { opacity: 0.3; }
          }

          @keyframes slideRight {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
          }

          .animate-slideRight {
            animation: slideRight 2s ease-in-out infinite;
          }
        `
      }} />
    </div>
  );
}