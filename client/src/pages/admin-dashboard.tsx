import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Lock, Key, Save, ArrowLeft, Shield, MessageCircle, Upload, Trash2, Link, FileText, ChevronDown, ChevronRight, Megaphone, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // State for tracking which sections are expanded
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  // Password states for each operation
  const [fileUploadPassword, setFileUploadPassword] = useState("");
  const [confirmFileUploadPassword, setConfirmFileUploadPassword] = useState("");
  const [isLoadingFileUpload, setIsLoadingFileUpload] = useState(false);

  const [fileDeletePassword, setFileDeletePassword] = useState("");
  const [confirmFileDeletePassword, setConfirmFileDeletePassword] = useState("");
  const [isLoadingFileDelete, setIsLoadingFileDelete] = useState(false);

  const [linkUploadPassword, setLinkUploadPassword] = useState("");
  const [confirmLinkUploadPassword, setConfirmLinkUploadPassword] = useState("");
  const [isLoadingLinkUpload, setIsLoadingLinkUpload] = useState(false);

  const [linkDeletePassword, setLinkDeletePassword] = useState("");
  const [confirmLinkDeletePassword, setConfirmLinkDeletePassword] = useState("");
  const [isLoadingLinkDelete, setIsLoadingLinkDelete] = useState(false);

  const [chatPassword, setChatPassword] = useState("");
  const [confirmChatPassword, setConfirmChatPassword] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  // Website status states
  const [isWebsiteOnline, setIsWebsiteOnline] = useState(true);
  const [isLoadingWebsiteToggle, setIsLoadingWebsiteToggle] = useState(false);

  // Announcement states
  const [currentAnnouncement, setCurrentAnnouncement] = useState<any>(null);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [isLoadingAnnouncement, setIsLoadingAnnouncement] = useState(false);

  // IP blocking states
  const [trackedIPs, setTrackedIPs] = useState<string[]>([]);
  const [isLoadingIPs, setIsLoadingIPs] = useState(false);

  // Load initial website status and announcements
  useEffect(() => {
    const loadWebsiteStatus = async () => {
      try {
        const response = await fetch('/api/website/status');
        if (response.ok) {
          const data = await response.json();
          setIsWebsiteOnline(data.isOnline);
        }
      } catch (error) {
        console.error('Failed to load website status:', error);
      }
    };

    const loadCurrentAnnouncement = async () => {
      try {
        const response = await fetch('/api/announcement');
        if (response.ok) {
          const data = await response.json();
          setCurrentAnnouncement(data.announcement);
        }
      } catch (error) {
        console.error('Failed to load announcement:', error);
      }
    };

    const loadTrackedIPs = async () => {
      setIsLoadingIPs(true);
      try {
        const response = await fetch('/api/admin/tracked-ips');
        if (response.ok) {
          const data = await response.json();
          setTrackedIPs(data.trackedIPs);
        }
      } catch (error) {
        console.error('Failed to load tracked IPs:', error);
      } finally {
        setIsLoadingIPs(false);
      }
    };

    loadWebsiteStatus();
    loadCurrentAnnouncement();
    loadTrackedIPs();
  }, []);

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const isExpanded = (sectionId: string) => expandedSections.includes(sectionId);

  // Generic password change handler
  const handlePasswordChange = async (
    e: React.FormEvent,
    endpoint: string,
    newPassword: string,
    confirmPassword: string,
    setIsLoading: (loading: boolean) => void,
    setNewPassword: (password: string) => void,
    setConfirmPassword: (password: string) => void,
    operationName: string
  ) => {
    e.preventDefault();
    setIsLoading(true);

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 3) {
      toast({
        title: "Error",
        description: "Password must be at least 3 characters long.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newPassword,
        }),
      });

      if (response.ok) {
        toast({
          title: "Password Changed",
          description: `${operationName} password has been updated successfully!`,
          className: "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200",
        });
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || `Failed to change ${operationName.toLowerCase()} password.`,
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

  // Individual handlers for each password type
  const handleFileUploadPasswordChange = (e: React.FormEvent) =>
    handlePasswordChange(
      e,
      '/api/admin/change-file-upload-password',
      fileUploadPassword,
      confirmFileUploadPassword,
      setIsLoadingFileUpload,
      setFileUploadPassword,
      setConfirmFileUploadPassword,
      'File Upload'
    );

  const handleFileDeletePasswordChange = (e: React.FormEvent) =>
    handlePasswordChange(
      e,
      '/api/admin/change-file-delete-password',
      fileDeletePassword,
      confirmFileDeletePassword,
      setIsLoadingFileDelete,
      setFileDeletePassword,
      setConfirmFileDeletePassword,
      'File Delete'
    );

  const handleLinkUploadPasswordChange = (e: React.FormEvent) =>
    handlePasswordChange(
      e,
      '/api/admin/change-link-upload-password',
      linkUploadPassword,
      confirmLinkUploadPassword,
      setIsLoadingLinkUpload,
      setLinkUploadPassword,
      setConfirmLinkUploadPassword,
      'Link Upload'
    );

  const handleLinkDeletePasswordChange = (e: React.FormEvent) =>
    handlePasswordChange(
      e,
      '/api/admin/change-link-delete-password',
      linkDeletePassword,
      confirmLinkDeletePassword,
      setIsLoadingLinkDelete,
      setLinkDeletePassword,
      setConfirmLinkDeletePassword,
      'Link Delete'
    );

  const handleChatPasswordChange = (e: React.FormEvent) =>
    handlePasswordChange(
      e,
      '/api/admin/change-chat-password',
      chatPassword,
      confirmChatPassword,
      setIsLoadingChat,
      setChatPassword,
      setConfirmChatPassword,
      'Chat Room'
    );

  // Website toggle handler
  const handleWebsiteToggle = async () => {
    setIsLoadingWebsiteToggle(true);
    try {
      const response = await fetch('/api/admin/toggle-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isOnline: !isWebsiteOnline,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsWebsiteOnline(data.isOnline);
        toast({
          title: data.isOnline ? "Website Enabled" : "Website Disabled",
          description: data.message,
          className: data.isOnline 
            ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
            : "bg-gradient-to-r from-red-50 to-rose-50 border-red-200",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to toggle website status.",
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
    setIsLoadingWebsiteToggle(false);
  };

  // Announcement handlers
  const handleAnnouncementCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingAnnouncement(true);

    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      toast({
        title: "Error",
        description: "Title and message are required.",
        variant: "destructive",
      });
      setIsLoadingAnnouncement(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/announcement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: announcementTitle,
          message: announcementMessage,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentAnnouncement(data.announcement);
        setAnnouncementTitle("");
        setAnnouncementMessage("");
        toast({
          title: "Announcement Created",
          description: "Your announcement has been posted successfully!",
          className: "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to create announcement.",
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

    setIsLoadingAnnouncement(false);
  };

  const handleAnnouncementDelete = async () => {
    setIsLoadingAnnouncement(true);

    try {
      const response = await fetch('/api/admin/announcement', {
        method: 'DELETE',
      });

      if (response.ok) {
        setCurrentAnnouncement(null);
        toast({
          title: "Announcement Deleted",
          description: "The announcement has been removed successfully!",
          className: "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to delete announcement.",
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

    setIsLoadingAnnouncement(false);
  };

  // IP blocking handlers
  const handleBlockIP = async (ip: string) => {
    setIsLoadingIPs(true);
    try {
      const response = await fetch('/api/admin/block-ip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ip }),
      });

      if (response.ok) {
        toast({
          title: "IP Blocked",
          description: `IP address ${ip} has been blocked successfully!`,
          className: "bg-gradient-to-r from-red-50 to-rose-50 border-red-200",
        });
        // Reload tracked IPs
        const ipResponse = await fetch('/api/admin/tracked-ips');
        if (ipResponse.ok) {
          const data = await ipResponse.json();
          setTrackedIPs(data.trackedIPs);
        }
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to block IP address.",
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
    setIsLoadingIPs(false);
  };

  const handleUnblockIP = async (ip: string) => {
    setIsLoadingIPs(true);
    try {
      const response = await fetch('/api/admin/unblock-ip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ip }),
      });

      if (response.ok) {
        toast({
          title: "IP Unblocked",
          description: `IP address ${ip} has been unblocked successfully!`,
          className: "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200",
        });
        // Reload tracked IPs
        const ipResponse = await fetch('/api/admin/tracked-ips');
        if (ipResponse.ok) {
          const data = await ipResponse.json();
          setTrackedIPs(data.trackedIPs);
        }
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to unblock IP address.",
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
    setIsLoadingIPs(false);
  };

  // Component for rendering collapsible password sections
  const CollapsiblePasswordSection = ({
    sectionId,
    title,
    description,
    icon: Icon,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    onSubmit,
    isLoading,
    colorScheme,
  }: {
    sectionId: string;
    title: string;
    description: string;
    icon: any;
    newPassword: string;
    setNewPassword: (password: string) => void;
    confirmPassword: string;
    setConfirmPassword: (password: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    isLoading: boolean;
    colorScheme: string;
  }) => {
    const expanded = isExpanded(sectionId);

    return (
      <div className={`border border-${colorScheme}-200 rounded-xl mb-4 overflow-hidden transition-all duration-300`}>
        {/* Header - Always visible */}
        <div 
          className={`bg-gradient-to-r from-${colorScheme}-50 to-${colorScheme}-100 p-4 cursor-pointer hover:from-${colorScheme}-100 hover:to-${colorScheme}-150 transition-all duration-200`}
          onClick={() => toggleSection(sectionId)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon className={`h-5 w-5 text-${colorScheme}-600`} />
              <div>
                <h3 className="font-bold text-gray-800 text-lg">{title}</h3>
                <p className="text-gray-600 text-sm">{description}</p>
              </div>
            </div>
            <div className="transition-transform duration-200">
              {expanded ? (
                <ChevronDown className={`h-5 w-5 text-${colorScheme}-600`} />
              ) : (
                <ChevronRight className={`h-5 w-5 text-${colorScheme}-600`} />
              )}
            </div>
          </div>
        </div>

        {/* Content - Collapsible */}
        <div className={`transition-all duration-300 ease-in-out ${expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
          <div className="p-4 bg-white">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  New Password
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className={`border-gray-300 focus:border-${colorScheme}-500 focus:ring-${colorScheme}-500`}
                  disabled={isLoading}
                  required
                  data-testid={`input-${title.toLowerCase().replace(/\s+/g, '-')}-password`}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Confirm Password
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className={`border-gray-300 focus:border-${colorScheme}-500 focus:ring-${colorScheme}-500`}
                  disabled={isLoading}
                  required
                  data-testid={`input-confirm-${title.toLowerCase().replace(/\s+/g, '-')}-password`}
                />
              </div>

              <Button
                type="submit"
                className={`w-full bg-gradient-to-r from-${colorScheme}-600 to-${colorScheme}-700 text-white hover:from-${colorScheme}-700 hover:to-${colorScheme}-800 shadow-lg font-medium py-2`}
                disabled={isLoading || !newPassword || !confirmPassword}
                data-testid={`button-change-${title.toLowerCase().replace(/\s+/g, '-')}-password`}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Updating...
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
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            onClick={() => setLocation("/")}
            variant="outline"
            className="flex items-center gap-2"
            data-testid="button-back-home"
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
            <p className="text-gray-600 mt-2">Manage individual passwords for different system operations</p>
            <p className="text-sm text-gray-500 mt-2">Click on any section below to expand password settings</p>
          </div>

          {/* Announcement Management Section */}
          <div className="mb-8 border border-orange-200 rounded-2xl overflow-hidden shadow-xl transition-all duration-300">
            {/* Header - Always visible with clickable arrow */}
            <div 
              className="bg-gradient-to-r from-orange-50 to-red-50 p-6 cursor-pointer hover:from-orange-100 hover:to-red-100 transition-all duration-300 border-b border-orange-200"
              onClick={() => toggleSection('announcement')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-orange-100 to-red-100 w-16 h-16 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                    <Megaphone className="h-8 w-8 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                      📢 Announcement Center
                    </h3>
                    <p className="text-gray-600 text-lg">Create stunning announcements with style</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-ping"></div>
                      <span className="text-sm text-orange-600 font-medium">
                        {currentAnnouncement ? 'Active announcement live' : 'No active announcements'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div className="text-center">
                    <p className="text-sm font-bold text-orange-600 animate-bounce">Click to {isExpanded('announcement') ? 'Close' : 'Open'}</p>
                    <div className="flex justify-center">
                      <div className={`transform transition-transform duration-300 ${isExpanded('announcement') ? 'rotate-180' : ''}`}>
                        <ChevronDown className="h-8 w-8 text-orange-600 animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content - Collapsible */}
            <div className={`transition-all duration-500 ease-in-out ${isExpanded('announcement') ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
              <div className="p-6 bg-white">
                {/* Current Announcement Display */}
                {currentAnnouncement ? (
                  <div className="mb-6 p-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-200 shadow-lg animate-fadeInUp">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          <h4 className="font-bold text-gray-800 text-xl">📢 {currentAnnouncement.title}</h4>
                        </div>
                        <p className="text-gray-700 mb-3 leading-relaxed">{currentAnnouncement.message}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                          Posted: {new Date(currentAnnouncement.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <Button
                        onClick={handleAnnouncementDelete}
                        disabled={isLoadingAnnouncement}
                        className="bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-600 hover:to-rose-600 shadow-lg transform hover:scale-105 transition-all duration-200"
                        size="sm"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 p-6 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-200 shadow-md">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Megaphone className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">No active announcement</p>
                      <p className="text-sm text-gray-400">Create one below to notify all users</p>
                    </div>
                  </div>
                )}

                {/* Create New Announcement Form */}
                <div className="bg-gradient-to-br from-orange-50 via-white to-red-50 p-6 rounded-xl border border-orange-200 shadow-lg">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-md">
                      <Plus className="h-5 w-5 text-white" />
                    </div>
                    <h4 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                      {currentAnnouncement ? 'Update Announcement' : 'Create New Announcement'}
                    </h4>
                  </div>

                  <form onSubmit={handleAnnouncementCreate} className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        Announcement Title
                      </label>
                      <Input
                        type="text"
                        value={announcementTitle}
                        onChange={(e) => setAnnouncementTitle(e.target.value)}
                        placeholder="Enter a catchy announcement title..."
                        className="border-orange-300 focus:border-orange-500 focus:ring-orange-500 bg-white shadow-md text-lg"
                        disabled={isLoadingAnnouncement}
                        required
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        Announcement Message
                      </label>
                      <textarea
                        value={announcementMessage}
                        onChange={(e) => setAnnouncementMessage(e.target.value)}
                        placeholder="Write your exciting announcement message here..."
                        className="w-full min-h-[150px] px-4 py-3 border border-orange-300 rounded-xl focus:border-orange-500 focus:ring-orange-500 focus:ring-2 focus:outline-none resize-none bg-white shadow-md text-lg leading-relaxed"
                        disabled={isLoadingAnnouncement}
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white hover:from-orange-600 hover:via-red-600 hover:to-pink-600 shadow-2xl font-bold py-4 text-lg rounded-xl transform hover:scale-105 transition-all duration-300"
                      disabled={isLoadingAnnouncement || !announcementTitle || !announcementMessage}
                    >
                      {isLoadingAnnouncement ? (
                        <div className="flex items-center gap-3">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                          <span className="animate-pulse">{currentAnnouncement ? 'Updating Announcement...' : 'Creating Magic...'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="bg-white/20 p-2 rounded-full">
                            {currentAnnouncement ? <Megaphone className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                          </div>
                          <span>{currentAnnouncement ? '🔄 Update Announcement' : '✨ Create Announcement'}</span>
                        </div>
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* Website Control Section */}
          <div className="mb-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 shadow-lg">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-indigo-100 to-purple-100 w-12 h-12 rounded-full flex items-center justify-center shadow-md">
                  <Shield className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="text-xl font-bold text-gray-800">Website Control</h3>
                  <p className="text-gray-600">Turn the website on or off for all users</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                  isWebsiteOnline 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  Status: {isWebsiteOnline ? 'ONLINE' : 'OFFLINE'}
                </div>

                <Button
                  onClick={handleWebsiteToggle}
                  disabled={isLoadingWebsiteToggle}
                  className={`px-8 py-3 rounded-xl text-lg font-bold shadow-xl transform hover:scale-105 transition-all duration-300 ${
                    isWebsiteOnline
                      ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700'
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
                  }`}
                >
                  {isLoadingWebsiteToggle ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Processing...
                    </div>
                  ) : (
                    <>
                      {isWebsiteOnline ? 'Turn Website OFF' : 'Turn Website ON'}
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-700 text-sm">
                <strong>Note:</strong> When the website is turned off, all users will see a "No Signal" page instead of the main content.
              </p>
            </div>
          </div>

          {/* IP Address Management Section */}
          <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200 shadow-lg">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-100 to-cyan-100 w-12 h-12 rounded-full flex items-center justify-center shadow-md">
                <Lock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  IP Address Management
                </h3>
                <p className="text-gray-600 text-lg">Monitor and manage access by IP address</p>
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg border border-blue-100 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Tracked IP Addresses</h4>
              {isLoadingIPs ? (
                <p className="text-gray-500">Loading IPs...</p>
              ) : trackedIPs.length > 0 ? (
                <ul className="space-y-3 max-h-64 overflow-y-auto pr-3">
                  {trackedIPs.map((ip) => (
                    <li key={ip} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-md shadow-xs">
                      <span className="font-medium text-blue-700">{ip}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleUnblockIP(ip)}
                          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md text-sm px-3 py-1"
                          size="sm"
                        >
                          Unblock
                        </Button>
                        <Button
                          onClick={() => handleBlockIP(ip)}
                          className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white shadow-md text-sm px-3 py-1"
                          size="sm"
                        >
                          Block
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No IP addresses have accessed the system yet.</p>
              )}
            </div>
          </div>

          {/* Collapsible Password Sections */}
          <div className="space-y-4">
            {/* File Upload Password */}
            <CollapsiblePasswordSection
              sectionId="file-upload"
              title="File Upload Password"
              description="Password required for uploading new files to the system"
              icon={Upload}
              newPassword={fileUploadPassword}
              setNewPassword={setFileUploadPassword}
              confirmPassword={confirmFileUploadPassword}
              setConfirmPassword={setConfirmFileUploadPassword}
              onSubmit={handleFileUploadPasswordChange}
              isLoading={isLoadingFileUpload}
              colorScheme="blue"
            />

            {/* File Delete Password */}
            <CollapsiblePasswordSection
              sectionId="file-delete"
              title="File Delete Password"
              description="Password required for deleting files from the system"
              icon={Trash2}
              newPassword={fileDeletePassword}
              setNewPassword={setFileDeletePassword}
              confirmPassword={confirmFileDeletePassword}
              setConfirmPassword={setConfirmFileDeletePassword}
              onSubmit={handleFileDeletePasswordChange}
              isLoading={isLoadingFileDelete}
              colorScheme="red"
            />

            {/* Link Upload Password */}
            <CollapsiblePasswordSection
              sectionId="link-upload"
              title="Link Upload Password"
              description="Password required for adding new links to the system"
              icon={Link}
              newPassword={linkUploadPassword}
              setNewPassword={setLinkUploadPassword}
              confirmPassword={confirmLinkUploadPassword}
              setConfirmPassword={setConfirmLinkUploadPassword}
              onSubmit={handleLinkUploadPasswordChange}
              isLoading={isLoadingLinkUpload}
              colorScheme="green"
            />

            {/* Link Delete Password */}
            <CollapsiblePasswordSection
              sectionId="link-delete"
              title="Link Delete Password"
              description="Password required for removing links from the system"
              icon={FileText}
              newPassword={linkDeletePassword}
              setNewPassword={setLinkDeletePassword}
              confirmPassword={confirmLinkDeletePassword}
              setConfirmPassword={setConfirmLinkDeletePassword}
              onSubmit={handleLinkDeletePasswordChange}
              isLoading={isLoadingLinkDelete}
              colorScheme="orange"
            />

            {/* Chat Room Password */}
            <CollapsiblePasswordSection
              sectionId="chat-room"
              title="Chat Room Password"
              description="Password required for users to join the chat room"
              icon={MessageCircle}
              newPassword={chatPassword}
              setNewPassword={setChatPassword}
              confirmPassword={confirmChatPassword}
              setConfirmPassword={setConfirmChatPassword}
              onSubmit={handleChatPasswordChange}
              isLoading={isLoadingChat}
              colorScheme="purple"
            />
          </div>

          {/* Security Notice */}
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-5 w-5 text-yellow-600" />
              <h3 className="font-semibold text-yellow-800">Security Notice</h3>
            </div>
            <p className="text-yellow-700 text-sm">
              Each operation now has its own password for enhanced security. Users will need to enter the correct password for each specific action they want to perform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}