import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Search, Grid, List } from "lucide-react";
import Header from "@/components/header";
import FileCard from "@/components/file-card";
import PreviewModal from "@/components/preview-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileData, fileStorage } from "@/lib/fileStorage";

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
    window.addEventListener('storage', handleStorageChange);
    
    return () => window.removeEventListener('storage', handleStorageChange);
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
      <div className="min-h-screen surface-bg">
        <Header />
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

  const categoryName = categoryNames[category as keyof typeof categoryNames];
  const categoryDescription = categoryDescriptions[category as keyof typeof categoryDescriptions];

  return (
    <div className="min-h-screen surface-bg">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Header */}
        <section className="mb-8">
          <div className="mb-4">
            <Link href="/">
              <Button variant="ghost" className="text-gray-600 hover:text-secondary">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-secondary mb-4">{categoryName}</h1>
          <p className="text-lg text-gray-600 max-w-2xl">{categoryDescription}</p>
        </section>

        {/* Search */}
        <section className="mb-8">
          <div className="surface rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-secondary mb-4">Search in {categoryName}</h3>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input 
                  type="text" 
                  placeholder={`Search in ${categoryName.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button className="bg-primary text-white hover:bg-blue-800">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </section>

        {/* Files */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-secondary">
              {searchQuery ? 'Search Results' : `${categoryName} (${displayFiles.length})`}
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
              {displayFiles.map((file: FileData) => (
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
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                {searchQuery ? 'No files found' : `No files in ${categoryName}`}
              </h3>
              <p className="text-gray-500">
                {searchQuery 
                  ? 'Try adjusting your search terms'
                  : `Upload some files to the ${categoryName.toLowerCase()} category to get started`
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
