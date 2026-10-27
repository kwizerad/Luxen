"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
        <Button size={size} variant="outline" className="shadow-none">Sign Up</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-zinc-900/95 border-white/15 text-white backdrop-blur-2xl rounded-3xl p-6 shadow-none select-none">
        <DialogTitle className="sr-only">Sign Up</DialogTitle>
        <SignUpForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
