
import { useState, useEffect } from "react";
import { User, Globe, BookOpen, Upload, GraduationCap, Sparkles, Star, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NamePromptModalProps {
  isOpen: boolean;
  onSubmit: (name: string) => void;
}

export default function NamePromptModal({ isOpen, onSubmit }: NamePromptModalProps) {
  const [name, setName] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      setTimeout(() => setShowFeatures(true), 300);
    } else {
      setShowFeatures(false);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/70 via-purple-900/30 to-black/70 backdrop-blur-lg flex items-center justify-center z-50 p-4">
      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          >
            <Star className="h-2 w-2 text-yellow-300/40" />
          </div>
        ))}
      </div>

      <div className={`relative bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl border border-white/20 transform transition-all duration-700 ${
        isAnimating ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-8'
      }`}>
        
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/50 rounded-3xl"></div>
        
        {/* Content */}
        <div className="relative z-10">
          {/* Animated Header */}
          <div className="text-center mb-8">
            <div className="relative mb-6">
              {/* Main avatar with pulsing animation */}
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full animate-pulse shadow-2xl"></div>
                <div className="absolute inset-1 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                  <User className="h-12 w-12 text-white drop-shadow-lg" />
                </div>
                
                {/* Floating decorative elements */}
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full animate-bounce shadow-lg flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full animate-pulse shadow-lg flex items-center justify-center">
                  <Heart className="h-3 w-3 text-white" />
                </div>
              </div>

              {/* Title with gradient text */}
              <div className="space-y-3">
                <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-tight">
                  Welcome to Academic Avengers! 🎓
                </h1>
                
                <p className="text-gray-600 text-lg font-medium leading-relaxed max-w-md mx-auto">
                  Before you explore our amazing platform, please tell us your name
                </p>
              </div>
            </div>
          </div>

          {/* Enhanced Features Showcase */}
          <div className={`mb-8 space-y-4 transition-all duration-500 ${showFeatures ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {[
              { icon: BookOpen, text: "📚 Academic Resources & Study Materials", colors: "from-blue-50 to-blue-100 border-blue-200", iconColor: "text-blue-600" },
              { icon: Upload, text: "📤 Easy File Upload & Sharing", colors: "from-green-50 to-emerald-100 border-green-200", iconColor: "text-green-600" },
              { icon: GraduationCap, text: "🎯 Focused Learning Experience", colors: "from-purple-50 to-pink-100 border-purple-200", iconColor: "text-purple-600" },
              { icon: Globe, text: "🌍 Connect with Fellow Students", colors: "from-orange-50 to-red-100 border-orange-200", iconColor: "text-orange-600" }
            ].map((feature, index) => (
              <div 
                key={index}
                className={`flex items-center gap-4 p-4 bg-gradient-to-r ${feature.colors} rounded-2xl border transition-all duration-300 hover:scale-105 hover:shadow-lg`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`p-2 bg-white rounded-xl shadow-sm ${feature.iconColor}`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <span className="font-semibold text-gray-800 text-sm">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Enhanced Name Input Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="text-base font-bold text-gray-700 flex items-center gap-3 justify-center">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                  <User className="h-5 w-5 text-white" />
                </div>
                What should we call you?
              </label>
              
              <div className="relative">
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name..."
                  className="border-2 border-gray-200 focus:border-purple-400 focus:ring-purple-400 focus:ring-2 rounded-2xl text-lg p-6 bg-gradient-to-r from-gray-50 to-gray-100 font-medium transition-all duration-300 hover:border-purple-300 placeholder:text-gray-400"
                  required
                  autoFocus
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <Sparkles className="h-5 w-5 text-purple-400" />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 shadow-2xl font-bold py-6 text-lg rounded-2xl transform hover:scale-105 transition-all duration-300 border-0 focus:ring-4 focus:ring-purple-300"
              disabled={!name.trim()}
            >
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                  <Sparkles className="h-6 w-6" />
                </div>
                <span className="text-xl">✨ Enter Academic Avengers</span>
              </div>
            </Button>
          </form>

          {/* Enhanced Footer */}
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 bg-gray-50/50 rounded-full px-4 py-2 backdrop-blur-sm border border-gray-200/50">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>🔒 Your privacy is important to us. We only collect your name for a personalized experience.</span>
            </div>
          </div>
        </div>

        {/* Decorative corner elements */}
        <div className="absolute top-4 right-4 w-12 h-12 bg-gradient-to-br from-yellow-200 to-yellow-300 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute bottom-4 left-4 w-8 h-8 bg-gradient-to-br from-pink-200 to-pink-300 rounded-full opacity-20 animate-pulse"></div>
      </div>
    </div>
  );
}
