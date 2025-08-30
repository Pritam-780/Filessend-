
import { useState, useEffect, useRef } from "react";
import { X, Send, Users, MessageCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: number;
}

interface ChatRoomProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatRoom({ isOpen, onClose }: ChatRoomProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [currentMessage, setCurrentMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !socket) {
      const newSocket = io(window.location.origin, {
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true
      });

      newSocket.on('connect', () => {
        console.log('Connected to chat server');
      });

      newSocket.on('message-history', (history: ChatMessage[]) => {
        setMessages(history);
      });

      newSocket.on('new-message', (message: ChatMessage) => {
        setMessages(prev => [...prev, message]);
      });

      newSocket.on('user-joined', (data) => {
        toast({
          title: "User Joined",
          description: `${data.username} joined the chat`,
          className: "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200",
        });
      });

      newSocket.on('user-left', (data) => {
        toast({
          title: "User Left", 
          description: `${data.username} left the chat`,
          className: "bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200",
        });
      });

      newSocket.on('user-count', (count: number) => {
        setUserCount(count);
      });

      newSocket.on('auth-error', (error: string) => {
        toast({
          title: "Authentication Error",
          description: error,
          variant: "destructive",
        });
        setIsConnecting(false);
      });

      newSocket.on('disconnect', () => {
        setIsAuthenticated(false);
        toast({
          title: "Disconnected",
          description: "You have been disconnected from the chat",
          variant: "destructive",
        });
      });

      setSocket(newSocket);
    }

    return () => {
      if (socket && !isOpen) {
        socket.disconnect();
        setSocket(null);
        setIsAuthenticated(false);
        setMessages([]);
        setUserCount(0);
      }
    };
  }, [isOpen]);

  const handleJoinChat = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast({
        title: "Username Required",
        description: "Please enter a username",
        variant: "destructive",
      });
      return;
    }

    if (!password) {
      toast({
        title: "Password Required", 
        description: "Please enter the chat password",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    
    socket?.emit('join-chat', {
      username: username.trim(),
      password: password
    });

    // Listen for successful join
    socket?.once('message-history', () => {
      setIsAuthenticated(true);
      setIsConnecting(false);
      toast({
        title: "Welcome to Chat!",
        description: `You're now connected as ${username}`,
        className: "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200",
      });
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentMessage.trim() || !socket || !isAuthenticated) {
      return;
    }

    socket.emit('send-message', {
      message: currentMessage.trim()
    });

    setCurrentMessage("");
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleClose = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setIsAuthenticated(false);
    setUsername("");
    setPassword("");
    setCurrentMessage("");
    setMessages([]);
    setUserCount(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] border-2 border-blue-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-blue-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-xl">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-6 w-6" />
                <h3 className="text-xl font-bold">AAILAR Chat Room</h3>
                {isAuthenticated && (
                  <div className="flex items-center gap-2 bg-white bg-opacity-20 rounded-full px-3 py-1">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-medium">{userCount} online</span>
                  </div>
                )}
              </div>
              <Button 
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="p-2 text-white hover:bg-white hover:bg-opacity-20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {!isAuthenticated ? (
            /* Login Form */
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md border border-blue-200">
                <div className="text-center mb-6">
                  <Lock className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                  <h4 className="text-xl font-bold text-gray-800 mb-2">Join Chat Room</h4>
                  <p className="text-gray-600">Enter your details to join the conversation</p>
                </div>

                <form onSubmit={handleJoinChat} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username
                    </label>
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      className="w-full border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                      maxLength={20}
                      disabled={isConnecting}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter chat password"
                      className="w-full border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                      disabled={isConnecting}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2"
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Joining...
                      </div>
                    ) : (
                      "Join Chat"
                    )}
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            /* Chat Interface */
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.username === username ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          msg.username === username
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                            : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium ${
                            msg.username === username ? 'text-blue-100' : 'text-blue-600'
                          }`}>
                            {msg.username}
                          </span>
                          <span className={`text-xs ${
                            msg.username === username ? 'text-blue-200' : 'text-gray-500'
                          }`}>
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm break-words">{msg.message}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200 bg-white rounded-b-xl">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <Input
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    maxLength={1000}
                    disabled={!socket}
                  />
                  <Button
                    type="submit"
                    disabled={!currentMessage.trim() || !socket}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
