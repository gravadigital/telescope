import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthContextType, AuthProviderProps } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import { UserService } from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ver si esto va en un config o algo asi
const TELESCOPIO_USER_KEY = 'telescopio_user';
const TELESCOPIO_TOKEN_KEY = 'telescopio_token';

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const {setItem, getItem, removeItem} = useLocalStorage();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authModalCallback, setAuthModalCallback] = useState<((mode: 'login' | 'register') => void) | null>(null);

  useEffect(() => {
    // Check if there's a saved user and token in localStorage
    const savedUser = getItem(TELESCOPIO_USER_KEY) as string;
    // Read token directly from localStorage (not through useLocalStorage hook)
    const savedToken = localStorage.getItem(TELESCOPIO_TOKEN_KEY);

    console.log('🔍 AuthContext: Checking saved session', {
      hasSavedUser: !!savedUser,
      hasSavedToken: !!savedToken
    });

    if (savedUser && savedToken) {
      try {
        const parsedUser = JSON.parse(savedUser) satisfies User;
        console.log('✅ Restored session for:', parsedUser.email);
        setUser(parsedUser);
        setToken(savedToken);

        // Sync user's joined events with backend
        syncUserEvents(parsedUser.id);
      } catch (error) {
        console.error('❌ Error parsing saved user:', error);
        removeItem(TELESCOPIO_USER_KEY);
        localStorage.removeItem(TELESCOPIO_TOKEN_KEY);
      }
    } else {
      console.log('ℹ️ No saved session found. User must login.');
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Function to sync user events from backend
  const syncUserEvents = async (userId: string): Promise<void> => {
    try {
      console.log('🔄 Syncing user events from backend...');
      const eventIds = await UserService.getUserEvents(userId);
      
      if (eventIds.length > 0) {
        setUser(prevUser => {
          if (!prevUser) return null;
          
          const updatedUser = { ...prevUser, joinedEventIDs: eventIds };
          setItem(TELESCOPIO_USER_KEY, JSON.stringify(updatedUser));
          console.log('✅ User events synced:', eventIds.length, 'events');
          return updatedUser;
        });
      }
    } catch (error) {
      console.error('❌ Failed to sync user events:', error);
    }
  };

  // Listen for auth:logout events (e.g., when API clears the session due to 401)
  useEffect(() => {
    const handleAuthLogout = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('🔄 Session cleared by API - logging out user', customEvent.detail);
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth:logout', handleAuthLogout);
    console.log('✅ AuthContext: Registered auth:logout listener');
    return () => {
      window.removeEventListener('auth:logout', handleAuthLogout);
      console.log('🗑️ AuthContext: Unregistered auth:logout listener');
    };
  }, []);

  const login = (userData: User, authToken: string): void => {
    setUser(userData);
    setToken(authToken);
    setItem(TELESCOPIO_USER_KEY, JSON.stringify(userData));
    // Save token directly to localStorage without JSON.stringify (since it's already a string)
    localStorage.setItem(TELESCOPIO_TOKEN_KEY, authToken);
    
    // Sync user events after login
    syncUserEvents(userData.id);
  };

  const logout = (): void => {
    setUser(null);
    setToken(null);
    removeItem(TELESCOPIO_USER_KEY);
    // Remove token directly from localStorage
    localStorage.removeItem(TELESCOPIO_TOKEN_KEY);
    // Redirect to home page after logout
    window.location.href = '/';
  };

  const updateUser = (updatedData: Partial<User>): void => {
    if (!user) return;
    
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    setItem(TELESCOPIO_USER_KEY, JSON.stringify(updatedUser));
  };

  const joinEvent = (eventId: string): void => {
    if (!user) return;

    const updatedJoinedEvents = [...user.joinedEventIDs];
    if (!updatedJoinedEvents.includes(eventId)) {
      updatedJoinedEvents.push(eventId);
    }

    const updatedUser = { ...user, joinedEventIDs: updatedJoinedEvents };
    setUser(updatedUser);
    setItem(TELESCOPIO_USER_KEY, JSON.stringify(updatedUser));
  };

  const openAuthModal = useCallback((mode: 'login' | 'register'): void => {
    if (authModalCallback) {
      authModalCallback(mode);
    }
  }, [authModalCallback]);

  // Function to register the modal callback from App component
  const registerAuthModalHandler = useCallback((handler: (mode: 'login' | 'register') => void): void => {
    setAuthModalCallback(() => handler);
  }, []);

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    updateUser,
    joinEvent,
    isAuthenticated: !!user,
    loading,
    openAuthModal
  };

  return (
    <AuthContext.Provider value={{ ...value, registerAuthModalHandler }}>
      {children}
    </AuthContext.Provider>
  );
};
