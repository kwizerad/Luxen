"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoginForm } from "@/components/login-form";

interface LoginModalProps {
  size?: "sm" | "default" | "lg";
}

export function LoginModal({ size = "sm" }: LoginModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size} className="shadow-none">Sign In</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-zinc-900/95 border-white/15 text-white backdrop-blur-2xl rounded-3xl p-6 shadow-none select-none">
        <DialogTitle className="sr-only">Sign In</DialogTitle>
        <LoginForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
