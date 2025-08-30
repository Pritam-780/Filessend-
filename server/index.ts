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
}> = [];

// Keep only last 500 messages in memory
const MAX_MESSAGES = 500;

io.on('connection', (socket) => {
  log(`User connected: ${socket.id}`);

  socket.on('join-chat', (data) => {
    const { username, password } = data;
    
    if (password !== 'Ak47') {
      socket.emit('auth-error', 'Invalid password');
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
  await registerRoutes(app);

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

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
