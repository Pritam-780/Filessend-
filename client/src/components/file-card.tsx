import { Eye, Download, FileText, Image, FileSpreadsheet, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileData, fileStorage } from "@/lib/fileStorage";
import { useState } from "react";
import DeleteConfirmationModal from "./delete-confirmation-modal";
import { toast } from "@/components/ui/use-toast";


interface FileCardProps {
  file: FileData;
  onPreview: (file: FileData) => void;
  onDelete?: () => void;
}

export default function FileCard({ file, onPreview, onDelete }: FileCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const getFileIcon = () => {
    if (file.mimeType.startsWith('image/')) {
      return <Image className="h-6 w-6 text-blue-600" />;
    }
    if (file.mimeType === 'application/pdf') {
      return <FileText className="h-6 w-6 text-red-600" />;
    }
    if (file.mimeType.includes('excel') || file.mimeType.includes('spreadsheet')) {
      return <FileSpreadsheet className="h-6 w-6 text-green-600" />;
    }
    return <FileText className="h-6 w-6 text-gray-600" />;
  };

  const getFileTypeDisplay = () => {
    if (file.mimeType.startsWith('image/')) {
      return file.mimeType.split('/')[1].toUpperCase();
    }
    if (file.mimeType === 'application/pdf') {
      return 'PDF';
    }
    if (file.mimeType.includes('excel') || file.mimeType.includes('spreadsheet')) {
      return 'XLS';
    }
    return 'FILE';
  };

  const handleDownload = () => {
    if (file.data) {
      // LocalStorage file
      const url = fileStorage.getFileUrl(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // Backend file
      const url = fileStorage.getFileDownloadUrl(file.id);
      window.open(url, '_blank');
    }
  };

  const handleDelete = async (password: string) => {
    try {
      const success = await fileStorage.deleteFileFromAPI(file.id, password);
      if (success) {
        onDelete?.();
        toast({
          title: "Success",
          description: "File deleted successfully!",
          className: "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete file",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="bg-gradient-to-br from-white via-blue-50 to-indigo-50 rounded-xl shadow-lg border-2 border-blue-200 p-5 hover:shadow-xl hover:scale-105 transition-all duration-300 group cursor-pointer">
        <div className="bg-gradient-to-br from-blue-100 to-indigo-100 w-14 h-14 rounded-xl flex items-center justify-center mb-4 shadow-md">
          {getFileIcon()}
        </div>
        <h5 className="font-bold text-gray-800 mb-2 truncate text-lg" title={file.originalName}>
          {file.originalName}
        </h5>
        <p className="text-sm text-blue-600 mb-4 font-medium">
          {getFileTypeDisplay()} • {(file.size / 1024 / 1024).toFixed(1)} MB
        </p>
        <div className="flex gap-2">
          <Button 
            onClick={() => onPreview(file)}
            className="flex-1 bg-primary text-white hover:bg-primary/90 text-sm font-medium"
            size="sm"
          >
            <Eye className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">Preview</span>
          </Button>
          <Button 
            onClick={handleDownload}
            variant="outline"
            size="sm"
            className="border-green-300 text-green-700 hover:bg-green-50"
            title="Download file"
          >
            <Download className="h-3 w-3" />
          </Button>
          <Button 
            onClick={() => setShowDeleteModal(true)}
            variant="outline"
            size="sm"
            className="border-red-300 text-red-700 hover:bg-red-50"
            title="Delete file"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        fileName={file.originalName}
      />
    </>
  );
}