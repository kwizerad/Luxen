"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { NotificationsDropdown } from "./notifications-dropdown";
import { FloatingUserSettings } from "./floating-user-settings";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Menu, X } from "lucide-react";

export function FloatingHeader() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  // Check if we're in exam mode (hide floating header during exam)
  const isExamPage = pathname === "/dashboard/exam";
  const [isExamActive, setIsExamActive] = useState(false);
  
  useEffect(() => {
    // Check if exam is active by looking for fullscreen state and exam page
    const checkExamActive = () => {
      if (typeof window !== 'undefined') {
        return isExamPage && !!document.fullscreenElement;
      }
      return false;
    };
    
    const updateExamState = () => {
      const examActive = checkExamActive();
      setIsExamActive(examActive);
      
      if (examActive) {
        setLoading(false);
        return;
      }
    };
    
    updateExamState();
    
    // Listen for fullscreen changes if on exam page
    if (isExamPage) {
      document.addEventListener('fullscreenchange', updateExamState);
      document.addEventListener('webkitfullscreenchange', updateExamState);
      document.addEventListener('mozfullscreenchange', updateExamState);
      document.addEventListener('MSFullscreenChange', updateExamState);
      
      return () => {
        document.removeEventListener('fullscreenchange', updateExamState);
        document.removeEventListener('webkitfullscreenchange', updateExamState);
        document.removeEventListener('mozfullscreenchange', updateExamState);
        document.removeEventListener('MSFullscreenChange', updateExamState);
      };
    }
  }, [isExamPage]);

  useEffect(() => {
    // Don't load user if exam is active
    if (isExamActive) {
      setLoading(false);
      return;
    }

    const loadUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    loadUser();
  }, [isExamActive]);

  // Don't render on exam page if exam is active
  if (isExamActive) {
    return null;
  }

  // Don't render if no user
  if (!user && !loading) {
    return null;
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          {/* Notifications */}
          <div className="bg-background/95 backdrop-blur-sm border rounded-full shadow-lg">
            <NotificationsDropdown />
          </div>
          
          {/* User Settings */}
          <div className="bg-background/95 backdrop-blur-sm border rounded-full shadow-lg">
            <FloatingUserSettings user={user} onMobile />
          </div>
        </div>
      </div>

      {/* Desktop Header - Top Right */}
      <div className="hidden md:flex fixed top-4 right-4 z-50 items-center gap-3">
        {/* Notifications */}
        <div className="bg-background/95 backdrop-blur-sm border rounded-full shadow-lg">
          <NotificationsDropdown />
        </div>
        
        {/* User Settings / Profile Picture */}
        <div className="bg-background/95 backdrop-blur-sm border rounded-full shadow-lg">
          <FloatingUserSettings user={user} />
        </div>
      </div>
    </>
  );
}
