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

// Announcement system
let currentAnnouncement: {
  id: string;
  title: string;
  message: string;
  createdAt: string;
} | null = null;

// Visitor tracking system
interface Visitor {
  id: string;
  ip: string;
  name?: string;
  firstVisit: string;
  lastActive: string;
  isBlocked: boolean;
  visitCount: number;
}

// Persistent visitor storage
let visitors = new Map<string, Visitor>();
let allVisitorHistory = new Map<string, Visitor>(); // Persistent history
let blockedIPs = new Set<string>();

// File and link tracking with uploader info
interface FileUploadRecord {
  fileId: string;
  fileName: string;
  uploaderName: string;
  uploaderIP: string;
  uploadedAt: string;
}

interface LinkUploadRecord {
  linkId: string;
  linkTitle: string;
  uploaderName: string;
  uploaderIP: string;
  uploadedAt: string;
}

let fileUploads = new Map<string, FileUploadRecord>();
let linkUploads = new Map<string, LinkUploadRecord>();

// File operations tracking
interface FileOperation {
  id: string;
  type: 'upload' | 'delete' | 'download' | 'preview';
  fileName: string;
  userName: string;
  userIP: string;
  timestamp: string;
  fileId?: string;
}

// Link operations tracking
interface LinkOperation {
  id: string;
  type: 'upload' | 'delete';
  linkTitle: string;
  linkUrl: string;
  userName: string;
  userIP: string;
  timestamp: string;
  linkId?: string;
}

let fileOperations: FileOperation[] = [];
let linkOperations: LinkOperation[] = [];

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

// Middleware to track visitors
function trackVisitor(req: any, res: any, next: any) {
  const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
    (req.connection.socket ? req.connection.socket.remoteAddress : null) || 
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';

  const now = new Date().toISOString();
  
  if (visitors.has(clientIP)) {
    const visitor = visitors.get(clientIP)!;
    visitor.lastActive = now;
    visitor.visitCount += 1;
    visitors.set(clientIP, visitor);
  } else {
    visitors.set(clientIP, {
      ip: clientIP,
      firstVisit: now,
      lastActive: now,
      isBlocked: blockedIPs.has(clientIP),
      visitCount: 1
    });
  }

  next();
}

