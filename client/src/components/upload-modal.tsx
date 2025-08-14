import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, CloudUpload, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FileWithPreview extends File {
  id: string;
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [category, setCategory] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('category', category);
      
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      // Simulate progress for demo purposes
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 20;
        });
      }, 200);

      const response = await apiRequest('POST', '/api/files/upload', formData);
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Files uploaded successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const validFiles: FileWithPreview[] = [];
    const maxSize = 15 * 1024 * 1024; // 15MB
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];

    Array.from(files).forEach((file) => {
      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: `"${file.name}" exceeds 15MB limit`,
          variant: "destructive",
        });
        return;
      }

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: `"${file.name}" is not a supported file type`,
          variant: "destructive",
        });
        return;
      }

      const fileWithId = Object.assign(file, { id: Math.random().toString(36) });
      validFiles.push(fileWithId);
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (fileId: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedFiles.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select at least one file to upload",
        variant: "destructive",
      });
      return;
    }

    if (!category) {
      toast({
        title: "Category Required",
        description: "Please select a category for your files",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate();
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setCategory("");
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="surface rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-secondary">Upload Files</h3>
              <Button 
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="p-2 text-gray-500 hover:text-secondary"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category Selection */}
              <div>
                <Label className="text-sm font-medium text-secondary mb-2">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="academic">Academic Books</SelectItem>
                    <SelectItem value="relaxing">Relaxing Books</SelectItem>
                    <SelectItem value="sessions">Best Sessions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* File Upload */}
              <div>
                <Label className="text-sm font-medium text-secondary mb-2">Files</Label>
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-primary', 'bg-blue-50');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('border-primary', 'bg-blue-50');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-primary', 'bg-blue-50');
                    handleFileSelect(e.dataTransfer.files);
                  }}
                >
                  <CloudUpload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-600 mb-2">Drop files here or click to browse</p>
                  <p className="text-sm text-gray-500">PDF, XLS, and image files up to 15MB each</p>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                </div>
              </div>

              {/* File List */}
              {selectedFiles.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-secondary mb-3">Selected Files</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-gray-500 mr-3" />
                          <div>
                            <p className="font-medium text-secondary">{file.name}</p>
                            <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Progress */}
              {uploadMutation.isPending && (
                <div>
                  <Progress value={uploadProgress} className="mb-2" />
                  <p className="text-sm text-gray-600">Uploading... {Math.round(uploadProgress)}%</p>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex gap-4 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={uploadMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-primary text-white hover:bg-blue-800"
                  disabled={uploadMutation.isPending || selectedFiles.length === 0}
                >
                  <CloudUpload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
