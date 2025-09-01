import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { registerRoutes } from "./routes";
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
  max: 500, // Increased from 100 to 500 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Increased from 5 to 20 auth attempts per windowMs
  message: "Too many authentication attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // Increased from 10 to 50 uploads per minute
  message: "Too many upload attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// Configure CORS for Socket.IO
app.use(cors({
  origin: process.env.NODE_ENV === "development" ? "http://localhost:5000" : true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

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

// Placeholder for chat password management. In a real application, this would be stored securely (e.g., in environment variables or a database).
let currentChatPassword = process.env.CHAT_PASSWORD || "Ak47"; // Default password

function getChatPassword(): string {
  return currentChatPassword;
}

// Function to change the chat password (would be called from an admin route)
function setChatPassword(newPassword: string): void {
  currentChatPassword = newPassword;
  log(`Chat password updated to: ${newPassword}`);
}


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

    chatUsers.set(socket.id, { username, joinedAt: Date.now() });
    socket.join('main-chat');

    // Send recent message history to new user
    socket.emit('message-history', messageHistory.slice(-100));

    // Notify others about new user
    socket.to('main-chat').emit('user-joined', { username });

    // Send current user count
    io.to('main-chat').emit('user-count', chatUsers.size);

    log(`User ${username} joined chat`);
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
      socket.to('main-chat').emit('user-left', { username: user.username });
      io.to('main-chat').emit('user-count', chatUsers.size);
      log(`User ${user.username} left chat`);
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
  await registerRoutes(app, io);

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