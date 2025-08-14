import { type User, type InsertUser, type File, type InsertFile } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // File operations
  createFile(file: InsertFile): Promise<File>;
  getFile(id: string): Promise<File | undefined>;
  getFiles(): Promise<File[]>;
  getFilesByCategory(category: string): Promise<File[]>;
  deleteFile(id: string): Promise<boolean>;
  searchFiles(query: string, category?: string, mimeType?: string): Promise<File[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private files: Map<string, File>;

  constructor() {
    this.users = new Map();
    this.files = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = randomUUID();
    const file: File = { 
      ...insertFile, 
      id,
      uploadedAt: new Date()
    };
    this.files.set(id, file);
    return file;
  }

  async getFile(id: string): Promise<File | undefined> {
    return this.files.get(id);
  }

  async getFiles(): Promise<File[]> {
    return Array.from(this.files.values()).sort(
      (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()
    );
  }

  async getFilesByCategory(category: string): Promise<File[]> {
    return Array.from(this.files.values())
      .filter(file => file.category === category)
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  async deleteFile(id: string): Promise<boolean> {
    return this.files.delete(id);
  }

  async searchFiles(query: string, category?: string, mimeType?: string): Promise<File[]> {
    const queryLower = query.toLowerCase();
    
    return Array.from(this.files.values())
      .filter(file => {
        const matchesQuery = file.originalName.toLowerCase().includes(queryLower);
        const matchesCategory = !category || file.category === category;
        const matchesMimeType = !mimeType || file.mimeType.includes(mimeType);
        
        return matchesQuery && matchesCategory && matchesMimeType;
      })
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }
}

export const storage = new MemStorage();
