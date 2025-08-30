import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Search, Grid, List } from "lucide-react";
import Header from "@/components/header";
import FileCard from "@/components/file-card";
import PreviewModal from "@/components/preview-modal";
import ChatRoom from "@/components/chat-room";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileData, fileStorage } from "@/lib/fileStorage";
import PasswordModal from "@/components/password-modal";
import UploadModal from "@/components/upload-modal";
import { useToast } from "@/hooks/use-toast";

const categoryNames = {
  academic: "Academic Books",
  relaxing: "Relaxing Books", 
  sessions: "Best Sessions"
};

const categoryDescriptions = {
  academic: "Textbooks, research papers, and educational materials for your academic journey.",
  relaxing: "Fiction, novels, and leisure reading materials for your downtime.",
  sessions: "Curated content and sessions from experts and thought leaders."
};

export default function Category() {
  const { category } = useParams<{ category: string }>();
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [files, setFiles] = useState<FileData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FileData | null>(null);
  const [showChatRoom, setShowChatRoom] = useState(false);
  const { toast } = useToast();

  const handleFileDelete = () => {
    if (deleteTarget) {
      setFiles(files.filter(file => file.id !== deleteTarget.id));
    }
  };

  useEffect(() => {
    if (!category) return;

    const loadFiles = () => {
      try {
        const categoryFiles = fileStorage.getFilesByCategory(category);
        setFiles(categoryFiles);
      } catch (error) {
        console.error('Error loading files:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFiles();

    // Listen for storage changes
    const handleStorageChange = () => loadFiles();

    const handleFileDeleted = (event: CustomEvent) => {
      console.log('File deleted event received in category:', event.detail);
      loadFiles(); // Refresh the file list immediately
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('file-deleted', handleFileDeleted as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('file-deleted', handleFileDeleted as EventListener);
    };
  }, [category]);

  const getFilteredFiles = () => {
    if (!searchQuery) {
      return files;
    }
    return fileStorage.searchFiles(searchQuery, category);
  };

  const displayFiles = getFilteredFiles();

  if (!category || !(category in categoryNames)) {
    return (
      <div className="min-h-screen bg-gray-50 animate-fadeIn">
        <Header onSearchChange={setSearchQuery} onChatOpen={() => setShowChatRoom(true)} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-secondary mb-4">Category Not Found</h2>
            <Link href="/">
              <Button className="bg-primary text-white hover:bg-blue-800">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 animate-fadeIn">
        <Header onSearchChange={setSearchQuery} onChatOpen={() => setShowChatRoom(true)} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading files...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const categoryName = categoryNames[category as keyof typeof categoryNames];
  const categoryDescription = categoryDescriptions[category as keyof typeof categoryDescriptions];

  return (
    <div className="min-h-screen bg-gray-50 animate-fadeIn">
      <Header 
        onSearchChange={setSearchQuery} 
        onChatOpen={() => setShowChatRoom(true)} 
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 bg-gradient-to-r from-white/80 to-blue-50/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-blue-200">
          <Link href="/">
            <Button variant="outline" className="mb-4 hover:bg-blue-50 border-blue-300">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">{categoryName}</h1>
          <p className="text-gray-700 font-medium text-lg">{categoryDescription}</p>
          <div className="mt-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg p-3 inline-block">
            <span className="text-blue-800 font-bold">{displayFiles.length} files available</span>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 bg-gradient-to-r from-white/80 to-blue-50/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-blue-200">
          <div className="relative">
            <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400" />
            <Input
              type="text"
              placeholder={`Search in ${categoryName}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-blue-300 focus:border-blue-500 focus:ring-blue-500 bg-white/80"
            />
          </div>
        </div>

        {/* Files Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {displayFiles.length > 0 ? (
            displayFiles.map((file) => (
              <div key={file.id} className="transform hover:scale-105 transition-all duration-300">
                <FileCard
                  file={file}
                  onPreview={setPreviewFile}
                  onDelete={setDeleteTarget}
                />
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-16">
              <div className="bg-gradient-to-br from-white via-blue-50 to-indigo-50 rounded-xl p-8 shadow-lg border border-blue-200">
                <div className="text-6xl mb-4">📁</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {searchQuery 
                    ? `No files found for "${searchQuery}"`
                    : `No files in ${categoryName} yet`}
                </h3>
                <p className="text-gray-600 font-medium">
                  {searchQuery 
                    ? "Try adjusting your search terms"
                    : "Upload some files to get started!"}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <PreviewModal 
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />
      <PasswordModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onPasswordSubmit={(password) => {
          if (deleteTarget && password === "Ak47") {
            fileStorage.deleteFile(deleteTarget.id);
            handleFileDelete();
            setDeleteTarget(null);
            toast({
              title: "File Deleted",
              description: `"${deleteTarget.name}" has been successfully deleted.`,
              className: "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200",
            });
          } else {
            toast({
              title: "Access Denied",
              description: "Incorrect password. Please try again.",
              variant: "destructive",
            });
          }
        }}
      />

      <ChatRoom 
        isOpen={showChatRoom}
        onClose={() => setShowChatRoom(false)}
      />
    </div>
  );
}