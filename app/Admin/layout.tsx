"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Users, Settings, UserPlus, LogOut, LayoutDashboard, 
  ChevronLeft, ChevronRight, Menu, X 
} from "lucide-react";

const ADMIN_EMAIL = "Navo@admin.jn";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      // Allow access if user is primary admin OR has Admin role
      const isPrimaryAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      const hasAdminRole = user?.user_metadata?.role === "Admin";
      
      if (!user || (!isPrimaryAdmin && !hasAdminRole)) {
        console.log("Access denied:", { email: user?.email, role: user?.user_metadata?.role });
        router.push("/");
        return;
      }
      
      setUser(user);
      setLoading(false);
    };
    
    checkAdmin();
  }, [router]);

  useEffect(() => {
    // Close mobile menu on route change
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const isPrimaryAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const navItems = [
    { href: "/Admin", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/Admin/students", icon: Users, label: "Students" },
    { href: "/Admin/settings", icon: Settings, label: "Settings" },
    ...(isPrimaryAdmin ? [{ href: "/Admin/register", icon: UserPlus, label: "Register Admin" }] : []),
  ];

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-border flex items-center justify-between min-h-[73px]">
        {/* Title - always visible on mobile, conditionally on desktop */}
        <div className={`${sidebarOpen || mobileMenuOpen ? "block" : "hidden lg:hidden"} flex-1 min-w-0`}>
          <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-sm text-muted-foreground mt-1 truncate max-w-[180px]">{user?.email}</p>
        </div>
        {/* Desktop collapse/expand button - only visible when sidebar is open on desktop */}
        {!mobileMenuOpen && (
          <Button
            variant="ghost"
            size="icon"
            className={`hidden lg:flex flex-shrink-0 ${!sidebarOpen ? "mx-auto" : ""}`}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </Button>
        )}
        {/* Mobile close button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden flex-shrink-0"
          onClick={() => setMobileMenuOpen(false)}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-secondary"
              } ${!sidebarOpen && !mobileMenuOpen ? "lg:justify-center" : ""}`}
              title={!sidebarOpen && !mobileMenuOpen ? item.label : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className={sidebarOpen || mobileMenuOpen ? "block" : "hidden lg:hidden"}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-border">
        <Button 
          variant="outline" 
          className={`w-full justify-start gap-3 border-border text-foreground hover:bg-secondary hover:text-foreground ${!sidebarOpen && !mobileMenuOpen ? "lg:justify-center lg:px-2" : ""}`}
          onClick={handleLogout}
          title={!sidebarOpen && !mobileMenuOpen ? "Logout" : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span className={sidebarOpen || mobileMenuOpen ? "block" : "hidden lg:hidden"}>
            Logout
          </span>
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <h1 className="text-lg font-bold text-foreground">Admin Panel</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(true)}
          className="text-foreground"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </header>

      <div className="flex h-[calc(100vh-56px)] lg:h-screen">
        {/* Desktop Sidebar */}
        <aside 
          className={`hidden lg:flex bg-card border-r border-border flex-col transition-all duration-300 ${
            sidebarOpen ? "w-64" : "w-20"
          }`}
        >
          <SidebarContent />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border flex-col z-50 lg:hidden flex">
              <SidebarContent />
            </aside>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-8 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
