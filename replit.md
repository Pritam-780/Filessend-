# Overview

AAILAR PROD is a modern file management application that allows users to upload, organize, and preview files across different categories. The application supports multiple file types including PDFs, images, and Excel files, with a focus on academic materials, relaxing content, and session recordings. Users can browse files by category, search through their collection, and preview files directly in the browser.

The project now includes both a React-based version and a standalone HTML version for maximum flexibility:
- React version: Full-featured SPA with modern development tools
- Standalone HTML version: Single-file solution that runs independently in any browser

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is built using React with TypeScript and follows a component-based architecture. The application uses Vite as the build tool and development server, providing fast hot module replacement and optimized builds. The UI is styled with Tailwind CSS and uses the Shadcn/UI component library for consistent design patterns. The frontend implements client-side routing using Wouter for lightweight navigation between pages.

State management is handled through React Query (TanStack Query) for server state management, providing automatic caching, background updates, and optimized data fetching. The application follows a modular structure with separate directories for components, pages, hooks, and utilities.

## Backend Architecture
The backend is implemented as a REST API using Express.js with TypeScript. The server follows a layered architecture with separate modules for routing, storage abstraction, and file handling. The application uses a storage interface pattern that currently implements in-memory storage but can be easily extended to support database persistence.

File uploads are handled using Multer middleware with configurable file size limits and type validation. The server provides endpoints for file upload, retrieval, search, and preview functionality. Static file serving is handled for file downloads and previews.

## Data Storage Solutions
The application uses Drizzle ORM for database operations with PostgreSQL as the target database. The schema defines two main entities: users and files, with proper relationships and constraints. The current implementation includes an in-memory storage adapter for development, but the architecture supports easy migration to persistent database storage.

File metadata is stored in the database while actual files are stored on the filesystem in an uploads directory. The system tracks file information including original names, MIME types, file sizes, categories, and upload timestamps.

## Authentication and Authorization
The application structure includes user management capabilities with username/password authentication patterns defined in the schema. The codebase includes session management setup using connect-pg-simple for PostgreSQL session storage, though the authentication flows are not fully implemented in the current codebase.

## External Dependencies
- **Neon Database**: PostgreSQL database hosting service for production data storage
- **Radix UI**: Provides accessible, unstyled UI primitives for building the component library
- **Shadcn/UI**: Pre-built component library built on top of Radix UI and Tailwind CSS
- **React Query**: Server state management and data fetching library
- **Multer**: Node.js middleware for handling multipart/form-data file uploads
- **Drizzle ORM**: Type-safe database toolkit and query builder
- **Wouter**: Minimalist routing library for React applications
- **Date-fns**: Date utility library for formatting and manipulation
- **Class Variance Authority**: Utility for creating type-safe CSS class variants