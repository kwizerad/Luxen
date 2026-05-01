"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface AuthModalsContextType {
  isLoginOpen: boolean;
  isSignUpOpen: boolean;
  openLogin: () => void;
  openSignUp: () => void;
  closeLogin: () => void;
  closeSignUp: () => void;
  switchToLogin: () => void;
  switchToSignUp: () => void;
}

const AuthModalsContext = createContext<AuthModalsContextType | undefined>(undefined);

export function AuthModalsProvider({ children }: { children: ReactNode }) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);

  const openLogin = () => {
    setIsSignUpOpen(false);
    setIsLoginOpen(true);
  };

  const openSignUp = () => {
    setIsLoginOpen(false);
    setIsSignUpOpen(true);
  };

  const closeLogin = () => setIsLoginOpen(false);
  const closeSignUp = () => setIsSignUpOpen(false);

  const switchToLogin = () => {
    setIsSignUpOpen(false);
    setIsLoginOpen(true);
  };

  const switchToSignUp = () => {
    setIsLoginOpen(false);
    setIsSignUpOpen(true);
  };

  return (
    <AuthModalsContext.Provider
      value={{
        isLoginOpen,
        isSignUpOpen,
        openLogin,
        openSignUp,
        closeLogin,
        closeSignUp,
        switchToLogin,
        switchToSignUp,
      }}
    >
      {children}
    </AuthModalsContext.Provider>
  );
}

export function useAuthModals() {
  const context = useContext(AuthModalsContext);
  if (context === undefined) {
    throw new Error("useAuthModals must be used within an AuthModalsProvider");
  }
  return context;
}