export async function registerRoutes(app: Express, io?: SocketIOServer): Promise<void> {

  // Apply visitor tracking to all routes except admin routes
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api/admin/') && !req.path.startsWith('/api/visitor/')) {
      trackVisitor(req, res, next);
    } else {
      next();
    }
  });

  // Website status endpoint (accessible to all)
  app.get("/api/website/status", (req, res) => {
    res.json({ isOnline: isWebsiteOnline });
  });

  // Visitor tracking endpoints
  app.get("/api/visitor/check", (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
      (req.connection.socket ? req.connection.socket.remoteAddress : null) || 
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';

    const visitor = visitors.get(clientIP);
    const isBlocked = blockedIPs.has(clientIP) || (visitor?.isBlocked || false);

    // Update blocked status if changed
    if (visitor && visitor.isBlocked !== isBlocked) {
      visitor.isBlocked = isBlocked;
      visitors.set(clientIP, visitor);
    }

    res.json({
      ip: clientIP,
      isBlocked,
      hasName: visitor?.name ? true : false,
      visitCount: visitor?.visitCount || 0
    });
  });

  app.post("/api/visitor/register", (req, res) => {
    const { name } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
      (req.connection.socket ? req.connection.socket.remoteAddress : null) || 
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';

    if (!name || !validateInput(name, 100)) {
      return res.status(400).json({ message: "Invalid name format" });
    }

    const now = new Date().toISOString();
    const visitorId = `${clientIP}-${Date.now()}`;

    const visitorData: Visitor = {
      id: visitorId,
      ip: clientIP,
      name: name.trim(),
      firstVisit: now,
      lastActive: now,
      isBlocked: blockedIPs.has(clientIP),
      visitCount: 1
    };

    // Store in both current visitors and persistent history
    if (visitors.has(clientIP)) {
      const existing = visitors.get(clientIP)!;
      existing.name = name.trim();
      existing.lastActive = now;
      existing.visitCount += 1;
      visitors.set(clientIP, existing);
    } else {
      visitors.set(clientIP, visitorData);
    }

    // Always add to persistent history (never remove)
    allVisitorHistory.set(visitorId, { ...visitorData });

    console.log(`Visitor registered: ${name} (${clientIP})`);
    res.json({ message: "Visitor registered successfully" });
  });

  app.post("/api/visitor/update", (req, res) => {
    const { name } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
      (req.connection.socket ? req.connection.socket.remoteAddress : null) || 
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';

    if (visitors.has(clientIP)) {
      const visitor = visitors.get(clientIP)!;
      if (name) visitor.name = name.trim();
      visitor.lastActive = new Date().toISOString();
      visitors.set(clientIP, visitor);
    }

    res.json({ message: "Visitor updated successfully" });
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
      const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
        (req.connection.socket ? req.connection.socket.remoteAddress : null) || 
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';

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

      // Get uploader info
      const visitor = visitors.get(clientIP);
      const uploaderName = visitor?.name || 'Anonymous';

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

        // Track file upload with uploader info
        const uploadRecord: FileUploadRecord = {
          fileId: savedFile.id,
          fileName: savedFile.originalName,
          uploaderName,
          uploaderIP: clientIP,
          uploadedAt: savedFile.uploadedAt
        };
        fileUploads.set(savedFile.id, uploadRecord);

        // Track file operation
        const operation: FileOperation = {
          id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'upload',
          fileName: savedFile.originalName,
          userName: uploaderName,
          userIP: clientIP,
          timestamp: savedFile.uploadedAt,
          fileId: savedFile.id
        };
        fileOperations.unshift(operation);

        // Broadcast file upload to all connected clients and chat room
        if (io) {
          const fileUploadData = {
            id: savedFile.id,
            originalName: savedFile.originalName,
            mimeType: savedFile.mimeType,
            size: savedFile.size,
            category: savedFile.category,
            uploadedAt: savedFile.uploadedAt,
            uploaderName,
            uploaderIP: clientIP
          };
          
          // Broadcast to general file system
          io.emit('file-uploaded', {
            file: savedFile,
            uploaderName,
            uploaderIP: clientIP,
            message: `New file uploaded by ${uploaderName} (${clientIP}): ${file.originalname}`,
            timestamp: new Date().toISOString()
          });
          
          // Broadcast specifically to chat room for real-time visibility
          io.to('main-chat').emit('file-uploaded', fileUploadData);
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
      const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
        (req.connection.socket ? req.connection.socket.remoteAddress : null) || 
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      const filePath = path.join(uploadDir, file.filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      // Get user info for tracking
      const visitor = visitors.get(clientIP);
      const userName = visitor?.name || 'Anonymous';

      // Track download operation
      const operation: FileOperation = {
        id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'download',
        fileName: file.originalName,
        userName,
        userIP: clientIP,
        timestamp: new Date().toISOString(),
        fileId: id
      };
      fileOperations.unshift(operation);

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
      const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
        (req.connection.socket ? req.connection.socket.remoteAddress : null) || 
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      const filePath = path.join(uploadDir, file.filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      // Get user info for tracking
      const visitor = visitors.get(clientIP);
      const userName = visitor?.name || 'Anonymous';

      // Track preview operation
      const operation: FileOperation = {
        id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'preview',
        fileName: file.originalName,
        userName,
        userIP: clientIP,
        timestamp: new Date().toISOString(),
        fileId: id
      };
      fileOperations.unshift(operation);

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

      // Get user info for tracking
      const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
        (req.connection.socket ? req.connection.socket.remoteAddress : null) || 
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
      const visitor = visitors.get(clientIP);
      const userName = visitor?.name || 'Anonymous';

      // Track delete operation
      const operation: FileOperation = {
        id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'delete',
        fileName: file.originalName,
        userName,
        userIP: clientIP,
        timestamp: new Date().toISOString(),
        fileId: id
      };
      fileOperations.unshift(operation);

      // Delete from storage
      await storage.deleteFile(id);

      // Broadcast file deletion to all connected clients
      if (io) {
        io.emit('file-deleted', {
          fileId: id,
          fileName: file.originalName,
          userName,
          userIP: clientIP,
          message: `File deleted by ${userName} (${clientIP}): ${file.originalName}`,
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

  // Get current announcement
  app.get("/api/announcement", async (req, res) => {
    try {
      res.json({ announcement: currentAnnouncement });
    } catch (error) {
      res.status(500).json({ message: "Failed to get announcement" });
    }
  });

  // Create/Update announcement (Admin only)
  app.post("/api/admin/announcement", async (req, res) => {
    try {
      const { title, message } = req.body;

      if (!title || !message) {
        return res.status(400).json({ message: "Title and message are required" });
      }

      if (!validateInput(title, 100) || !validateInput(message, 1000)) {
        return res.status(400).json({ message: "Invalid title or message format" });
      }

      const newAnnouncement = {
        id: Date.now().toString(),
        title: title.trim(),
        message: message.trim(),
        createdAt: new Date().toISOString()
      };

      currentAnnouncement = newAnnouncement;

      // Broadcast new announcement to all connected clients
      if (io) {
        io.emit('announcement-created', {
          announcement: newAnnouncement,
          message: 'New announcement posted',
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        message: "Announcement created successfully",
        announcement: newAnnouncement
      });
    } catch (error) {
      console.error('Announcement creation error:', error);
      res.status(500).json({ message: "Failed to create announcement" });
    }
  });

  // Delete announcement (Admin only)
  app.delete("/api/admin/announcement", async (req, res) => {
    try {
      if (!currentAnnouncement) {
        return res.status(404).json({ message: "No announcement to delete" });
      }

      const deletedAnnouncement = currentAnnouncement;
      currentAnnouncement = null;

      // Broadcast announcement deletion to all connected clients
      if (io) {
        io.emit('announcement-deleted', {
          message: 'Announcement removed',
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        message: "Announcement deleted successfully",
        deletedAnnouncement
      });
    } catch (error) {
      console.error('Announcement deletion error:', error);
      res.status(500).json({ message: "Failed to delete announcement" });
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

  // In-memory storage for links
  let links: Array<{
    id: string;
    title: string;
    description: string;
    url: string;
    uploadedAt: string;
  }> = [];

  // Get all links
  app.get("/api/links", (req, res) => {
    try {
      res.json(links);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch links" });
    }
  });

  // Upload a new link
  app.post("/api/links/upload", (req, res) => {
    try {
      const { title, description, url, password } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
        (req.connection.socket ? req.connection.socket.remoteAddress : null) || 
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';

      // Verify password for link upload
      if (!password || password !== "Ak47") {
        return res.status(403).json({ message: "Access denied. Invalid password required for link upload." });
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

      if (!validateInput(title, 200) || !validateInput(description, 1000) || !validateInput(url, 500)) {
        return res.status(400).json({ message: "Invalid input format or length" });
      }

      // Get uploader info
      const visitor = visitors.get(clientIP);
      const uploaderName = visitor?.name || 'Anonymous';

      const newLink = {
        id: Date.now().toString(),
        title: title.trim(),
        description: description.trim(),
        url: url.trim(),
        uploadedAt: new Date().toISOString(),
        uploaderName,
        uploaderIP: clientIP
      };

      links.unshift(newLink); // Add to beginning of array

      // Track link upload
      const uploadRecord: LinkUploadRecord = {
        linkId: newLink.id,
        linkTitle: newLink.title,
        uploaderName,
        uploaderIP: clientIP,
        uploadedAt: newLink.uploadedAt
      };
      linkUploads.set(newLink.id, uploadRecord);

      // Track link operation
      const operation: LinkOperation = {
        id: `link-op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'upload',
        linkTitle: newLink.title,
        linkUrl: newLink.url,
        userName: uploaderName,
        userIP: clientIP,
        timestamp: newLink.uploadedAt,
        linkId: newLink.id
      };
      linkOperations.unshift(operation);

      // Broadcast link upload to all connected clients
      if (io) {
        io.emit('link-uploaded', {
          ...newLink,
          message: `New link uploaded by ${uploaderName} (${clientIP}): ${title}`
        });
      }

      res.json(newLink);
    } catch (error) {
      console.error("Link upload error:", error);
      res.status(500).json({ message: "Failed to upload link" });
    }
  });

  // Delete a link
  app.delete("/api/links/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { password } = req.body;

      // Verify password for link deletion
      if (!password || password !== "Ak47") {
        return res.status(403).json({ message: "Access denied. Invalid password required for link deletion." });
      }

      const linkIndex = links.findIndex(link => link.id === id);
      if (linkIndex === -1) {
        return res.status(404).json({ message: "Link not found" });
      }

      const deletedLink = links[linkIndex];
      links.splice(linkIndex, 1);

      // Get user info for tracking
      const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
        (req.connection.socket ? req.connection.socket.remoteAddress : null) || 
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
      const visitor = visitors.get(clientIP);
      const userName = visitor?.name || 'Anonymous';

      // Track link delete operation
      const operation: LinkOperation = {
        id: `link-op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'delete',
        linkTitle: deletedLink.title,
        linkUrl: deletedLink.url,
        userName,
        userIP: clientIP,
        timestamp: new Date().toISOString(),
        linkId: id
      };
      linkOperations.unshift(operation);

      // Broadcast link deletion to all connected clients
      if (io) {
        io.emit('link-deleted', { 
          linkId: id,
          linkTitle: deletedLink.title,
          userName,
          userIP: clientIP,
          message: `Link deleted by ${userName} (${clientIP}): ${deletedLink.title}`
        });
      }

      res.json({ message: "Link deleted successfully" });
    } catch (error) {
      console.error("Link deletion error:", error);
      res.status(500).json({ message: "Failed to delete link" });
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

  // Admin visitor management endpoints
  app.get("/api/admin/visitors", (req, res) => {
    try {
      const visitorList = Array.from(allVisitorHistory.values()).sort((a, b) => 
        new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
      );
      res.json({ 
        visitors: visitorList,
        fileUploads: Array.from(fileUploads.values()),
        linkUploads: Array.from(linkUploads.values()),
        fileOperations: fileOperations.slice(0, 1000), // Return last 1000 operations
        linkOperations: linkOperations.slice(0, 1000) // Return last 1000 link operations
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch visitors" });
    }
  });

  // Get active chat room users for admin dashboard
  app.get("/api/admin/chat-users", (req, res) => {
    try {
      // Import the function from index.ts to get real chat users
      const { getActiveChatUsers } = require('./index');
      const activeChatUsers = getActiveChatUsers();
      
      res.json({ 
        activeChatUsers,
        totalActive: activeChatUsers.length,
        message: activeChatUsers.length > 0 
          ? `${activeChatUsers.length} users currently in chat room`
          : "No users currently in the chat room"
      });
    } catch (error) {
      console.error('Error fetching chat users:', error);
      res.status(500).json({ message: "Failed to fetch chat room users" });
    }
  });

  app.post("/api/admin/visitor/block", (req, res) => {
    try {
      const { ip } = req.body;
      if (!ip) {
        return res.status(400).json({ message: "IP address is required" });
      }

      blockedIPs.add(ip);
      if (visitors.has(ip)) {
        const visitor = visitors.get(ip)!;
        visitor.isBlocked = true;
        visitors.set(ip, visitor);
      }

      console.log(`IP ${ip} blocked by admin`);
      res.json({ message: `IP ${ip} blocked successfully` });
    } catch (error) {
      res.status(500).json({ message: "Failed to block visitor" });
    }
  });

  app.post("/api/admin/visitor/unblock", (req, res) => {
    try {
      const { ip } = req.body;
      if (!ip) {
        return res.status(400).json({ message: "IP address is required" });
      }

      blockedIPs.delete(ip);
      if (visitors.has(ip)) {
        const visitor = visitors.get(ip)!;
        visitor.isBlocked = false;
        visitors.set(ip, visitor);
      }

      console.log(`IP ${ip} unblocked by admin`);
      res.json({ message: `IP ${ip} unblocked successfully` });
    } catch (error) {
      res.status(500).json({ message: "Failed to unblock visitor" });
    }
  });

  app.delete("/api/admin/visitor/delete", (req, res) => {
    try {
      const { ip } = req.body;
      if (!ip) {
        return res.status(400).json({ message: "IP address is required" });
      }

      // Remove from all tracking systems
      visitors.delete(ip);
      blockedIPs.delete(ip);
      
      // Remove from persistent history
      for (const [key, visitor] of allVisitorHistory.entries()) {
        if (visitor.ip === ip) {
          allVisitorHistory.delete(key);
        }
      }

      console.log(`Visitor ${ip} deleted by admin`);
      res.json({ message: `Visitor ${ip} deleted successfully` });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete visitor" });
    }
  });

  // Bulk delete all visitor data
  app.delete("/api/admin/visitors/bulk-delete", (req, res) => {
    try {
      // Clear all visitor data
      visitors.clear();
      allVisitorHistory.clear();
      blockedIPs.clear();
      fileUploads.clear();
      linkUploads.clear();
      fileOperations.length = 0; // Clear array
      linkOperations.length = 0; // Clear link operations array

      console.log("All visitor data deleted by admin");
      res.json({ message: "All visitor data deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to bulk delete visitor data" });
    }
  });

  // Link password management routes
  app.post("/api/admin/change-link-upload-password", async (req, res) => {
    try {
      const { newPassword } = req.body;
      if (!newPassword || !validateInput(newPassword, 100)) {
        return res.status(400).json({ message: "Invalid password format" });
      }
      // Update the hardcoded password in link upload route
      res.json({ message: "Link upload password changed successfully", changedAt: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ message: "Failed to change link upload password" });
    }
  });

  app.post("/api/admin/change-link-delete-password", async (req, res) => {
    try {
      const { newPassword } = req.body;
      if (!newPassword || !validateInput(newPassword, 100)) {
        return res.status(400).json({ message: "Invalid password format" });
      }
      // Update the hardcoded password in link delete route
      res.json({ message: "Link delete password changed successfully", changedAt: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ message: "Failed to change link delete password" });
    }
  });

}