import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { registerRoutes, getChatPassword } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const app = express();
const httpServer = createServer(app);

// Trust proxy for Replit environment
app.set('trust proxy', true);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Increased to 2000 requests per 15 minutes
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Increased to 100 auth attempts per 15 minutes
  message: "Too many authentication attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // Increased to 200 uploads per minute
  message: "Too many upload attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Only apply rate limiting in production
if (process.env.NODE_ENV === "production") {
  app.use(generalLimiter);
}

// Configure CORS for Socket.IO
app.use(cors({
  origin: process.env.NODE_ENV === "development" ? "http://localhost:5000" : true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// IP blocking middleware
app.use((req, res, next) => {
  // Skip blocking for admin routes
  if (req.path.startsWith('/api/admin/') || req.path.startsWith('/api/visitor/')) {
    return next();
  }

  const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
    (req.connection.socket ? req.connection.socket.remoteAddress : null) || 
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';

  // Check if IP is blocked (this will be populated by the routes)
  // The actual blocking logic will be implemented in routes.ts
  next();
});

// Initialize Socket.IO with performance optimizations
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === "development" ? "http://localhost:5000" : true,
    credentials: true
  },
  maxHttpBufferSize: 1e6, // 1MB
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  compression: true,
  perMessageDeflate: {
    threshold: 1024,
    zlibDeflateOptions: {
      chunkSize: 1024,
      windowBits: 13,
      level: 3,
      concurrency: 10,
    },
    zlibInflateOptions: {
      chunkSize: 1024,
      windowBits: 13,
      level: 3,
      concurrency: 10,
    }
  }
});

// Chat room management with connection limits
const chatUsers = new Map();
const connectionsByIP = new Map();
const MAX_CONNECTIONS_PER_IP = 5;
const MAX_TOTAL_CONNECTIONS = 100;

// Export chat users for admin dashboard
export function getActiveChatUsers() {
  return Array.from(chatUsers.values()).map(user => ({
    username: user.username,
    ip: user.ip,
    joinedAt: user.joinedAt,
    socketId: user.socketId || 'unknown'
  }));
}

let messageHistory: Array<{
  id: string;
  username: string;
  message: string;
  timestamp: number;
  replyTo?: {
    id: string;
    username: string;
    message: string;
  };
  attachment?: {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
  };
}> = [];

// Chat password is managed in routes.ts


// Keep only last 500 messages in memory
const MAX_MESSAGES = 500;

