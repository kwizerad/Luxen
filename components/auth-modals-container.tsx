"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { LoginForm } from "@/components/login-form";
import { SignUpForm } from "@/components/sign-up-form";
import { useAuthModals } from "@/lib/auth-modals-context";

export function AuthModalsContainer() {
  const { isLoginOpen, isSignUpOpen, closeLogin, closeSignUp, switchToLogin, switchToSignUp } = useAuthModals();

  return (
    <>
      {/* Login Modal */}
      <Dialog open={isLoginOpen} onOpenChange={closeLogin}>
        <DialogContent className="sm:max-w-md bg-card/95 dark:bg-zinc-900/95 border-border/80 dark:border-white/15 text-card-foreground dark:text-white backdrop-blur-2xl rounded-3xl p-6 shadow-none select-none">
          <DialogTitle className="sr-only">Sign In</DialogTitle>
          <LoginForm onSuccess={closeLogin} onSwitchToSignUp={switchToSignUp} />
        </DialogContent>
      </Dialog>

      {/* Sign Up Modal */}
      <Dialog open={isSignUpOpen} onOpenChange={closeSignUp}>
        <DialogContent className="sm:max-w-md bg-card/95 dark:bg-zinc-900/95 border-border/80 dark:border-white/15 text-card-foreground dark:text-white backdrop-blur-2xl rounded-3xl p-6 shadow-none select-none">
          <DialogTitle className="sr-only">Sign Up</DialogTitle>
          <SignUpForm onSuccess={closeSignUp} onSwitchToLogin={switchToLogin} />
        </DialogContent>
      </Dialog>
    </>
  );
}
