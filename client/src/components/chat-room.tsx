
import { useState, useEffect, useRef } from "react";
import { X, Send, Users, MessageCircle, Lock, Trash2, AlertTriangle, Reply, FileText, Folder, Search, Eye, Download, Filter, Image, FileSpreadsheet, ArrowLeft, Upload, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";
import { FileData, fileStorage } from "@/lib/fileStorage";
import PreviewModal from "./preview-modal";

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
  attachment?: {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
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
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [files, setFiles] = useState<FileData[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileData[]>([]);
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Load files and filter them
  const loadFiles = async () => {
    try {
      const response = await fetch('/api/files');
      if (response.ok) {
        const allFiles = await response.json();
        setFiles(allFiles);
        filterFiles(allFiles, fileSearchQuery, selectedCategory);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  const filterFiles = (fileList: FileData[], searchQuery: string, category: string) => {
    let filtered = fileList;
    
    if (searchQuery) {
      filtered = filtered.filter(file => 
        file.originalName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (category && category !== "all") {
      filtered = filtered.filter(file => file.category === category);
    }
    
    setFilteredFiles(filtered);
  };

  const categories = [
    { id: "all", name: "All Files", icon: Folder },
    { id: "academics", name: "Academic", icon: FileText },
    { id: "relaxing", name: "Relaxing", icon: Image },
    { id: "sessions", name: "Sessions", icon: FileSpreadsheet }
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    filterFiles(files, fileSearchQuery, selectedCategory);
  }, [files, fileSearchQuery, selectedCategory]);

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

      newSocket.on('file-uploaded', (fileData) => {
        // Refresh file list when someone uploads a file
        loadFiles();
        toast({
          title: "New File",
          description: `${fileData.originalName} was uploaded`,
          className: "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200",
        });
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!currentMessage.trim() && !selectedFile) || !socket || !isAuthenticated) {
      return;
    }

    setIsUploading(true);
    
    try {
      const messageData: any = {
        message: currentMessage.trim() || (selectedFile ? `📎 ${selectedFile.name}` : '')
      };

      if (replyingTo) {
        messageData.replyTo = {
          id: replyingTo.id,
          username: replyingTo.username,
          message: replyingTo.message
        };
      }

      // Handle file attachment
      if (selectedFile) {
        const formData = new FormData();
        formData.append('files', selectedFile);
        formData.append('category', 'sessions');
        
        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          const uploadedFiles = await response.json();
          if (uploadedFiles && uploadedFiles.length > 0) {
            messageData.attachment = {
              id: uploadedFiles[0].id,
              originalName: uploadedFiles[0].originalName,
              mimeType: uploadedFiles[0].mimeType,
              size: uploadedFiles[0].size
            };
            // Refresh file list
            loadFiles();
            
          }
        } else {
          throw new Error('Failed to upload file');
        }
      }

      socket.emit('send-message', messageData);

      setCurrentMessage("");
      setSelectedFile(null);
      setReplyingTo(null);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "Failed to upload file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
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

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    } else if (mimeType.includes('pdf')) {
      return <FileText className="h-4 w-4 text-red-500" />;
    } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
      return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
    } else {
      return <FileText className="h-4 w-4" />;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select a file smaller than 10MB.",
          variant: "destructive"
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderFileAttachment = (attachment: any) => {
    const file = files.find(f => f.id === attachment.id);
    if (!file) return null;

    if (attachment.mimeType.startsWith('image/')) {
      const imageUrl = `/api/files/${attachment.id}/download`;
      return (
        <div className="mt-2 max-w-xs">
          <img 
            src={imageUrl} 
            alt={attachment.originalName}
            className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setPreviewFile(file)}
          />
          <p className="text-xs opacity-75 mt-1">{attachment.originalName}</p>
        </div>
      );
    }
    
    return (
      <div className="mt-2 p-3 bg-white bg-opacity-20 rounded-lg max-w-xs">
        <div className="flex items-center gap-2">
          {getFileIcon(attachment.mimeType)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{attachment.originalName}</p>
            <p className="text-xs opacity-75">{(attachment.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <Button
            onClick={() => file && setPreviewFile(file)}
            className="w-8 h-8 p-0 bg-white bg-opacity-20 hover:bg-white hover:bg-opacity-30"
            size="sm"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
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
      <div className="h-[80vh] w-[90vw] max-w-4xl mx-auto mt-[10vh] bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex flex-col rounded-2xl shadow-2xl">
        {/* Top Header */}
        <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="p-2 text-white hover:bg-white hover:bg-opacity-20"
                data-testid="button-back-home"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <MessageCircle className="h-6 w-6" />
              <h3 className="text-lg font-bold bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-pulse">Welcome to online library</h3>
              {isAuthenticated && (
                <div className="flex items-center gap-2 bg-white bg-opacity-20 rounded-full px-3 py-1">
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">{userCount} online</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isAuthenticated && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFileBrowser(!showFileBrowser)}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm"
                    data-testid="button-toggle-files"
                  >
                    <Folder className="h-4 w-4 mr-1" />
                    Files
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteAllModal(true)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete All
                  </Button>
                </>
              )}
              <Button 
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="p-2 text-white hover:bg-white hover:bg-opacity-20"
                data-testid="button-close-chat"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">

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
            /* Chat Interface with File Browser */
            <>
              {/* File Browser Sidebar */}
              {showFileBrowser && (
                <div className="w-80 bg-gray-800 text-white border-r border-gray-700 flex flex-col">
                  <div className="p-4 border-b border-gray-700">
                    <h3 className="text-lg font-bold mb-3 text-center">📁 File Browser</h3>
                    
                    {/* Search */}
                    <div className="relative mb-3">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search files..."
                        value={fileSearchQuery}
                        onChange={(e) => setFileSearchQuery(e.target.value)}
                        className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        data-testid="input-file-search"
                      />
                    </div>
                    
                    {/* Category Filter */}
                    <div className="space-y-2">
                      {categories.map((cat) => (
                        <Button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`w-full justify-start text-left p-2 ${
                            selectedCategory === cat.id
                              ? 'bg-blue-600 hover:bg-blue-700'
                              : 'bg-gray-700 hover:bg-gray-600'
                          }`}
                          size="sm"
                          data-testid={`button-category-${cat.id}`}
                        >
                          <cat.icon className="h-4 w-4 mr-2" />
                          {cat.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {/* File List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {filteredFiles.length === 0 ? (
                      <div className="text-center text-gray-400 py-8">
                        <Folder className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No files found</p>
                      </div>
                    ) : (
                      filteredFiles.map((file) => (
                        <div
                          key={file.id}
                          className="bg-gray-700 rounded-lg p-3 hover:bg-gray-600 cursor-pointer transition-all group"
                          data-testid={`file-item-${file.id}`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            {getFileIcon(file.mimeType)}
                            <span className="text-sm font-medium truncate flex-1">{file.originalName}</span>
                          </div>
                          <div className="text-xs text-gray-400 mb-2">
                            {(file.size / 1024 / 1024).toFixed(2)} MB • {file.category}
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              onClick={() => setPreviewFile(file)}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1"
                              size="sm"
                              data-testid={`button-preview-${file.id}`}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Preview
                            </Button>
                            <Button
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = `/api/files/${file.id}/download`;
                                link.download = file.originalName;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-1"
                              size="sm"
                              data-testid={`button-download-${file.id}`}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Chat Area */}
              <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-50 to-blue-50">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                        <div className="relative max-w-sm md:max-w-md lg:max-w-lg">
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
                            className={`px-4 py-3 rounded-lg cursor-pointer transition-all text-white shadow-md ${
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
                            <p className="text-sm break-words leading-relaxed">{msg.message}</p>
                            {msg.attachment && renderFileAttachment(msg.attachment)}
                          </div>
                          
                          {/* Action buttons - appears on hover */}
                          {hoveredMessage === msg.id && (
                            <div className="absolute -top-2 -right-2 flex gap-1">
                              <Button
                                onClick={() => handleReplyToMessage(msg)}
                                className="w-7 h-7 p-0 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg opacity-90 hover:opacity-100 transition-all"
                                size="sm"
                                data-testid={`button-reply-${msg.id}`}
                              >
                                <Reply className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="w-7 h-7 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg opacity-90 hover:opacity-100 transition-all"
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
                <div className="p-4 bg-white border-t border-gray-200 shadow-lg">
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

                  {/* File Selection Preview */}
                  {selectedFile && (
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-green-700">
                          <Paperclip className="h-4 w-4" />
                          <span className="text-sm font-medium">File attached</span>
                        </div>
                        <Button
                          onClick={removeSelectedFile}
                          className="w-5 h-5 p-0 bg-gray-400 hover:bg-gray-500 text-white rounded-full"
                          size="sm"
                          data-testid="button-remove-file"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        {getFileIcon(selectedFile.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                          <p className="text-xs text-gray-600">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <form onSubmit={handleSendMessage} className="flex gap-3">
                    <div className="flex-1 relative">
                      <Input
                        type="text"
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        placeholder={replyingTo ? `Reply to ${replyingTo.username}...` : selectedFile ? "Add a message (optional)..." : "Type your message..."}
                        className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base py-3 pr-12"
                        maxLength={1000}
                        disabled={!socket || isUploading}
                        data-testid="input-message"
                      />
                    </div>
                    
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      onChange={handleFileSelect}
                      className="hidden"
                      data-testid="input-file"
                    />
                    
                    {/* File upload button */}
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!socket || isUploading}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-3"
                      data-testid="button-upload"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      type="submit"
                      disabled={(!currentMessage.trim() && !selectedFile) || !socket || isUploading}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3"
                      data-testid="button-send"
                    >
                      {isUploading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>

        {/* File Preview Modal */}
        <PreviewModal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          file={previewFile}
        />

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
  );
}
