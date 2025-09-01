import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";

const app = express();
const httpServer = createServer(app);

// Configure CORS for Socket.IO
app.use(cors({
  origin: process.env.NODE_ENV === "development" ? "http://localhost:5000" : true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === "development" ? "http://localhost:5000" : true,
    credentials: true
  },
  maxHttpBufferSize: 1e6, // 1MB
  pingTimeout: 60000,
  pingInterval: 25000
});

// Chat room management
const chatUsers = new Map();

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
  log(`User connected: ${socket.id}`);

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

    const message: any = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      username: user.username,
      message: data.message.substring(0, 1000), // Limit message length
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
    // Broadcast file upload to all users in chat
    socket.to('main-chat').emit('file-uploaded', fileData);
    log(`File ${fileData.originalName} uploaded and broadcast to chat`);
  });

  socket.on('disconnect', () => {
    const user = chatUsers.get(socket.id);
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

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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