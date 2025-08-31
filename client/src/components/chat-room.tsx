import { useState, useEffect, useRef } from "react";
import { X, Send, Users, MessageCircle, Lock, Trash2, AlertTriangle, Reply, FileText, Folder, Search, Eye, Download, Filter, Image, FileSpreadsheet, ArrowLeft, Upload, Paperclip, Menu } from "lucide-react";
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

  // State for the new delete file modal
  const [showDeleteFileModal, setShowDeleteFileModal] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [deleteFilePassword, setDeleteFilePassword] = useState("");

  // Generate consistent color for each user
  const getUserColor = (username: string) => {
    const colors = [
      '#e57373', '#f06292', '#ba68c8', '#9575cd', 
      '#7986cb', '#64b5f6', '#4fc3f7', '#4dd0e1',
      '#4db6ac', '#81c784', '#aed581', '#ffb74d',
      '#ff8a65', '#a1887f', '#90a4ae'
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
      } else {
        console.error('Failed to load files:', response.status);
        // Only show error for serious failures
        if (response.status >= 500) {
          toast({
            title: "Server Error",
            description: "Failed to load files. Please refresh the page.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Failed to load files:', error);
      toast({
        title: "Connection Error",
        description: "Unable to connect to server. Please check your connection.",
        variant: "destructive",
      });
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
          className: "bg-green-50 border-green-200",
        });
      });

      newSocket.on('user-left', (data) => {
        toast({
          title: "User Left", 
          description: `${data.username} left the chat`,
          className: "bg-orange-50 border-orange-200",
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
          className: "bg-red-50 border-red-200",
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
        loadFiles();
        toast({
          title: "New File",
          description: `${fileData.originalName} was uploaded`,
          className: "bg-blue-50 border-blue-200",
        });
      });

      newSocket.on('file-deleted', (data) => {
        // Only reload files if we're still authenticated and connected
        if (isAuthenticated && newSocket.connected) {
          loadFiles();
          toast({
            title: "File Deleted",
            description: `${data.filename} was permanently deleted`,
            className: "bg-red-50 border-red-200",
          });
        }
      });

      newSocket.on('disconnect', (reason) => {
        // Only show logout for transport errors or server disconnects
        if (reason === 'transport error' || reason === 'server namespace disconnect') {
          setIsAuthenticated(false);
          toast({
            title: "Disconnected",
            description: "You have been disconnected from the chat",
            variant: "destructive",
          });
        }
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

    socket?.once('message-history', () => {
      setIsAuthenticated(true);
      setIsConnecting(false);
      toast({
        title: "Welcome to Chat!",
        description: `You're now connected as ${username}`,
        className: "bg-blue-50 border-blue-200",
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

  // New function to handle file deletion with password
  const handleDeleteFile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (deleteFilePassword !== "Ak47") {
      toast({
        title: "Access Denied",
        description: "Invalid password. Please check your credentials.",
        variant: "destructive",
      });
      return;
    }

    if (!deletingFileId) return;

    try {
      const response = await fetch(`/api/files/${deletingFileId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: deleteFilePassword
        })
      });

      if (response.ok) {
        toast({
          title: "File Deleted",
          description: "File has been permanently deleted from Chat Store",
          className: "bg-red-50 border-red-200",
        });
        loadFiles();
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        if (response.status === 403) {
          throw new Error('Incorrect password. Access denied.');
        } else {
          throw new Error(errorData.message || 'Failed to delete file');
        }
      }
    } catch (error) {
      console.error('Delete file error:', error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete file",
        variant: "destructive",
      });
    } finally {
      setDeletingFileId(null);
      setDeleteFilePassword("");
      setShowDeleteFileModal(false);
    }
  };


  const renderFileAttachment = (attachment: any) => {
    const file = files.find(f => f.id === attachment.id);
    if (!file) return null;

    if (attachment.mimeType.startsWith('image/')) {
      const imageUrl = `/api/files/${attachment.id}/download`;
      return (
        <div className="mt-2 max-w-xs">
          <div className="relative">
            <img 
              src={imageUrl} 
              alt={attachment.originalName}
              className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setPreviewFile(file)}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium opacity-75 truncate">{attachment.originalName}</p>
              <p className="text-xs text-blue-200 opacity-80">💾 Stored in Chat Store</p>
            </div>
            <Button
              onClick={() => {
                setDeletingFileId(attachment.id);
                setShowDeleteFileModal(true);
              }}
              className="w-8 h-8 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
              size="sm"
              title="Delete file"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-2 p-3 bg-white bg-opacity-10 rounded-lg max-w-xs">
        <div className="flex items-center gap-2">
          {getFileIcon(attachment.mimeType)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{attachment.originalName}</p>
            <p className="text-xs opacity-75">{(attachment.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <div className="flex gap-1">
            <Button
              onClick={() => file && setPreviewFile(file)}
              className="w-8 h-8 p-0 bg-white bg-opacity-20 hover:bg-white hover:bg-opacity-30"
              size="sm"
              title="Preview file"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => {
                setDeletingFileId(attachment.id);
                setShowDeleteFileModal(true);
              }}
              className="w-8 h-8 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full"
              size="sm"
              title="Delete file"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const handleDeleteAllMessages = (e: React.FormEvent) => {
    e.preventDefault();

    if (deleteAllPassword !== "Ak47") {
      toast({
        title: "Access Denied",
        description: "Invalid password. Please check your credentials.",
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
    <div className="fixed inset-0 z-50 flex">
      {/* Telegram-style Layout */}
      <div className="flex flex-col w-full h-full bg-white">

        {/* Fixed Header - Telegram Style */}
        <div className="flex-shrink-0 h-14 bg-[#517da2] text-white shadow-md border-b border-[#4a6d94]">
          <div className="flex items-center h-full px-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-full mr-3"
              data-testid="button-back-home"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-center flex-1">
              <div className="w-9 h-9 bg-[#3d5a7a] rounded-full flex items-center justify-center mr-3">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-lg leading-tight">Chat Room</h3>
                {isAuthenticated && (
                  <p className="text-[#a8c4e8] text-sm">
                    {userCount} {userCount === 1 ? 'member' : 'members'} online
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAuthenticated && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFileBrowser(!showFileBrowser)}
                    className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-full flex items-center gap-1"
                    data-testid="button-toggle-files"
                    title="Open Chat Store"
                  >
                    <Folder className="h-5 w-5" />
                    <span className="text-xs font-medium hidden sm:inline">Store</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteAllModal(true)}
                    className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-full"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">

          {/* Chat Store Sidebar - Enhanced Design */}
          {showFileBrowser && isAuthenticated && (
            <div className="w-80 bg-gradient-to-b from-white to-blue-50 border-r border-blue-200 flex flex-col flex-shrink-0 shadow-lg">
              <div className="p-4 border-b border-blue-200 bg-gradient-to-r from-blue-100 to-indigo-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                      <Folder className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="text-lg font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">Chat Store 💾</h3>
                  </div>
                  <Button
                    onClick={() => setShowFileBrowser(false)}
                    className="w-8 h-8 p-0 bg-white bg-opacity-50 hover:bg-white hover:bg-opacity-70 text-blue-600 rounded-full shadow-md"
                    size="sm"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-blue-600 font-medium mb-3">
                  All files shared in chat are stored here safely! 🔒
                </p>

                <div className="relative mb-3">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search files..."
                    value={fileSearchQuery}
                    onChange={(e) => setFileSearchQuery(e.target.value)}
                    className="pl-10 bg-white border-gray-300 focus:border-[#517da2] focus:ring-[#517da2]"
                    data-testid="input-file-search"
                  />
                </div>

                <div className="space-y-1">
                  {categories.map((cat) => (
                    <Button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full justify-start text-left p-2 rounded-md ${
                        selectedCategory === cat.id
                          ? 'bg-[#517da2] hover:bg-[#4a6d94] text-white'
                          : 'bg-transparent hover:bg-gray-100 text-gray-700'
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

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredFiles.length === 0 ? (
                  <div className="text-center text-blue-400 py-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Folder className="h-8 w-8 text-blue-500 opacity-60" />
                    </div>
                    <p className="text-blue-600 font-medium">No files in Chat Store yet!</p>
                    <p className="text-sm text-blue-500 mt-1">Share files in chat to see them here 📁</p>
                  </div>
                ) : (
                  filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      className="bg-gradient-to-r from-white to-blue-50 hover:from-blue-50 hover:to-indigo-50 rounded-xl p-4 cursor-pointer transition-all duration-200 group border-2 border-blue-200 hover:border-blue-300 shadow-sm hover:shadow-md"
                      data-testid={`file-item-${file.id}`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                          {getFileIcon(file.mimeType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate text-gray-800">{file.originalName}</p>
                          <p className="text-xs text-blue-600 font-medium">💾 {(file.size / 1024 / 1024).toFixed(2)} MB • Chat Store</p>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          onClick={() => setPreviewFile(file)}
                          className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs py-2 rounded-lg font-medium shadow-sm"
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
                          className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-xs py-2 rounded-lg font-medium shadow-sm"
                          size="sm"
                          data-testid={`button-download-${file.id}`}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                        <Button
                          onClick={() => {
                            setDeletingFileId(file.id);
                            setShowDeleteFileModal(true);
                          }}
                          className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs py-2 rounded-lg font-medium shadow-sm"
                          size="sm"
                          data-testid={`button-delete-store-${file.id}`}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Chat Area - Telegram Style */}
          <div className="flex-1 flex flex-col bg-[#e6ebee]">

            {!isAuthenticated ? (
              /* Login Form */
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md border">
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-[#517da2] rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock className="h-10 w-10 text-white" />
                    </div>
                    <h4 className="text-2xl font-bold text-gray-800 mb-2">Join Chat</h4>
                    <p className="text-gray-600">Enter your credentials to continue</p>
                  </div>

                  <form onSubmit={handleJoinChat} className="space-y-4">
                    <div>
                      <Input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Username"
                        className="w-full h-12 border-gray-300 focus:border-[#517da2] focus:ring-[#517da2] rounded-lg"
                        maxLength={20}
                        disabled={isConnecting}
                        required
                      />
                    </div>

                    <div>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full h-12 border-gray-300 focus:border-[#517da2] focus:ring-[#517da2] rounded-lg"
                        disabled={isConnecting}
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 bg-[#517da2] hover:bg-[#4a6d94] text-white font-medium rounded-lg"
                      disabled={isConnecting}
                    >
                      {isConnecting ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Connecting...
                        </div>
                      ) : (
                        "Join Chat"
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            ) : (
              <>
                {/* Messages Area - Fixed Height */}
                <div className="flex-1 overflow-y-auto p-4 pb-safe">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                      <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
                      <p className="text-lg">No messages yet</p>
                      <p className="text-sm">Start the conversation!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {messages.map((msg, index) => {
                        const isMyMessage = msg.username === username;
                        const showTime = index === 0 || 
                          (messages[index - 1] && messages[index - 1].timestamp < msg.timestamp - 60000);

                        return (
                          <div key={msg.id}>
                            {showTime && (
                              <div className="text-center my-4">
                                <span className="bg-gray-300 text-gray-600 px-3 py-1 rounded-full text-xs">
                                  {new Date(msg.timestamp).toLocaleDateString()} {formatTime(msg.timestamp)}
                                </span>
                              </div>
                            )}

                            <div
                              className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} group px-1`}
                              onMouseEnter={() => setHoveredMessage(msg.id)}
                              onMouseLeave={() => setHoveredMessage(null)}
                            >
                              <div className="relative max-w-[80%]">
                                {/* Reply indicator */}
                                {msg.replyTo && (
                                  <div className={`mb-1 p-2 rounded-t-lg border-l-4 text-xs ${
                                    isMyMessage 
                                      ? 'bg-[#dcf8c6] border-[#4fc3f7]' 
                                      : 'bg-white border-gray-400'
                                  }`}>
                                    <div className="flex items-center gap-1 text-gray-600 mb-1">
                                      <Reply className="h-3 w-3" />
                                      <span className="font-medium">{msg.replyTo.username}</span>
                                    </div>
                                    <p className="text-gray-700 italic truncate">{msg.replyTo.message}</p>
                                  </div>
                                )}

                                <div
                                  className={`px-3 py-2 rounded-lg shadow-sm cursor-pointer transition-all ${
                                    isMyMessage
                                      ? 'bg-[#dcf8c6] text-gray-800 rounded-br-sm'
                                      : 'bg-white text-gray-800 rounded-bl-sm'
                                  } ${msg.replyTo ? (isMyMessage ? 'rounded-t-none' : 'rounded-t-none') : ''}`}
                                  onClick={() => handleReplyToMessage(msg)}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    {!isMyMessage && (
                                      <span 
                                        className="text-sm font-semibold truncate max-w-32"
                                        style={{ color: getUserColor(msg.username) }}
                                      >
                                        {msg.username}
                                      </span>
                                    )}
                                    <span className="text-xs text-gray-500 ml-auto">
                                      {formatTime(msg.timestamp)}
                                    </span>
                                  </div>
                                  <p className="text-sm leading-relaxed break-words">{msg.message}</p>
                                  {msg.attachment && renderFileAttachment(msg.attachment)}
                                </div>

                                {/* Action buttons */}
                                {hoveredMessage === msg.id && (
                                  <div className={`absolute top-0 flex gap-1 ${isMyMessage ? '-left-16' : '-right-16'}`}>
                                    <Button
                                      onClick={() => handleReplyToMessage(msg)}
                                      className="w-8 h-8 p-0 bg-gray-500 hover:bg-gray-600 text-white rounded-full shadow-lg"
                                      size="sm"
                                      data-testid={`button-reply-${msg.id}`}
                                    >
                                      <Reply className="h-4 w-4" />
                                    </Button>
                                    {isMyMessage && (
                                      <Button
                                        onClick={() => handleDeleteMessage(msg.id)}
                                        className="w-8 h-8 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg"
                                        size="sm"
                                        data-testid={`button-delete-${msg.id}`}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Fixed Message Input Area - Telegram Style */}
                <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4 pb-safe">
                  {/* Reply Preview */}
                  {replyingTo && (
                    <div className="mb-3 p-3 bg-blue-50 border-l-4 border-[#517da2] rounded-r-lg">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 text-[#517da2]">
                          <Reply className="h-4 w-4" />
                          <span className="text-sm font-medium">Reply to {replyingTo.username}</span>
                        </div>
                        <Button
                          onClick={cancelReply}
                          className="w-6 h-6 p-0 bg-gray-400 hover:bg-gray-500 text-white rounded-full"
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
                    <div className="mb-3 p-3 bg-green-50 border-l-4 border-green-500 rounded-r-lg">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 text-green-600">
                          <Paperclip className="h-4 w-4" />
                          <span className="text-sm font-medium">File attached</span>
                        </div>
                        <Button
                          onClick={removeSelectedFile}
                          className="w-6 h-6 p-0 bg-gray-400 hover:bg-gray-500 text-white rounded-full"
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

                  {/* Input Row */}
                  <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <Input
                        type="text"
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        placeholder={
                          replyingTo ? `Reply to ${replyingTo.username}...` : 
                          selectedFile ? "Add a message (optional)..." : 
                          "Message"
                        }
                        className="w-full h-12 border-gray-300 focus:border-[#517da2] focus:ring-[#517da2] rounded-full px-4 pr-12 bg-white"
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
                      className="w-12 h-12 p-0 bg-gray-400 hover:bg-gray-500 text-white rounded-full flex-shrink-0"
                      data-testid="button-upload"
                    >
                      <Paperclip className="h-5 w-5" />
                    </Button>

                    <Button
                      type="submit"
                      disabled={(!currentMessage.trim() && !selectedFile) || !socket || isUploading}
                      className="w-12 h-12 p-0 bg-[#517da2] hover:bg-[#4a6d94] text-white rounded-full flex-shrink-0"
                      data-testid="button-send"
                    >
                      {isUploading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>

        {/* File Preview Modal */}
        <PreviewModal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          file={previewFile}
        />


        {/* Delete All Messages Modal */}
        <Dialog open={showDeleteAllModal} onOpenChange={setShowDeleteAllModal}>
          <DialogContent className="sm:max-w-[350px] bg-gradient-to-br from-red-50 via-white to-orange-50 border-2 border-red-200 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-700 text-lg font-bold">
                <AlertTriangle className="h-5 w-5" />
                Delete All Messages
              </DialogTitle>
              <DialogDescription className="text-gray-700 text-sm mt-1">
                This will permanently delete all messages in the chat room.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-3">
              <div className="bg-red-100 border border-red-300 rounded-lg p-2">
                <p className="text-xs text-red-800 font-medium">
                  Warning: This will delete all {messages.length} messages.
                </p>
              </div>

              <form onSubmit={handleDeleteAllMessages} className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="deletePassword" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Password
                  </label>
                  <Input
                    id="deletePassword"
                    type="password"
                    value={deleteAllPassword}
                    onChange={(e) => setDeleteAllPassword(e.target.value)}
                    placeholder="Enter password"
                    className="h-8 text-sm border-red-300 focus:border-red-500 focus:ring-red-500 rounded-md"
                    disabled={isDeletingAll}
                    required
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowDeleteAllModal(false);
                      setDeleteAllPassword("");
                    }}
                    className="flex-1 h-8 text-xs border-gray-300 hover:bg-gray-50 rounded-md"
                    disabled={isDeletingAll}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-8 text-xs bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium shadow-lg rounded-md"
                    disabled={isDeletingAll || !deleteAllPassword}
                  >
                    {isDeletingAll ? (
                      <div className="flex items-center gap-1">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        Deleting...
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Trash2 className="h-3 w-3" />
                        Delete All
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete File Modal */}
        <Dialog open={showDeleteFileModal} onOpenChange={setShowDeleteFileModal}>
          <DialogContent className="sm:max-w-[350px] bg-gradient-to-br from-red-50 via-white to-orange-50 border-2 border-red-200 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-700 text-lg font-bold">
                <Trash2 className="h-5 w-5" />
                Delete File
              </DialogTitle>
              <DialogDescription className="text-gray-700 text-sm mt-1">
                Enter your password to permanently delete this file from Chat Store.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-3">
              <div className="bg-red-100 border border-red-300 rounded-lg p-2">
                <p className="text-xs text-red-800 font-medium">
                  Are you sure you want to delete this file? This action cannot be undone.
                </p>
              </div>

              <form onSubmit={handleDeleteFile} className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="deleteFilePassword" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Password
                  </label>
                  <Input
                    id="deleteFilePassword"
                    type="password"
                    value={deleteFilePassword}
                    onChange={(e) => setDeleteFilePassword(e.target.value)}
                    placeholder="Enter password"
                    className="h-8 text-sm border-red-300 focus:border-red-500 focus:ring-red-500 rounded-md"
                    disabled={!deletingFileId} 
                    required
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowDeleteFileModal(false);
                      setDeletingFileId(null);
                      setDeleteFilePassword("");
                    }}
                    className="flex-1 h-8 text-xs border-gray-300 hover:bg-gray-50 rounded-md"
                    disabled={!deletingFileId}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-8 text-xs bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium shadow-lg rounded-md"
                    disabled={!deletingFileId || !deleteFilePassword}
                  >
                    {isDeletingAll ? ( 
                      <div className="flex items-center gap-1">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        Deleting...
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Trash2 className="h-3 w-3" />
                        Delete File
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