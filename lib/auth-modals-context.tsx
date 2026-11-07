"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface AuthModalsContextType {
  isLoginOpen: boolean;
  isSignUpOpen: boolean;
  isRecoverOpen: boolean;
  openLogin: () => void;
  openSignUp: () => void;
  openRecover: () => void;
  closeLogin: () => void;
  closeSignUp: () => void;
  closeRecover: () => void;
  switchToLogin: () => void;
  switchToSignUp: () => void;
  switchToRecover: () => void;
}

const AuthModalsContext = createContext<AuthModalsContextType | undefined>(undefined);

export function AuthModalsProvider({ children }: { children: ReactNode }) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [isRecoverOpen, setIsRecoverOpen] = useState(false);

  const openLogin = () => {
    setIsSignUpOpen(false);
    setIsRecoverOpen(false);
    setIsLoginOpen(true);
  };

  const openSignUp = () => {
    setIsLoginOpen(false);
    setIsRecoverOpen(false);
    setIsSignUpOpen(true);
  };

  const openRecover = () => {
    setIsLoginOpen(false);
    setIsSignUpOpen(false);
    setIsRecoverOpen(true);
  };

  const closeLogin = () => setIsLoginOpen(false);
  const closeSignUp = () => setIsSignUpOpen(false);
  const closeRecover = () => setIsRecoverOpen(false);

  const switchToLogin = () => {
    setIsSignUpOpen(false);
    setIsRecoverOpen(false);
    setIsLoginOpen(true);
  };

  const switchToSignUp = () => {
    setIsLoginOpen(false);
    setIsRecoverOpen(false);
    setIsSignUpOpen(true);
  };

  const switchToRecover = () => {
    setIsLoginOpen(false);
    setIsSignUpOpen(false);
    setIsRecoverOpen(true);
  };

  return (
    <AuthModalsContext.Provider
      value={{
        isLoginOpen,
        isSignUpOpen,
        isRecoverOpen,
        openLogin,
        openSignUp,
        openRecover,
        closeLogin,
        closeSignUp,
        closeRecover,
        switchToLogin,
        switchToSignUp,
        switchToRecover,
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
