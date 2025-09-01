
import { useState } from "react";
import { X, Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPasswordSubmit: (password: string) => void;
}

export default function PasswordModal({ isOpen, onClose, onPasswordSubmit }: PasswordModalProps) {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      toast({
        title: "Password Required",
        description: "Please enter the password to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    // Add a small delay for better UX
    setTimeout(() => {
      onPasswordSubmit(password);
      setIsSubmitting(false);
      setPassword("");
    }, 300);
  };

  const handleClose = () => {
    setPassword("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-red-50 via-white to-orange-50 rounded-xl shadow-2xl max-w-sm w-full border-2 border-red-200">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-red-700 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Security Check
              </h3>
              <Button 
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="p-1 text-gray-500 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mb-4">
              <p className="text-gray-700 text-sm mb-3">
                Please enter the password to confirm this action.
              </p>
              
              <div className="bg-red-100 border border-red-300 rounded-lg p-2 mb-3">
                <p className="text-xs text-red-800 font-medium">
                  This action requires authentication for security purposes.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="password" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="h-8 text-sm border-red-300 focus:border-red-500 focus:ring-red-500"
                  disabled={isSubmitting}
                  required
                  autoComplete="new-password"
                  spellCheck={false}
                />
              </div>
              
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 h-8 text-xs border-gray-300 hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-8 text-xs bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium shadow-lg"
                  disabled={isSubmitting || !password}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-1">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      Verifying...
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Confirm
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
