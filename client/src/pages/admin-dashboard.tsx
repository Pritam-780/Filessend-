
import { useState } from "react";
import { useLocation } from "wouter";
import { Lock, Key, Save, ArrowLeft, Shield, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Chat password states
  const [currentChatPassword, setCurrentChatPassword] = useState("");
  const [newChatPassword, setNewChatPassword] = useState("");
  const [confirmChatPassword, setConfirmChatPassword] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  
  const { toast } = useToast();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Password verification will be handled by the API endpoint

    // Check if new passwords match
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Check if new password is different from current
    if (newPassword === currentPassword) {
      toast({
        title: "Error",
        description: "New password must be different from current password.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (response.ok) {
        toast({
          title: "Password Changed",
          description: "All system passwords have been updated successfully!",
          className: "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to change password.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const handleChatPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingChat(true);

    // Check if new passwords match
    if (newChatPassword !== confirmChatPassword) {
      toast({
        title: "Error",
        description: "New chat passwords do not match.",
        variant: "destructive",
      });
      setIsLoadingChat(false);
      return;
    }

    // Check if new password is different from current
    if (newChatPassword === currentChatPassword) {
      toast({
        title: "Error",
        description: "New chat password must be different from current password.",
        variant: "destructive",
      });
      setIsLoadingChat(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/change-chat-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: currentChatPassword,
          newPassword: newChatPassword,
        }),
      });

      if (response.ok) {
        toast({
          title: "Chat Password Changed",
          description: "Chat room login password has been updated successfully!",
          className: "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200",
        });
        setCurrentChatPassword("");
        setNewChatPassword("");
        setConfirmChatPassword("");
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to change chat password.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    }

    setIsLoadingChat(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            onClick={() => setLocation("/")}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </div>

        {/* Admin Dashboard Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-br from-purple-100 to-indigo-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Shield className="h-10 w-10 text-purple-600" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 mt-2">Manage system passwords and security settings</p>
          </div>

          {/* Change System Password Section */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Key className="h-6 w-6 text-purple-600" />
              Change System Password
            </h2>
            <p className="text-gray-600 mb-6">
              Update the system password used for file uploads, deletions, and link management.
            </p>

            <form onSubmit={handlePasswordChange} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="currentPassword" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Enter your previous password
                </label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="newPassword" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Enter your changed password
                </label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Confirm new password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  disabled={isLoading}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg font-medium py-3"
                disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Updating Password...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Change Password
                  </div>
                )}
              </Button>
            </form>
          </div>

          {/* Change Chat Room Password Section */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-emerald-600" />
              Change Chat Room Login Password
            </h2>
            <p className="text-gray-600 mb-6">
              Update the password required for users to join the chat room.
            </p>

            <form onSubmit={handleChatPasswordChange} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="currentChatPassword" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Enter current chat room password
                </label>
                <Input
                  id="currentChatPassword"
                  type="password"
                  value={currentChatPassword}
                  onChange={(e) => setCurrentChatPassword(e.target.value)}
                  placeholder="Enter current chat password"
                  className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                  disabled={isLoadingChat}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="newChatPassword" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Enter new chat room password
                </label>
                <Input
                  id="newChatPassword"
                  type="password"
                  value={newChatPassword}
                  onChange={(e) => setNewChatPassword(e.target.value)}
                  placeholder="Enter new chat password"
                  className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                  disabled={isLoadingChat}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmChatPassword" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Confirm new chat password
                </label>
                <Input
                  id="confirmChatPassword"
                  type="password"
                  value={confirmChatPassword}
                  onChange={(e) => setConfirmChatPassword(e.target.value)}
                  placeholder="Confirm new chat password"
                  className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                  disabled={isLoadingChat}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-lg font-medium py-3"
                disabled={isLoadingChat || !currentChatPassword || !newChatPassword || !confirmChatPassword}
              >
                {isLoadingChat ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Updating Chat Password...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Change Chat Password
                  </div>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
