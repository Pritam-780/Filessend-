import type { Express } from "express";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { insertFileSchema } from "@shared/schema";
import { Server as SocketIOServer } from "socket.io";

const uploadDir = path.join(process.cwd(), "uploads");

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported'));
    }
  }
});

export async function registerRoutes(app: Express, io?: SocketIOServer): Promise<void> {
  
  // Get all files
  app.get("/api/files", async (req, res) => {
    try {
      const files = await storage.getFiles();
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch files" });
    }
  });

  // Get files by category
  app.get("/api/files/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const files = await storage.getFilesByCategory(category);
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch files by category" });
    }
  });

  // Search files
  app.get("/api/files/search", async (req, res) => {
    try {
      const { q, category, type } = req.query;
      const query = q as string || "";
      const files = await storage.searchFiles(
        query, 
        category as string, 
        type as string
      );
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Failed to search files" });
    }
  });

  // Upload files
  app.post("/api/files/upload", upload.array('files'), async (req, res) => {
    try {
      const { category } = req.body;
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      if (!category) {
        return res.status(400).json({ message: "Category is required" });
      }

      const uploadedFiles = [];

      for (const file of files) {
        // Move file to permanent location with unique name
        const fileExt = path.extname(file.originalname);
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExt}`;
        const permanentPath = path.join(uploadDir, uniqueName);
        
        fs.renameSync(file.path, permanentPath);

        const fileData = {
          filename: uniqueName,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          category
        };

        const savedFile = await storage.createFile(fileData);
        uploadedFiles.push(savedFile);
        
        // Broadcast file upload to all chat users
        if (io) {
          io.to('main-chat').emit('file-uploaded', savedFile);
        }
      }

      res.json(uploadedFiles);
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: "Failed to upload files" });
    }
  });

  // Download file
  app.get("/api/files/:id/download", async (req, res) => {
    try {
      const { id } = req.params;
      const file = await storage.getFile(id);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      const filePath = path.join(uploadDir, file.filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
      res.setHeader('Content-Type', file.mimeType);
      res.sendFile(filePath);
    } catch (error) {
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  // Get file info
  app.get("/api/files/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const file = await storage.getFile(id);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      res.json(file);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch file info" });
    }
  });

  // Serve uploaded files for preview
  app.get("/api/files/:id/preview", async (req, res) => {
    try {
      const { id } = req.params;
      const file = await storage.getFile(id);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      const filePath = path.join(uploadDir, file.filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      res.setHeader('Content-Type', file.mimeType);
      res.sendFile(filePath);
    } catch (error) {
      res.status(500).json({ message: "Failed to preview file" });
    }
  });

  // Delete file permanently
  app.delete("/api/files/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { password } = req.body;
      
      // Verify password for deletion
      if (password !== 'Ak47') {
        return res.status(403).json({ message: "Incorrect password" });
      }

      const file = await storage.getFile(id);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      const filePath = path.join(uploadDir, file.filename);
      
      // Delete file from database storage first
      const deletedFromStorage = await storage.deleteFile(id);
      
      if (!deletedFromStorage) {
        return res.status(500).json({ message: "Failed to delete from storage" });
      }
      
      // Delete physical file from disk
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`Physical file deleted: ${filePath}`);
        } catch (fsError) {
          console.error('Failed to delete physical file:', fsError);
        }
      }

      // Broadcast file deletion to all connected clients (chat users and website users)
      if (io) {
        io.emit('file-deleted', { 
          fileId: id, 
          filename: file.originalName 
        });
        console.log(`File deletion broadcasted: ${file.originalName}`);
      }

      res.json({ 
        message: "File deleted successfully",
        fileId: id,
        filename: file.originalName
      });
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  
}
