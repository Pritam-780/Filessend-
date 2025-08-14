import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Grid, List, GraduationCap, BookOpen, Users } from "lucide-react";
import Header from "@/components/header";
import FileCard from "@/components/file-card";
import PreviewModal from "@/components/preview-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { File } from "@shared/schema";

export default function Home() {
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const { data: files = [], isLoading } = useQuery<File[]>({
    queryKey: ['/api/files'],
  });

  const { data: searchResults = [] } = useQuery<File[]>({
    queryKey: ['/api/files/search', { q: searchQuery, category: categoryFilter !== "all" ? categoryFilter : "", type: fileTypeFilter !== "all" ? fileTypeFilter : "" }],
    enabled: searchQuery.length > 0 || (categoryFilter.length > 0 && categoryFilter !== "all") || (fileTypeFilter.length > 0 && fileTypeFilter !== "all"),
  });

  const displayFiles = searchQuery || (categoryFilter && categoryFilter !== "all") || (fileTypeFilter && fileTypeFilter !== "all") ? searchResults : files;

  const getFileCounts = () => {
    const counts = {
      academic: 0,
      relaxing: 0,
      sessions: 0,
    };

    files.forEach((file: File) => {
      if (file.category in counts) {
        counts[file.category as keyof typeof counts]++;
      }
    });

    return counts;
  };

  const fileCounts = getFileCounts();

  const handleSearch = () => {
    // Search is handled by react-query automatically when params change
  };

  if (isLoading) {
    return (
      <div className="min-h-screen surface-bg">
        <Header />
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

  return (
    <div className="min-h-screen surface-bg">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <section className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-secondary mb-4">Welcome to AAILAR PROD</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Your comprehensive file repository for academic resources, relaxing reads, and curated sessions from the best minds around you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="bg-primary text-white px-8 py-3 hover:bg-blue-800 font-medium">
              <Search className="h-4 w-4 mr-2" />
              Browse Files
            </Button>
            <Button variant="outline" className="border-primary text-primary px-8 py-3 hover:bg-primary hover:text-white font-medium">
              Learn More
            </Button>
          </div>
        </section>

        {/* File Categories */}
        <section className="mb-12">
          <h3 className="text-2xl font-bold text-secondary mb-6">Categories</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Academic Books */}
            <Link href="/category/academic">
              <div className="surface rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <GraduationCap className="text-primary h-6 w-6" />
                </div>
                <h4 className="text-lg font-semibold text-secondary mb-2">Academic Books</h4>
                <p className="text-gray-600 mb-4">Textbooks, research papers, and educational materials for your academic journey.</p>
                <div className="text-sm text-gray-500">
                  <span>{fileCounts.academic} files</span> • <span>Recently updated</span>
                </div>
              </div>
            </Link>

            {/* Relaxing Books */}
            <Link href="/category/relaxing">
              <div className="surface rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
                <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <BookOpen className="text-accent h-6 w-6" />
                </div>
                <h4 className="text-lg font-semibold text-secondary mb-2">Relaxing Books</h4>
                <p className="text-gray-600 mb-4">Fiction, novels, and leisure reading materials for your downtime.</p>
                <div className="text-sm text-gray-500">
                  <span>{fileCounts.relaxing} files</span> • <span>Recently updated</span>
                </div>
              </div>
            </Link>

            {/* Best Sessions */}
            <Link href="/category/sessions">
              <div className="surface rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
                <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Users className="text-purple-600 h-6 w-6" />
                </div>
                <h4 className="text-lg font-semibold text-secondary mb-2">Best Sessions</h4>
                <p className="text-gray-600 mb-4">Curated content and sessions from experts and thought leaders.</p>
                <div className="text-sm text-gray-500">
                  <span>{fileCounts.sessions} files</span> • <span>Recently updated</span>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* Search and Filter */}
        <section className="mb-8">
          <div className="surface rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-secondary mb-4">Search Files</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input 
                  type="text" 
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
                <SelectTrigger className="w-full sm:w-auto">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-auto">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="relaxing">Relaxing</SelectItem>
                  <SelectItem value="sessions">Sessions</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleSearch}
                className="bg-primary text-white hover:bg-blue-800"
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </section>

        {/* Recent Files */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-secondary">
              {searchQuery || categoryFilter || fileTypeFilter ? 'Search Results' : 'Recent Files'}
            </h3>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="p-2 text-gray-500 hover:text-secondary">
                <Grid className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="p-2 text-gray-500 hover:text-secondary">
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* File Grid */}
          {displayFiles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayFiles.map((file: File) => (
                <FileCard 
                  key={file.id}
                  file={file}
                  onPreview={setPreviewFile}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📂</div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No files found</h3>
              <p className="text-gray-500">
                {searchQuery || categoryFilter || fileTypeFilter 
                  ? 'Try adjusting your search criteria'
                  : 'Upload some files to get started'
                }
              </p>
            </div>
          )}
        </section>
      </main>

      <PreviewModal 
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />
    </div>
  );
}
