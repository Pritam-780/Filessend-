
import { useState } from "react";
import { useLocation } from "wouter";
import { Lock, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Check admin credentials
    if (username === "crazy_pritam" && password === "@gmail.pritam#") {
      toast({
        title: "Login Successful",
        description: "Welcome to admin panel!",
        className: "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200",
      });
      setLocation("/admin/dashboard");
    } else {
      toast({
        title: "Access Denied",
        description: "Invalid username or password.",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-200">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-br from-blue-100 to-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Lock className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Admin Login
          </h1>
          <p className="text-gray-600 mt-2">Enter your credentials to access admin panel</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <User className="h-4 w-4" />
              Username
            </label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              disabled={isLoading}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg font-medium py-3"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Signing In...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                Sign In
              </div>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
