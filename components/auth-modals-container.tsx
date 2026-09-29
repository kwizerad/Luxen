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
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="sr-only">Sign In</DialogTitle>
          <LoginForm onSuccess={closeLogin} onSwitchToSignUp={switchToSignUp} />
        </DialogContent>
      </Dialog>

      {/* Sign Up Modal */}
      <Dialog open={isSignUpOpen} onOpenChange={closeSignUp}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="sr-only">Sign Up</DialogTitle>
          <SignUpForm onSuccess={closeSignUp} onSwitchToLogin={switchToLogin} />
        </DialogContent>
      </Dialog>
    </>
  );
}
