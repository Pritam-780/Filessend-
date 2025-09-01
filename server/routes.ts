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

// Initialize separate passwords for different operations
let fileUploadPassword = "Ak47";
let fileDeletePassword = "Ak47";
let chatPassword = "Ak47";

// Website status control
let isWebsiteOnline = true;
let adminPassword = "@gmail.pritam#";

// Helper function for input validation
function validateInput(input: string, maxLength: number): boolean {
  // Basic validation: check for empty string and length
  if (!input || input.length > maxLength) {
    return false;
  }
  // More sophisticated validation can be added here (e.g., regex for specific patterns)
  return true;
}

// Export function to get current chat password
export function getChatPassword(): string {
  return chatPassword;
}

export async function registerRoutes(app: Express, io?: SocketIOServer): Promise<void> {

  // Website status endpoint (accessible to all)
  app.get("/api/website/status", (req, res) => {
    res.json({ isOnline: isWebsiteOnline });
  });

  // Admin website toggle endpoint
  app.post("/api/admin/toggle-website", async (req, res) => {
    try {
      const { isOnline } = req.body;

      if (typeof isOnline !== 'boolean') {
        return res.status(400).json({ message: "isOnline must be a boolean" });
      }

      isWebsiteOnline = isOnline;

      // Broadcast website status change to all connected clients
      if (io) {
        io.emit('website-status-changed', {
          isOnline: isWebsiteOnline,
          message: `Website ${isOnline ? 'enabled' : 'disabled'} by admin`,
          timestamp: new Date().toISOString()
        });
        console.log(`Website ${isOnline ? 'enabled' : 'disabled'} by admin`);
      }

      res.json({
        message: `Website ${isOnline ? 'enabled' : 'disabled'} successfully`,
        isOnline: isWebsiteOnline,
        changedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Website toggle error:', error);
      res.status(500).json({ message: "Failed to toggle website status" });
    }
  });

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
      const { category, password } = req.body;
      const files = req.files as Express.Multer.File[];

      // Verify password for file upload
      if (!password || password !== fileUploadPassword) {
        return res.status(403).json({ message: "Access denied. Invalid password required for file upload." });
      }

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

        // Broadcast file upload to all connected clients
        if (io) {
          io.emit('file-uploaded', {
            file: savedFile,
            message: `New file uploaded: ${file.originalname}`,
            timestamp: new Date().toISOString()
          });
        }
      }

      res.json({ 
        message: "Files uploaded successfully", 
        files: uploadedFiles 
      });
    } catch (error) {
      console.error("File upload error:", error);
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

      res.download(filePath, file.originalName);
    } catch (error) {
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  // Preview file
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
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      res.status(500).json({ message: "Failed to preview file" });
    }
  });

  // Delete file
  app.delete("/api/files/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { password } = req.body;

      // Verify password for file deletion
      if (!password || password !== fileDeletePassword) {
        return res.status(403).json({ message: "Access denied. Invalid password required for file deletion." });
      }

      const file = await storage.getFile(id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Delete physical file
      const filePath = path.join(uploadDir, file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete from storage
      await storage.deleteFile(id);

      // Broadcast file deletion to all connected clients
      if (io) {
        io.emit('file-deleted', {
          fileId: id,
          fileName: file.originalName,
          message: `File deleted: ${file.originalName}`,
          timestamp: new Date().toISOString()
        });
      }

      res.json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("File deletion error:", error);
      res.status(500).json({ message: "Failed to delete file" });
    }
  });


  // Admin login
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      // Simple authentication check
      if (username === "crazy_pritam" && password === adminPassword) {
        res.json({
          message: "Login successful",
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(401).json({ message: "Invalid username or password" });
      }
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Admin password change route
  app.post("/api/admin/change-password", async (req, res) => {
    try {
      const { newPassword } = req.body;

      if (!newPassword || !validateInput(newPassword, 100)) {
        return res.status(400).json({ message: "Invalid password format" });
      }

      // Password strength validation
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Update all passwords
      fileUploadPassword = newPassword;
      fileDeletePassword = newPassword;

      res.json({
        message: "Password changed successfully",
        changedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Admin chat password management route
  app.post("/api/admin/change-chat-password", async (req, res) => {
    try {
      const { newPassword } = req.body;

      if (!newPassword || !validateInput(newPassword, 100)) {
        return res.status(400).json({ message: "Invalid password format" });
      }

      // Update chat password
      chatPassword = newPassword;

      // Broadcast chat password change to all connected clients (optional)
      if (io) {
        io.emit('chat-password-changed', {
          message: 'Chat room password has been updated by admin',
          timestamp: new Date().toISOString()
        });
        console.log('Chat password changed by admin');
      }

      res.json({
        message: "Chat password changed successfully",
        changedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Chat password change error:', error);
      res.status(500).json({ message: "Failed to change chat password" });
    }
  });

  // Individual password management routes
  app.post("/api/admin/change-file-upload-password", async (req, res) => {
    try {
      const { newPassword } = req.body;
      if (!newPassword || !validateInput(newPassword, 100)) {
        return res.status(400).json({ message: "Invalid password format" });
      }
      fileUploadPassword = newPassword;
      res.json({ message: "File upload password changed successfully", changedAt: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ message: "Failed to change file upload password" });
    }
  });

  app.post("/api/admin/change-file-delete-password", async (req, res) => {
    try {
      const { newPassword } = req.body;
      if (!newPassword || !validateInput(newPassword, 100)) {
        return res.status(400).json({ message: "Invalid password format" });
      }
      fileDeletePassword = newPassword;
      res.json({ message: "File delete password changed successfully", changedAt: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ message: "Failed to change file delete password" });
    }
  });


}