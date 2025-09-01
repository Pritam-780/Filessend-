
import { useState } from "react";
import { X, ExternalLink, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import PasswordModal from "@/components/password-modal";

interface ViewLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  links: any[];
  onDelete: (linkId: string) => void;
}

export default function ViewLinksModal({ isOpen, onClose, links, onDelete }: ViewLinksModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const { toast } = useToast();

  const filteredLinks = links.filter(link =>
    link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (linkId: string, password: string) => {
    try {
      const response = await fetch(`/api/links/${linkId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete link');
      }

      onDelete(linkId);
      toast({
        title: "Link Deleted",
        description: "Link has been permanently removed",
        className: "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete link. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Uploaded Links</h3>
              <Button 
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-800"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search links..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Links List */}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredLinks.length > 0 ? (
                filteredLinks.map((link, index) => (
                  <div key={`${link.id}-${index}`} className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4 border border-orange-200 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-800 mb-2 text-lg">{link.title}</h4>
                        <p className="text-gray-600 mb-3 text-sm leading-relaxed">{link.description}</p>
                        <div className="flex items-center gap-2 mb-2">
                          <ExternalLink className="h-4 w-4 text-orange-600" />
                          <a 
                            href={link.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-orange-600 hover:text-orange-800 font-medium break-all"
                          >
                            {link.url}
                          </a>
                        </div>
                        <p className="text-xs text-gray-500">
                          Uploaded on {new Date(link.uploadedAt).toLocaleDateString()} at {new Date(link.uploadedAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          onClick={() => window.open(link.url, '_blank')}
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => setDeleteTarget(link)}
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  {searchQuery ? 'No links match your search.' : 'No links uploaded yet.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <PasswordModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onPasswordSubmit={(password) => {
          if (deleteTarget && password === "Ak47") {
            handleDelete(deleteTarget.id, password);
            setDeleteTarget(null);
          } else {
            toast({
              title: "Access Denied",
              description: "Incorrect password. Please try again.",
              variant: "destructive",
            });
          }
        }}
      />
    </div>
  );
}
