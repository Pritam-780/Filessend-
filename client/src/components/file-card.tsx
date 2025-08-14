import { Eye, Download, FileText, Image, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { File } from "@shared/schema";

interface FileCardProps {
  file: File;
  onPreview: (file: File) => void;
}

export default function FileCard({ file, onPreview }: FileCardProps) {
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
    window.open(`/api/files/${file.id}/download`, '_blank');
  };

  return (
    <div className="surface rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow group cursor-pointer">
      <div className="bg-gray-100 w-12 h-12 rounded-lg flex items-center justify-center mb-3">
        {getFileIcon()}
      </div>
      <h5 className="font-semibold text-secondary mb-1 truncate" title={file.originalName}>
        {file.originalName}
      </h5>
      <p className="text-sm text-gray-500 mb-3">
        {getFileTypeDisplay()} • {(file.size / 1024 / 1024).toFixed(1)} MB
      </p>
      <div className="flex gap-2">
        <Button 
          onClick={() => onPreview(file)}
          className="flex-1 bg-primary text-white py-2 px-3 rounded text-sm hover:bg-blue-800"
          size="sm"
        >
          <Eye className="h-3 w-3 mr-1" />
          Preview
        </Button>
        <Button 
          onClick={handleDownload}
          variant="outline"
          size="sm"
          className="bg-gray-100 text-gray-600 py-2 px-3 rounded text-sm hover:bg-gray-200"
        >
          <Download className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
