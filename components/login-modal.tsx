"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
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
        <Button size={size}>Sign In</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign In</DialogTitle>
          <DialogDescription>
            Enter your email below to login to your account
          </DialogDescription>
        </DialogHeader>
        <LoginForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
