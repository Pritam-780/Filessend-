
import { useState, useEffect } from "react";
import { User, Globe, BookOpen, Upload, GraduationCap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NamePromptModalProps {
  isOpen: boolean;
  onSubmit: (name: string) => void;
}

export default function NamePromptModal({ isOpen, onSubmit }: NamePromptModalProps) {
  const [name, setName] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={`bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl transform transition-all duration-500 ${
        isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        {/* Animated Header */}
        <div className="text-center mb-8">
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl animate-pulse">
              <User className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-bounce">
              <Sparkles className="h-4 w-4 text-yellow-600 m-1" />
            </div>
          </div>

          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Welcome to Academic Avengers! 🎓
          </h2>
          
          <p className="text-gray-600 text-lg leading-relaxed">
            Before you explore our amazing platform, please tell us your name
          </p>
        </div>

        {/* Features Showcase */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <span className="text-blue-800 font-medium">📚 Academic Resources & Study Materials</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
            <Upload className="h-5 w-5 text-green-600" />
            <span className="text-green-800 font-medium">📤 Easy File Upload & Sharing</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
            <GraduationCap className="h-5 w-5 text-purple-600" />
            <span className="text-purple-800 font-medium">🎯 Focused Learning Experience</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl">
            <Globe className="h-5 w-5 text-orange-600" />
            <span className="text-orange-800 font-medium">🌍 Connect with Fellow Students</span>
          </div>
        </div>

        {/* Name Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              What should we call you?
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name..."
              className="border-2 border-blue-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl text-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50"
              required
              autoFocus
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 shadow-xl font-bold py-4 text-lg rounded-xl transform hover:scale-105 transition-all duration-300"
            disabled={!name.trim()}
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <Sparkles className="h-5 w-5" />
              </div>
              <span>✨ Enter Academic Avengers</span>
            </div>
          </Button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            🔒 Your privacy is important to us. We only collect your name for a personalized experience.
          </p>
        </div>
      </div>
    </div>
  );
}
