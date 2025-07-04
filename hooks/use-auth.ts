// ============= hooks/use-auth.ts =============
import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './use-toast';
import type { 
  LoginCredentials, 
  SignupData, 
  AuthUser, 
  PasswordResetRequest,
  PasswordResetData 
} from '@/types/auth';

export function useAuth() {
  const { data: session, status, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const user = session?.user as AuthUser | undefined;
  const isAuthenticated = !!session && status === 'authenticated';

  // Login with credentials
  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    
    try {
      const result = await signIn('credentials', {
        email: credentials.email,
        password: credentials.password,
        redirect: false
      });

      if (result?.error) {
        switch (result.error) {
          case 'CredentialsSignin':
            toast.error('Invalid email or password');
            break;
          case 'AccessDenied':
            toast.error('Account is locked or inactive');
            break;
          default:
            toast.error('Login failed. Please try again.');
        }
        return { success: false, error: result.error };
      }

      toast.success('Welcome back!');
      router.push('/dashboard');
      return { success: true };
    } catch (error) {
      toast.serverError();
      return { success: false, error: 'Network error' };
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);

  // Login with Google
  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const result = await signIn('google', {
        redirect: false,
        callbackUrl: '/dashboard'
      });

      if (result?.error) {
        toast.error('Google login failed. Please try again.');
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      toast.serverError();
      return { success: false, error: 'Network error' };
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Sign up
  const signup = useCallback(async (data: SignupData) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.message || 'Signup failed');
        return { success: false, error: result.message };
      }

      toast.success('Account created successfully! Please check your email to verify your account.');
      router.push('/auth/signin');
      return { success: true };
    } catch (error) {
      toast.serverError();
      return { success: false, error: 'Network error' };
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);

  // Logout
  const logout = useCallback(async () => {
    setIsLoading(true);
    
    try {
      await signOut({ redirect: false });
      toast.success('Logged out successfully');
      router.push('/');
    } catch (error) {
      toast.error('Logout failed');
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);

  // Request password reset
  const requestPasswordReset = useCallback(async (data: PasswordResetRequest) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.message || 'Failed to send reset email');
        return { success: false, error: result.message };
      }

      toast.success('Password reset email sent! Check your inbox.');
      return { success: true };
    } catch (error) {
      toast.serverError();
      return { success: false, error: 'Network error' };
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Reset password
  const resetPassword = useCallback(async (data: PasswordResetData) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.message || 'Failed to reset password');
        return { success: false, error: result.message };
      }

      toast.success('Password reset successfully! Please login with your new password.');
      router.push('/auth/signin');
      return { success: true };
    } catch (error) {
      toast.serverError();
      return { success: false, error: 'Network error' };
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);

  // Update profile
  const updateProfile = useCallback(async (profileData: Partial<AuthUser>) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.message || 'Failed to update profile');
        return { success: false, error: result.message };
      }

      // Update session with new data
      await update({
        ...session,
        user: { ...session?.user, ...result.user }
      });

      toast.updateSuccess('Profile updated successfully');
      return { success: true, data: result.user };
    } catch (error) {
      toast.serverError();
      return { success: false, error: 'Network error' };
    } finally {
      setIsLoading(false);
    }
  }, [session, update, toast]);

  // Change password
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.message || 'Failed to change password');
        return { success: false, error: result.message };
      }

      toast.success('Password changed successfully');
      return { success: true };
    } catch (error) {
      toast.serverError();
      return { success: false, error: 'Network error' };
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Check permissions
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    
    // Admin has all permissions
    if (user.role === 'admin') return true;
    
    // Check team permissions
    if (user.team?.role === 'owner') return true;
    
    return false;
  }, [user]);

  // Check plan access
  const hasFeature = useCallback((feature: string): boolean => {
    if (!user) return false;
    
    const planFeatures = {
      free: ['basic_links'],
      premium: ['basic_links', 'analytics', 'custom_domains', 'qr_codes'],
      enterprise: ['basic_links', 'analytics', 'custom_domains', 'qr_codes', 'teams', 'api_access']
    };
    
    return planFeatures[user.plan]?.includes(feature) || false;
  }, [user]);

  return {
    // State
    user,
    isAuthenticated,
    isLoading: isLoading,
    status,
    
    // Actions
    login,
    loginWithGoogle,
    signup,
    logout,
    requestPasswordReset,
    resetPassword,
    updateProfile,
    changePassword,
    
    // Utilities
    hasPermission,
    hasFeature,
    refreshSession: update
  };
}