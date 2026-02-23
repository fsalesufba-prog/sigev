// hooks/useAuth.ts
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  cpf: string;
  phone?: string;
  role: 'ADMIN' | 'MANAGER' | 'PROFESSIONAL';
  isAdmin: boolean;
  units: Array<{
    id: string;
    name: string;
    position: string;
    registration: string;
  }>;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
    isAuthenticated: false
  });

  const router = useRouter();
  const isMounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMounted.current = true;
    verifyAuth();

    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const verifyAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');

      if (!token) {
        if (isMounted.current) {
          setState({
            user: null,
            isLoading: false,
            error: null,
            isAuthenticated: false
          });
        }
        return;
      }

      // Cancela requisição anterior se existir
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        signal: abortControllerRef.current.signal
      });

      if (!isMounted.current) return;

      if (response.ok) {
        const data = await response.json();
        setState({
          user: data.user,
          isLoading: false,
          error: null,
          isAuthenticated: true
        });
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setState({
          user: null,
          isLoading: false,
          error: null,
          isAuthenticated: false
        });
      }
    } catch (error: any) {
      if (!isMounted.current) return;
      
      if (error.name === 'AbortError') {
        return; // Requisição cancelada intencionalmente
      }

      console.error('Auth error:', error);
      setState({
        user: null,
        isLoading: false,
        error: 'Erro de conexão',
        isAuthenticated: false
      });
    }
  };

  const login = async (email: string, password: string, rememberMe: boolean) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, rememberMe }),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao fazer login');
      }

      localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      setState({
        user: data.user,
        isLoading: false,
        error: null,
        isAuthenticated: true
      });

      return data;
    } catch (error: any) {
      setState({
        user: null,
        isLoading: false,
        error: error.message,
        isAuthenticated: false
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setState({
        user: null,
        isLoading: false,
        error: null,
        isAuthenticated: false
      });
      router.push('/auth/login');
    }
  };

  return {
    ...state,
    login,
    logout
  };
}