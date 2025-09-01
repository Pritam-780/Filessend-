import { X, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileData, fileStorage } from "@/lib/fileStorage";

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileData | null;
}

export default function PreviewModal({ isOpen, onClose, file }: PreviewModalProps) {
  if (!isOpen || !file) return null;

  const handleDownload = () => {
    if (!file) return;
    try {
      const link = document.createElement('a');
      link.href = `/api/files/${file.id}/download`;
      link.download = file.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  const getPreviewContent = () => {
    if (!file) return null;

    if (file.mimeType.startsWith('image/')) {
      const imageUrl = file.data
        ? `data:${file.mimeType};base64,${file.data}`
        : fileStorage.getFilePreviewUrl(file.id);

      return (
        <div className="flex justify-center">
          <img
            src={imageUrl}
            alt={file.originalName}
            className="max-w-full max-h-96 object-contain rounded-lg"
            onError={(e) => {
              console.error('Image failed to load:', e);
              // Don't show placeholder, just hide the broken image
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      );
    }

    if (file.mimeType === 'application/pdf') {
      const pdfUrl = file.data
        ? `data:application/pdf;base64,${file.data}`
        : fileStorage.getFilePreviewUrl(file.id);

      return (
        <div className="w-full h-96">
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
            className="w-full h-full border rounded-lg"
            title={file.originalName}
            onError={() => {
              console.error('PDF failed to load');
            }}
          />
        </div>
      );
    }

    return (
      <div className="text-center py-8">
        <div className="bg-gray-100 rounded-lg p-6 mb-4">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 font-medium">{file.originalName}</p>
          <p className="text-sm text-gray-500">{file.mimeType}</p>
          <p className="text-sm text-gray-500">{ (file.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
        <p className="text-gray-500 mb-4">Preview not available for this file type.</p>
        <Button onClick={() => {
          if (file.data) {
            const blob = fileStorage.getFileBlob(file);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = file.originalName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          } else {
            window.open(fileStorage.getFileDownloadUrl(file.id), '_blank');
          }
        }}>
          Download File
        </Button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4">
        <div className="surface rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-secondary truncate">{file.originalName}</h3>
            <div className="flex gap-2">
              <Button
                onClick={handleDownload}
                className="bg-primary text-white hover:bg-blue-800"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-secondary"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="h-96 overflow-auto p-4">
            {getPreviewContent()}
          </div>
        </div>
      </div>
    </div>
  );
}