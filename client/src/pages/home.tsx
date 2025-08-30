import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Search, Grid, List, GraduationCap, BookOpen, Users, Plus } from "lucide-react";
import Header from "@/components/header";
import FileCard from "@/components/file-card";
import PreviewModal from "@/components/preview-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileData, fileStorage } from "@/lib/fileStorage";
import PasswordModal from "@/components/password-modal";
import UploadModal from "@/components/upload-modal";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { toast } = useToast();
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [files, setFiles] = useState<FileData[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FileData | null>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = () => {
    setIsLoading(true);
    setTimeout(() => {
      const allFiles = fileStorage.getAllFiles();
      setFiles(allFiles);
      setFilteredFiles(allFiles);
      setIsLoading(false);
    }, 500);
  };

  const handleFileDelete = () => {
    loadFiles();
  };

  const getFilteredFiles = () => {
    let results = files;

    if (searchQuery) {
      results = results.filter(file =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (categoryFilter && categoryFilter !== "all") {
      results = results.filter(file => file.category === categoryFilter);
    }

    if (fileTypeFilter && fileTypeFilter !== "all") {
      results = results.filter(file => file.type === fileTypeFilter);
    }

    setFilteredFiles(results);
  };

  useEffect(() => {
    getFilteredFiles();
  }, [files, searchQuery, categoryFilter, fileTypeFilter]);

  const getFileCounts = () => {
    const counts = {
      academic: 0,
      relaxing: 0,
      sessions: 0,
    };

    files.forEach((file: FileData) => {
      if (file.category in counts) {
        counts[file.category as keyof typeof counts]++;
      }
    });

    return counts;
  };

  const fileCounts = getFileCounts();

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center animate-pulse">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600 font-semibold">Loading your library...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const categories = [
    { id: "academic", name: "Academic Books", description: "Textbooks, research papers, and educational materials.", icon: GraduationCap, count: fileCounts.academic },
    { id: "relaxing", name: "Relaxing Books", description: "Fiction, novels, and leisure reading materials.", icon: BookOpen, count: fileCounts.relaxing },
    { id: "sessions", name: "Best Sessions", description: "Curated content and sessions from experts.", icon: Users, count: fileCounts.sessions },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12 bg-gradient-to-r from-white/80 to-blue-50/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-blue-200">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Welcome to <span className="text-primary">AAILAR</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-700 mb-8 max-w-3xl mx-auto font-medium">
            Your personal digital library for organizing and accessing academic books, relaxing reads, and professional resources.
          </p>
          <Button 
            onClick={() => setShowUploadModal(true)}
            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-8 py-3 rounded-xl text-lg font-bold hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 shadow-2xl transform hover:scale-105 transition-all duration-300"
          >
            <Plus className="h-5 w-5 mr-2" />
            Upload Your First Book
          </Button>
        </div>

        {/* Categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-gradient-to-br from-white via-blue-50 to-indigo-50 rounded-xl p-6 text-center hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer border-2 border-blue-200 shadow-lg"
            >
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                <category.icon className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2 text-lg">{category.name}</h3>
              <p className="text-sm text-blue-600 mb-4 font-medium">{category.description}</p>
              <p className="text-indigo-600 font-bold text-lg">{category.count} files</p>
            </div>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="mb-8 bg-gradient-to-r from-white/80 to-blue-50/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-blue-200">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">All Files</h2>
            <div className="flex gap-4 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400" />
                <Input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 w-full sm:w-80 border-blue-300 focus:border-blue-500 focus:ring-blue-500 bg-white/80"
                />
              </div>
              <Button
                onClick={() => setShowUploadModal(true)}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg font-medium rounded-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </div>
          </div>
        </div>

        {/* Files Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredFiles.length > 0 ? (
            filteredFiles.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                onPreview={setPreviewFile}
                onDelete={setDeleteTarget}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-gray-500">
              {searchQuery || categoryFilter || fileTypeFilter
                ? 'No files match your search criteria.'
                : 'Your library is empty. Upload some files to get started!'}
            </div>
          )}
        </div>
      </main>

      <PreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />

      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
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
    </div>
  );
}