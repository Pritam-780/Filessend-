
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Megaphone, Calendar, Sparkles } from "lucide-react";

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AnnouncementModal({ isOpen, onClose }: AnnouncementModalProps) {
  const [announcement, setAnnouncement] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchAnnouncement();
    }
  }, [isOpen]);

  const fetchAnnouncement = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/announcement');
      if (response.ok) {
        const data = await response.json();
        setAnnouncement(data.announcement);
      }
    } catch (error) {
      console.error('Failed to fetch announcement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader className="relative">
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="absolute -top-2 -right-2 h-8 w-8 rounded-full hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="text-center pt-4">
            <div className="bg-gradient-to-br from-orange-100 to-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-bounce">
              <Megaphone className="h-8 w-8 text-orange-600" />
            </div>
            <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              📢 Latest Announcement
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh] px-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : announcement ? (
            <div className="space-y-6 animate-fadeInUp">
              {/* Announcement Header */}
              <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-xl border border-orange-200 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles className="h-6 w-6 text-orange-600 animate-pulse" />
                  <h2 className="text-2xl font-bold text-gray-800">{announcement.title}</h2>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <Calendar className="h-4 w-4" />
                  <span>Posted on {formatDate(announcement.createdAt)}</span>
                </div>
              </div>

              {/* Announcement Content */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-lg">
                <div className="prose prose-gray max-w-none">
                  <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-lg">
                    {announcement.message}
                  </div>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="flex justify-center">
                <div className="flex space-x-2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 bg-gradient-to-r from-orange-400 to-red-400 rounded-full animate-pulse"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 space-y-4">
              <div className="bg-gradient-to-br from-gray-100 to-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <Megaphone className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-600 mb-2">No Announcements</h3>
                <p className="text-gray-500">There are currently no announcements to display.</p>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-gray-200">
          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-700 hover:to-red-700 shadow-lg font-medium py-3"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