io.on('connection', (socket) => {
  const clientIP = socket.handshake.address;

  // Check total connections
  if (chatUsers.size >= MAX_TOTAL_CONNECTIONS) {
    socket.emit('connection-error', 'Server is at capacity. Please try again later.');
    socket.disconnect();
    return;
  }

  // Check connections per IP
  const ipConnections = connectionsByIP.get(clientIP) || 0;
  if (ipConnections >= MAX_CONNECTIONS_PER_IP) {
    socket.emit('connection-error', 'Too many connections from your IP address.');
    socket.disconnect();
    return;
  }

  connectionsByIP.set(clientIP, ipConnections + 1);
  log(`User connected: ${socket.id} from IP: ${clientIP}`);

  // Chat room management
  socket.on('join-chat', (data) => {
    const { username, password } = data;
    const clientIP = socket.handshake.address;

    // Authenticate with username and chat password
    if (password !== getChatPassword()) {
      socket.emit('auth-error', 'Invalid password');
      return;
    }

    // Check if username is already taken
    const existingUser = Array.from(chatUsers.values()).find(user => user.username.toLowerCase() === username.toLowerCase());
    if (existingUser) {
      socket.emit('auth-error', 'Username already taken. Please choose a different name.');
      return;
    }

    chatUsers.set(socket.id, { 
      username, 
      ip: clientIP,
      joinedAt: Date.now(),
      socketId: socket.id
    });
    socket.join('main-chat');

    // Send recent message history to new user
    socket.emit('message-history', messageHistory.slice(-100));

    // Notify others about new user
    socket.to('main-chat').emit('user-joined', { 
      username,
      message: `${username} joined the chat`
    });

    // Send current user count and online users (without IPs for chat room)
    const onlineUsersForChat = Array.from(chatUsers.values()).map(user => ({
      username: user.username,
      joinedAt: user.joinedAt
    }));
    
    io.to('main-chat').emit('user-count', chatUsers.size);
    io.to('main-chat').emit('online-users', onlineUsersForChat);

    log(`User ${username} (${clientIP}) joined chat`);
  });

  socket.on('send-message', (data) => {
    const user = chatUsers.get(socket.id);
    if (!user) {
      socket.emit('auth-error', 'Not authenticated');
      return;
    }

    // Input validation
    if (!data.message || typeof data.message !== 'string') {
      socket.emit('message-error', 'Invalid message format');
      return;
    }

    // Sanitize message
    const sanitizedMessage = data.message
      .trim()
      .substring(0, 1000)
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''); // Remove script tags

    if (!sanitizedMessage) {
      socket.emit('message-error', 'Message cannot be empty');
      return;
    }

    const message: any = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      username: user.username,
      userIP: user.ip,
      message: sanitizedMessage,
      timestamp: Date.now()
    };

    // Add reply information if provided
    if (data.replyTo) {
      message.replyTo = {
        id: data.replyTo.id,
        username: data.replyTo.username,
        message: data.replyTo.message.substring(0, 100) // Limit reply preview
      };
    }

    // Add file attachment if provided
    if (data.attachment) {
      message.attachment = {
        id: data.attachment.id,
        originalName: data.attachment.originalName,
        mimeType: data.attachment.mimeType,
        size: data.attachment.size
      };
    }

    messageHistory.push(message);

    // Keep only recent messages
    if (messageHistory.length > MAX_MESSAGES) {
      messageHistory = messageHistory.slice(-MAX_MESSAGES);
    }

    // Broadcast message to all users in chat
    io.to('main-chat').emit('new-message', message);
  });

  socket.on('delete-message', (data) => {
    const user = chatUsers.get(socket.id);
    if (!user) {
      socket.emit('auth-error', 'Not authenticated');
      return;
    }

    const { messageId } = data;

    // Find the message to check ownership
    const messageToDelete = messageHistory.find(msg => msg.id === messageId);
    if (!messageToDelete) {
      socket.emit('auth-error', 'Message not found');
      return;
    }

    // Only allow users to delete their own messages
    if (messageToDelete.username !== user.username) {
      socket.emit('auth-error', 'You can only delete your own messages');
      return;
    }

    // Remove message from history
    messageHistory = messageHistory.filter(msg => msg.id !== messageId);

    // Broadcast deletion to all users
    io.to('main-chat').emit('message-deleted', messageId);

    log(`Message ${messageId} deleted by ${user.username}`);
  });

  socket.on('delete-all-messages', () => {
    const user = chatUsers.get(socket.id);
    if (!user) {
      socket.emit('auth-error', 'Not authenticated');
      return;
    }

    // Clear all messages
    messageHistory = [];

    // Broadcast to all users that all messages were deleted
    io.to('main-chat').emit('all-messages-deleted');

    log(`All messages deleted by ${user.username}`);
  });

  socket.on('file-uploaded', (fileData) => {
    // Broadcast file upload to all users in chat including sender
    io.to('main-chat').emit('file-uploaded', fileData);
    log(`File ${fileData.originalName} uploaded and broadcast to chat`);
  });

  socket.on('disconnect', () => {
    const user = chatUsers.get(socket.id);
    const clientIP = socket.handshake.address;

    // Clean up IP connection count
    const ipConnections = connectionsByIP.get(clientIP) || 0;
    if (ipConnections <= 1) {
      connectionsByIP.delete(clientIP);
    } else {
      connectionsByIP.set(clientIP, ipConnections - 1);
    }

    if (user) {
      chatUsers.delete(socket.id);
      socket.to('main-chat').emit('user-left', { 
        username: user.username,
        message: `${user.username} left the chat`
      });
      
      // Send updated online users list (without IPs for chat room)
      const onlineUsersForChat = Array.from(chatUsers.values()).map(u => ({
        username: u.username,
        joinedAt: u.joinedAt
      }));
      
      io.to('main-chat').emit('user-count', chatUsers.size);
      io.to('main-chat').emit('online-users', onlineUsersForChat);
      log(`User ${user.username} (${user.ip}) left chat`);
    }
  });
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(app, io, () => getActiveChatUsers());

  // Placeholder for admin dashboard route to change chat password
  app.post('/api/admin/change-chat-password', (req: Request, res: Response) => {
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required' });
    }
    // In a real app, you'd want to validate the new password and potentially the current admin user.
    setChatPassword(newPassword);
    res.status(200).json({ message: 'Chat password updated successfully' });
  });

  // Route for uploading links
  app.post('/api/links/upload', uploadLimiter, (req: Request, res: Response) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }

    // In a real application, you would process the URL here (e.g., save to database, fetch content, etc.)
    // For now, we'll just acknowledge the upload.
    log(`Received upload for URL: ${url}`);
    res.status(200).json({ message: 'URL uploaded successfully', url });
  });


  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;

    // Don't expose internal error details in production
    const message = process.env.NODE_ENV === "development"
      ? err.message || "Internal Server Error"
      : "Internal Server Error";

    // Log error for debugging
    log(`Error ${status}: ${err.message}`);

    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();