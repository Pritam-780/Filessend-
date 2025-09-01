
// Frontend file storage with both localStorage and backend API support
export interface FileData {
  id: string;
  name: string;
  filename: string;
  originalName: string;
  mimeType: string;
  type: string;
  size: number;
  category: string;
  uploadedAt: Date;
  data?: string; // base64 encoded file data (for localStorage only)
}

const STORAGE_KEY = 'aailar_files';
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export class LocalFileStorage {
  private getFiles(): FileData[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const files = JSON.parse(stored);
      // Convert uploadedAt back to Date objects
      return files.map((file: any) => ({
        ...file,
        uploadedAt: new Date(file.uploadedAt)
      }));
    } catch {
      return [];
    }
  }

  private saveFiles(files: FileData[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    } catch (error) {
      throw new Error('Storage quota exceeded. Please delete some files.');
    }
  }

  // Backend API methods
  async getAllFilesFromAPI(): Promise<FileData[]> {
    try {
      const response = await fetch('/api/files');
      if (!response.ok) throw new Error('Failed to fetch files');
      const files = await response.json();
      return files.map((file: any) => ({
        ...file,
        uploadedAt: new Date(file.uploadedAt)
      }));
    } catch (error) {
      console.error('Failed to fetch files from API:', error);
      return [];
    }
  }

  async getFilesByCategoryFromAPI(category: string): Promise<FileData[]> {
    try {
      const response = await fetch(`/api/files/category/${category}`);
      if (!response.ok) throw new Error('Failed to fetch files');
      const files = await response.json();
      return files.map((file: any) => ({
        ...file,
        uploadedAt: new Date(file.uploadedAt)
      }));
    } catch (error) {
      console.error('Failed to fetch files from API:', error);
      return [];
    }
  }

  async searchFilesFromAPI(query: string, category?: string, mimeType?: string): Promise<FileData[]> {
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (category && category !== 'all') params.append('category', category);
      if (mimeType && mimeType !== 'all') params.append('type', mimeType);

      const response = await fetch(`/api/files/search?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to search files');
      const files = await response.json();
      return files.map((file: any) => ({
        ...file,
        uploadedAt: new Date(file.uploadedAt)
      }));
    } catch (error) {
      console.error('Failed to search files from API:', error);
      return [];
    }
  }

  async deleteFileFromAPI(id: string, password: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/files/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete file');
      }
      
      return true;
    } catch (error) {
      console.error('Failed to delete file from API:', error);
      throw error;
    }
  }

  getFileDownloadUrl(id: string): string {
    return `/api/files/${id}/download`;
  }

  getFilePreviewUrl(id: string): string {
    return `/api/files/${id}/preview`;
  }

  // Legacy localStorage methods (keeping for backward compatibility)
  async uploadFiles(files: File[], category: string): Promise<FileData[]> {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];

    const uploadedFiles: FileData[] = [];
    const existingFiles = this.getFiles();

    for (const file of files) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File "${file.name}" exceeds 15MB limit`);
      }

      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`File type "${file.type}" is not supported`);
      }

      // Convert file to base64
      const base64Data = await this.fileToBase64(file);
      
      const fileData: FileData = {
        id: this.generateId(),
        name: file.name,
        filename: `${Date.now()}-${file.name}`,
        originalName: file.name,
        mimeType: file.type,
        type: file.type,
        size: file.size,
        category,
        uploadedAt: new Date(),
        data: base64Data
      };

      uploadedFiles.push(fileData);
    }

    // Save to localStorage
    const allFiles = [...existingFiles, ...uploadedFiles];
    this.saveFiles(allFiles);

    return uploadedFiles;
  }

  getAllFiles(): FileData[] {
    return this.getFiles().sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  getFilesByCategory(category: string): FileData[] {
    return this.getFiles()
      .filter(file => file.category === category)
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  getFile(id: string): FileData | null {
    return this.getFiles().find(file => file.id === id) || null;
  }

  searchFiles(query: string, category?: string, mimeType?: string): FileData[] {
    const queryLower = query.toLowerCase();
    
    return this.getFiles()
      .filter(file => {
        const matchesQuery = !query || file.originalName.toLowerCase().includes(queryLower);
        const matchesCategory = !category || category === 'all' || file.category === category;
        const matchesMimeType = !mimeType || mimeType === 'all' || file.mimeType.includes(mimeType);
        
        return matchesQuery && matchesCategory && matchesMimeType;
      })
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  deleteFile(id: string): boolean {
    const files = this.getFiles();
    const filteredFiles = files.filter(file => file.id !== id);
    if (filteredFiles.length < files.length) {
      this.saveFiles(filteredFiles);
      return true;
    }
    return false;
  }

  getFileBlob(file: FileData): Blob {
    if (!file.data) {
      throw new Error('File data not available for blob conversion');
    }
    // Convert base64 back to blob for download/preview
    const byteCharacters = atob(file.data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: file.mimeType });
  }

  getFileUrl(file: FileData): string {
    if (file.data) {
      // LocalStorage file - create proper data URL
      return `data:${file.mimeType};base64,${file.data}`;
    } else {
      // Backend file
      return this.getFilePreviewUrl(file.id);
    }
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Utility method to get storage usage
  getStorageInfo(): { used: number; available: number; percentage: number } {
    const files = this.getFiles();
    const used = files.reduce((total, file) => total + file.size, 0);
    const available = 5 * 1024 * 1024; // Approximate localStorage limit (5MB)
    const percentage = (used / available) * 100;
    
    return { used, available, percentage };
  }
}

export const fileStorage = new LocalFileStorage();
