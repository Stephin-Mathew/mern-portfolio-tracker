import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useAuth as useClerkAuth, useUser, useClerk } from '@clerk/clerk-react';
import api, { setAuthTokenProvider } from '../api/axiosInstance';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const { isLoaded: isAuthLoaded, isSignedIn, getToken } = useClerkAuth();
  const { isLoaded: isUserLoaded, user: clerkUser } = useUser();
  const clerk = useClerk();

  const loading = !isAuthLoaded || !isUserLoaded;
  const isAuthenticated = Boolean(isSignedIn);

  // Register dynamic Clerk token provider for all Axios requests
  useEffect(() => {
    setAuthTokenProvider(async () => {
      if (isSignedIn) {
        return await getToken();
      }
      return null;
    });
  }, [isSignedIn, getToken]);

  // Sync user with MongoDB backend when signed in
  useEffect(() => {
    if (isSignedIn && clerkUser) {
      api.get('/auth/me').catch((err) => {
        console.warn('Backend user sync warning:', err.response?.data?.message || err.message);
      });
    }
  }, [isSignedIn, clerkUser]);

  // Format user profile
  const user = useMemo(() => {
    if (!clerkUser) return null;
    return {
      id: clerkUser.id,
      clerkId: clerkUser.id,
      email:
        clerkUser.primaryEmailAddress?.emailAddress ||
        clerkUser.emailAddresses?.[0]?.emailAddress ||
        '',
      fullName: clerkUser.fullName || clerkUser.firstName || 'User',
      firstName: clerkUser.firstName || '',
      lastName: clerkUser.lastName || '',
      imageUrl: clerkUser.imageUrl || '',
    };
  }, [clerkUser]);

  const login = () => clerk.openSignIn();
  const register = () => clerk.openSignUp();
  const logout = () => clerk.signOut();

  const value = {
    user,
    clerkUser,
    loading,
    isAuthenticated,
    getToken,
    login,
    register,
    logout,
    openSignIn: (opts) => clerk.openSignIn(opts),
    openSignUp: (opts) => clerk.openSignUp(opts),
    openUserProfile: (opts) => clerk.openUserProfile(opts),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

