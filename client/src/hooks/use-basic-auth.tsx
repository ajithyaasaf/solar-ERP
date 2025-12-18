import { useState } from "react";
import { 
  loginWithEmail, 
  registerWithEmail, 
  loginWithGoogle, 
  logoutUser,
  auth
} from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { updateProfile } from "firebase/auth";

/**
 * A simplified auth hook for login/register pages
 * Does not depend on auth context to avoid circular dependencies
 */
export function useBasicAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await loginWithEmail(email, password);
      toast({
        title: "Login Successful",
        description: "Welcome back!",
        variant: "default",
      });
      return true;
    } catch (error: any) {
      let message = "Failed to login. Please try again.";
      
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        message = "Invalid email or password.";
      } else if (error.code === "auth/too-many-requests") {
        message = "Too many failed login attempts. Please try again later.";
      } else if (error.code === "auth/network-request-failed") {
        message = "Network error. Please check your connection.";
      }
      
      toast({
        title: "Login Failed",
        description: message,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    setIsLoading(true);
    try {
      // Use the unified backend registration endpoint
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          displayName
        }),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }
      
      toast({
        title: "Registration Successful",
        description: "Your account has been created. Please sign in.",
        variant: "success",
      });
      return true;
    } catch (error: any) {
      let message = "Failed to create account. Please try again.";
      
      if (error.message.includes("email-already-in-use") || error.message.includes("already exists")) {
        message = "Email already in use. Please try another email.";
      } else if (error.message.includes("invalid-email")) {
        message = "Invalid email address.";
      } else if (error.message.includes("weak-password")) {
        message = "Password is too weak. Please use a stronger password.";
      } else if (error.message) {
        message = error.message;
      }
      
      toast({
        title: "Registration Failed",
        description: message,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogleProvider = async () => {
    setIsLoading(true);
    try {
      const result = await loginWithGoogle();
      
      // If this is a new user, create a basic profile in the backend
      if (result.additionalUserInfo?.isNewUser) {
        fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName || result.user.email?.split('@')[0] || "User",
            role: "employee", // Default role for new users
            department: null
          }),
          credentials: 'include'
        }).catch(error => {
          console.error("Failed to create user profile:", error);
        });
      }
      
      toast({
        title: "Login Successful",
        description: "Welcome!",
        variant: "success",
      });
      return true;
    } catch (error: any) {
      let message = "Failed to login with Google. Please try again.";
      
      if (error.code === "auth/popup-closed-by-user") {
        message = "Google login popup was closed. Please try again.";
      }
      
      toast({
        title: "Login Failed",
        description: message,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await logoutUser();
      toast({
        title: "Logout Successful",
        description: "You have been logged out.",
        variant: "success",
      });
      return true;
    } catch (error) {
      toast({
        title: "Logout Failed",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    login,
    register,
    loginWithGoogle: loginWithGoogleProvider,
    logout,
  };
}