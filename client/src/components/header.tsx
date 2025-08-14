import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileMenu from "@/components/mobile-menu";
import UploadModal from "@/components/upload-modal";

export default function Header() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const navigationItems = [
    { href: "/", label: "Home", section: "home" },
    { href: "/category/academic", label: "Academic Books", section: "academic" },
    { href: "/category/relaxing", label: "Relaxing Books", section: "relaxing" },
    { href: "/category/sessions", label: "Best Sessions", section: "sessions" },
  ];

  return (
    <>
      <header className="surface shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Hamburger Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 text-secondary hover:bg-gray-100 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            {/* Logo/Brand */}
            <div className="flex-1 flex justify-center md:justify-start">
              <Link href="/">
                <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight cursor-pointer">
                  AAILAR PROD
                </h1>
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8 items-center">
              {navigationItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <span className={`text-secondary hover:text-primary transition-colors font-medium cursor-pointer ${
                    location === item.href ? 'text-primary font-semibold' : ''
                  }`}>
                    {item.label}
                  </span>
                </Link>
              ))}
              <Button 
                onClick={() => setIsUploadModalOpen(true)}
                className="bg-primary text-white hover:bg-blue-800 font-medium"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </nav>
            
            {/* Mobile Upload Button */}
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              className="md:hidden bg-primary text-white p-2 hover:bg-blue-800"
              size="sm"
            >
              <Upload className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <MobileMenu 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        navigationItems={navigationItems}
        currentLocation={location}
      />

      <UploadModal 
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </>
  );
}
