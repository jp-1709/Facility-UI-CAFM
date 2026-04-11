import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  loading: boolean;
  error: string | null;
}

interface LoginCredentials {
  email: string;
  password: string;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const userStr = localStorage.getItem('user');
    const user = userStr && userStr !== 'undefined' ? JSON.parse(userStr) : null;

    return {
      isAuthenticated,
      user,
      loading: false,
      error: null,
    };
  });

  const navigate = useNavigate();

  const login = useCallback(async (credentials: LoginCredentials) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`/api/method/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          usr: credentials.email,
          pwd: credentials.password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.message === 'Logged In') {
        // Use the login response data directly
        const userInfo = {
          email: credentials.email,
          full_name: data.full_name || credentials.email,
          home_page: data.home_page || '/app'
        };

        setAuthState({
          isAuthenticated: true,
          user: userInfo,
          loading: false,
          error: null,
        });
        
        // Store session in localStorage
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('user', JSON.stringify(userInfo));
        
        // Call checkAuth to ensure AuthContext is updated
        checkAuth();
        
        // Use setTimeout to ensure state is updated before navigation
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 100);
        
        return { success: true };
      } else {
        // Login failed
        const errorMessage = data.message || 'Login failed';
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
        return { success: false, error: errorMessage };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during login';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      await fetch(`/api/method/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null,
      });
      
      // Clear session from localStorage
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
      
      navigate('/login');
    }
  }, [navigate]);

  const checkAuth = useCallback(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const userStr = localStorage.getItem('user');
    const user = userStr && userStr !== 'undefined' ? JSON.parse(userStr) : null;

    console.log('checkAuth - isAuthenticated:', isAuthenticated, 'user:', user);

    // Only update state if it's different from current state
    setAuthState(prev => {
      if (prev.isAuthenticated !== isAuthenticated || 
          JSON.stringify(prev.user) !== JSON.stringify(user)) {
        console.log('checkAuth - updating auth state');
        return {
          isAuthenticated,
          user,
          loading: false,
          error: null,
        };
      }
      console.log('checkAuth - state unchanged, skipping update');
      return prev;
    });

    return isAuthenticated;
  }, []);

  return {
    ...authState,
    login,
    logout,
    checkAuth,
  };
};
