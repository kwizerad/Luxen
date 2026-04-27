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
import { SignUpForm } from "@/components/sign-up-form";

interface SignUpModalProps {
  size?: "sm" | "default" | "lg";
}

export function SignUpModal({ size = "sm" }: SignUpModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size} variant="outline">Sign Up</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign Up</DialogTitle>
          <DialogDescription>
            Create a new account to get started
          </DialogDescription>
        </DialogHeader>
        <SignUpForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
