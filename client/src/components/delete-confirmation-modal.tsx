
import { useState } from "react";
import { Trash2, Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fileName: string;
}

export default function DeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  fileName 
}: DeleteConfirmationModalProps) {
  const [password, setPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== "Ak47") {
      toast({
        title: "Access Denied",
        description: "Incorrect password. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    
    // Add a small delay for better UX
    setTimeout(() => {
      onConfirm();
      setIsDeleting(false);
      setPassword("");
      onClose();
      
      toast({
        title: "File Deleted",
        description: `"${fileName}" has been successfully deleted.`,
        className: "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200",
      });
    }, 500);
  };

  const handleClose = () => {
    setPassword("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[350px] bg-gradient-to-br from-red-50 via-white to-orange-50 border-2 border-red-200 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700 text-lg font-bold">
            <AlertTriangle className="h-5 w-5" />
            Confirm Deletion
          </DialogTitle>
          <DialogDescription className="text-gray-700 text-sm mt-1">
            This action cannot be undone. Please enter the password to confirm deletion.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 mt-3">
          <div className="bg-red-100 border border-red-300 rounded-lg p-2">
            <p className="text-xs text-red-800 font-medium">
              You are about to delete: <span className="font-bold">"{fileName}"</span>
            </p>
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
                disabled={isDeleting}
                required
              />
            </div>
            
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1 h-8 text-xs border-gray-300 hover:bg-gray-50"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 h-8 text-xs bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium shadow-lg"
                disabled={isDeleting || !password}
              >
                {isDeleting ? (
                  <div className="flex items-center gap-1">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    Deleting...
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Trash2 className="h-3 w-3" />
                    Delete File
                  </div>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
