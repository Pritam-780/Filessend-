
import { useState } from "react";
import { X, Link as LinkIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface LinkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newLink: any) => void;
}

export default function LinkUploadModal({ isOpen, onClose, onSuccess }: LinkUploadModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for your link",
        variant: "destructive",
      });
      return;
    }

    if (!url.trim()) {
      toast({
        title: "URL Required", 
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL (e.g., https://example.com)",
        variant: "destructive",
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: "Description Required",
        description: "Please enter a description for your link",
        variant: "destructive",
      });
      return;
    }

    if (!showPasswordInput) {
      setShowPasswordInput(true);
      return;
    }

    if (password !== "Ak47") {
      toast({
        title: "Access Denied",
        description: "Incorrect password. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const response = await fetch('/api/links/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          url: url.trim(),
          password
        }),
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const newLink = await response.json();
      
      if (onSuccess) {
        onSuccess(newLink);
      }
      
      handleClose();
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload link",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setUrl("");
    setPassword("");
    setShowPasswordInput(false);
    setIsUploading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                <LinkIcon className="h-6 w-6 mr-2 text-orange-600" />
                Upload Link
              </h3>
              <Button 
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="p-2 text-gray-500 hover:text-gray-800"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title Input */}
              <div>
                <Label className="text-sm font-medium text-gray-800 mb-2">Title</Label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a title for your link"
                  className="w-full border-orange-300 focus:border-orange-500 focus:ring-orange-500"
                  required
                />
              </div>

              {/* URL Input */}
              <div>
                <Label className="text-sm font-medium text-gray-800 mb-2">URL</Label>
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full border-orange-300 focus:border-orange-500 focus:ring-orange-500"
                  required
                />
              </div>

              {/* Description Input */}
              <div>
                <Label className="text-sm font-medium text-gray-800 mb-2">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this link is about..."
                  className="w-full border-orange-300 focus:border-orange-500 focus:ring-orange-500 min-h-[100px]"
                  required
                />
              </div>

              {/* Password Input */}
              {showPasswordInput && (
                <div>
                  <Label className="text-sm font-medium text-gray-800 mb-2">Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password to upload"
                    className="w-full border-orange-300 focus:border-orange-500 focus:ring-orange-500"
                    required
                  />
                </div>
              )}

              {/* Form Actions */}
              <div className="flex gap-4 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-700 hover:to-red-700"
                  disabled={isUploading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {showPasswordInput ? (isUploading ? "Uploading..." : "Upload Link") : "Continue"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
