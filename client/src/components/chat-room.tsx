
import { useState, useEffect, useRef } from "react";
import { X, Send, Users, MessageCircle, Lock, Trash2, AlertTriangle, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: number;
  replyTo?: {
    id: string;
    username: string;
    message: string;
  };
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
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteAllPassword, setDeleteAllPassword] = useState("");
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Generate consistent color for each user (avoiding white)
  const getUserColor = (username: string) => {
    const colors = [
      'bg-gradient-to-r from-red-500 to-pink-500',
      'bg-gradient-to-r from-blue-500 to-cyan-500',
      'bg-gradient-to-r from-green-500 to-emerald-500',
      'bg-gradient-to-r from-purple-500 to-violet-500',
      'bg-gradient-to-r from-orange-500 to-amber-500',
      'bg-gradient-to-r from-indigo-500 to-blue-500',
      'bg-gradient-to-r from-pink-500 to-rose-500',
      'bg-gradient-to-r from-teal-500 to-green-500',
      'bg-gradient-to-r from-yellow-500 to-orange-500',
      'bg-gradient-to-r from-slate-600 to-gray-600'
    ];
    
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

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

      newSocket.on('message-deleted', (messageId: string) => {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
      });

      newSocket.on('all-messages-deleted', () => {
        setMessages([]);
        toast({
          title: "All Messages Deleted",
          description: "All chat messages have been cleared",
          className: "bg-gradient-to-r from-red-50 to-pink-50 border-red-200",
        });
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

    const messageData: any = {
      message: currentMessage.trim()
    };

    if (replyingTo) {
      messageData.replyTo = {
        id: replyingTo.id,
        username: replyingTo.username,
        message: replyingTo.message
      };
    }

    socket.emit('send-message', messageData);

    setCurrentMessage("");
    setReplyingTo(null);
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!socket || !isAuthenticated) return;
    
    socket.emit('delete-message', { messageId });
  };

  const handleReplyToMessage = (message: ChatMessage) => {
    setReplyingTo(message);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const handleDeleteAllMessages = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (deleteAllPassword !== "Ak47") {
      toast({
        title: "Access Denied",
        description: "Incorrect password. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsDeletingAll(true);
    
    setTimeout(() => {
      if (socket && isAuthenticated) {
        socket.emit('delete-all-messages');
      }
      setIsDeletingAll(false);
      setDeleteAllPassword("");
      setShowDeleteAllModal(false);
    }, 500);
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
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] border-2 border-indigo-300 flex flex-col">
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
              <div className="flex items-center gap-2">
                {isAuthenticated && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteAllModal(true)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete All
                  </Button>
                )}
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
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-blue-50 via-indigo-50 to-purple-50">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.username === username ? 'justify-end' : 'justify-start'} group`}
                      onMouseEnter={() => setHoveredMessage(msg.id)}
                      onMouseLeave={() => setHoveredMessage(null)}
                    >
                      <div className="relative max-w-xs lg:max-w-md">
                        {/* Reply indicator */}
                        {msg.replyTo && (
                          <div className="mb-2 p-2 bg-gray-100 border-l-4 border-gray-400 rounded-r-lg text-xs">
                            <div className="flex items-center gap-1 text-gray-600 mb-1">
                              <Reply className="h-3 w-3" />
                              <span className="font-medium">{msg.replyTo.username}</span>
                            </div>
                            <p className="text-gray-700 italic truncate">{msg.replyTo.message}</p>
                          </div>
                        )}
                        
                        <div
                          className={`px-4 py-2 rounded-lg cursor-pointer transition-all text-white ${
                            msg.username === username
                              ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                              : getUserColor(msg.username)
                          }`}
                          onClick={() => handleReplyToMessage(msg)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-white opacity-90">
                              {msg.username}
                            </span>
                            <span className="text-xs text-white opacity-75">
                              {formatTime(msg.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm break-words">{msg.message}</p>
                        </div>
                        
                        {/* Action buttons - appears on hover */}
                        {hoveredMessage === msg.id && (
                          <div className="absolute -top-2 -right-2 flex gap-1">
                            <Button
                              onClick={() => handleReplyToMessage(msg)}
                              className="w-6 h-6 p-0 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg opacity-90 hover:opacity-100 transition-all"
                              size="sm"
                              data-testid={`button-reply-${msg.id}`}
                            >
                              <Reply className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="w-6 h-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg opacity-90 hover:opacity-100 transition-all"
                              size="sm"
                              data-testid={`button-delete-${msg.id}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-indigo-200 bg-gradient-to-r from-white to-blue-50 rounded-b-xl">
                {/* Reply Preview */}
                {replyingTo && (
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-blue-700">
                        <Reply className="h-4 w-4" />
                        <span className="text-sm font-medium">Replying to {replyingTo.username}</span>
                      </div>
                      <Button
                        onClick={cancelReply}
                        className="w-5 h-5 p-0 bg-gray-400 hover:bg-gray-500 text-white rounded-full"
                        size="sm"
                        data-testid="button-cancel-reply"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-700 italic truncate">{replyingTo.message}</p>
                  </div>
                )}
                
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <Input
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder={replyingTo ? `Reply to ${replyingTo.username}...` : "Type your message..."}
                    className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    maxLength={1000}
                    disabled={!socket}
                    data-testid="input-message"
                  />
                  <Button
                    type="submit"
                    disabled={!currentMessage.trim() || !socket}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6"
                    data-testid="button-send"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          )}

          {/* Delete All Messages Modal */}
          <Dialog open={showDeleteAllModal} onOpenChange={setShowDeleteAllModal}>
            <DialogContent className="sm:max-w-[400px] bg-gradient-to-br from-red-50 via-white to-orange-50 border-2 border-red-200 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-700 text-xl font-bold">
                  <AlertTriangle className="h-6 w-6" />
                  Delete All Messages
                </DialogTitle>
                <DialogDescription className="text-gray-700 mt-2">
                  This action will permanently delete all messages in the chat room.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                  <p className="text-sm text-red-800 font-medium">
                    Warning: This will delete all {messages.length} messages in the chat room.
                  </p>
                </div>
                
                <form onSubmit={handleDeleteAllMessages} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="deletePassword" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Enter Password
                    </label>
                    <Input
                      id="deletePassword"
                      type="password"
                      value={deleteAllPassword}
                      onChange={(e) => setDeleteAllPassword(e.target.value)}
                      placeholder="Enter password to confirm"
                      className="border-red-300 focus:border-red-500 focus:ring-red-500"
                      disabled={isDeletingAll}
                      required
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowDeleteAllModal(false);
                        setDeleteAllPassword("");
                      }}
                      className="flex-1 border-gray-300 hover:bg-gray-50"
                      disabled={isDeletingAll}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium shadow-lg"
                      disabled={isDeletingAll || !deleteAllPassword}
                    >
                      {isDeletingAll ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Deleting...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Trash2 className="h-4 w-4" />
                          Delete All
                        </div>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
