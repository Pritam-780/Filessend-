import { useEffect } from "react";
import { Link } from "wouter";
import { X, Home, GraduationCap, BookOpen, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navigationItems: Array<{
    href: string;
    label: string;
    section: string;
  }>;
  currentLocation: string;
}

const icons = {
  home: Home,
  academic: GraduationCap,
  relaxing: BookOpen,
  sessions: Users,
};

export default function MobileMenu({ 
  isOpen, 
  onClose, 
  navigationItems, 
  currentLocation 
}: MobileMenuProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className={`fixed left-0 top-0 h-full w-80 surface shadow-xl transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-primary">AAILAR PROD</h2>
            <Button 
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2 text-secondary hover:text-primary"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <nav className="space-y-4">
            {navigationItems.map((item) => {
              const IconComponent = icons[item.section as keyof typeof icons];
              return (
                <Link key={item.href} href={item.href}>
                  <div 
                    onClick={onClose}
                    className={`flex items-center py-3 px-4 text-secondary hover:bg-gray-100 rounded-lg transition-colors font-medium cursor-pointer ${
                      currentLocation === item.href ? 'bg-gray-100 text-primary' : ''
                    }`}
                  >
                    <IconComponent className="h-5 w-5 mr-3" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
