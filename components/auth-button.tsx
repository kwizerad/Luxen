"use client";

import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "./logout-button";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoginModal } from "./login-modal";
import { SignUpModal } from "./sign-up-modal";

export function AuthButton() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error("Error checking user:", error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  if (loading) {
    return <div className="w-20 h-8" />;
  }

  return user ? (
    <div className="flex items-center gap-4">
      <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
        Dashboard
      </Button>
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <LoginModal />
      <SignUpModal />
    </div>
  );
}
