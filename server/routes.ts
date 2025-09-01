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

// Initialize system password (will be updated by admin)
let systemPassword = "Ak47";
let adminPassword = "@gmail.pritam#";

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

      console.log('File deletion request:', { id, hasPassword: !!password });

      // Verify password for deletion
      if (!password || password !== systemPassword) {
        console.log('File deletion denied - invalid password');
        return res.status(403).json({ message: "Access denied. Invalid password required for deletion." });
      }

      const file = await storage.getFile(id);

      if (!file) {
        console.log(`File not found in database: ${id}`);
        return res.status(404).json({ message: "File not found in database" });
      }

      const filePath = path.join(uploadDir, file.filename);

      // Delete file from database storage first
      const deletedFromStorage = await storage.deleteFile(id);

      if (!deletedFromStorage) {
        console.log(`Failed to delete from storage: ${id}`);
        return res.status(500).json({ message: "Failed to delete from database storage" });
      }

      // Delete physical file from disk
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`Physical file permanently deleted: ${filePath}`);
        } catch (fsError) {
          console.error('Failed to delete physical file:', fsError);
          // Continue execution - database deletion was successful
        }
      } else {
        console.log(`Physical file not found (already deleted): ${filePath}`);
      }

      // Broadcast file deletion to all connected clients (chat users and website users)
      if (io) {
        io.emit('file-deleted', {
          fileId: id,
          filename: file.originalName
        });
        console.log(`File deletion broadcasted to all clients: ${file.originalName}`);
      }

      res.json({
        message: "File permanently deleted from server and database",
        fileId: id,
        filename: file.originalName,
        deletedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({ message: "Failed to delete file permanently" });
    }
  });

  // Link management routes
  const links: Array<{
    id: string;
    title: string;
    description: string;
    url: string;
    uploadedAt: string;
  }> = [];

  // Get all links
  app.get("/api/links", async (req, res) => {
    try {
      res.json(links.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch links" });
    }
  });

  // Upload new link
  app.post("/api/links/upload", async (req, res) => {
    try {
      const { title, description, url, password } = req.body;

      if (password !== systemPassword) {
        return res.status(403).json({ message: "Access denied. Invalid password." });
      }

      if (!title || !description || !url) {
        return res.status(400).json({ message: "Title, description, and URL are required" });
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ message: "Invalid URL format" });
      }

      const newLink = {
        id: `link-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        title: title.trim(),
        description: description.trim(),
        url: url.trim(),
        uploadedAt: new Date().toISOString()
      };

      links.push(newLink);

      // Broadcast link upload to all connected clients
      if (io) {
        io.emit('link-uploaded', newLink);
        console.log(`Link uploaded and broadcasted: ${newLink.title}`);
      }

      res.json(newLink);
    } catch (error) {
      console.error('Link upload error:', error);
      res.status(500).json({ message: "Failed to upload link" });
    }
  });

  // Delete link
  app.delete("/api/links/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { password } = req.body;

      if (!password || password !== systemPassword) {
        return res.status(403).json({ message: "Access denied. Invalid password required for deletion." });
      }

      const linkIndex = links.findIndex(link => link.id === id);

      if (linkIndex === -1) {
        return res.status(404).json({ message: "Link not found" });
      }

      const deletedLink = links[linkIndex];
      links.splice(linkIndex, 1);

      // Broadcast link deletion to all connected clients
      if (io) {
        io.emit('link-deleted', {
          linkId: id,
          title: deletedLink.title
        });
        console.log(`Link deletion broadcasted: ${deletedLink.title}`);
      }

      res.json({
        message: "Link permanently deleted",
        linkId: id,
        title: deletedLink.title,
        deletedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Link delete error:', error);
      res.status(500).json({ message: "Failed to delete link" });
    }
  });

  // Admin login route
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Check admin credentials - username is "crazy_pritam" and password is admin password
      if (username === "crazy_pritam" && password === adminPassword) {
        res.json({
          message: "Login successful",
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(401).json({ message: "Invalid username or password" });
      }
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ message: "Failed to authenticate" });
    }
  });

  // Admin password management routes
  app.post("/api/admin/change-password", async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      // Verify current password (using system password for verification)
      if (currentPassword !== systemPassword) {
        return res.status(403).json({ message: "Current password is incorrect" });
      }

      // Update both system and admin passwords
      systemPassword = newPassword;
      adminPassword = newPassword;

      // Broadcast password change to all connected clients (optional)
      if (io) {
        io.emit('system-password-changed', {
          message: 'System password has been updated by admin',
          timestamp: new Date().toISOString()
        });
        console.log('System password changed by admin');
      }

      res.json({
        message: "Password changed successfully",
        changedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });


}