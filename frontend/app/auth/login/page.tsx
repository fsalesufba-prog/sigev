'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './LoginStyles.css';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeLeft, setLockTimeLeft] = useState(0);
  const [loginAttempts, setLoginAttempts] = useState(0);

  // Efeito para contagem regressiva quando bloqueado
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isLocked && lockTimeLeft > 0) {
      timer = setInterval(() => {
        setLockTimeLeft(prev => {
          if (prev <= 1) {
            setIsLocked(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isLocked, lockTimeLeft]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setLocalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) {
      setLocalError(`Usuário bloqueado. Aguarde ${lockTimeLeft} segundos.`);
      return;
    }

    setIsLoading(true);
    setLocalError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      const data = await response.json();

      // Se o backend retornar 423 (Locked), significa que o usuário está bloqueado
      if (response.status === 423) {
        // Tenta extrair o tempo de bloqueio da mensagem
        const minutesMatch = data.message?.match(/(\d+)/);
        if (minutesMatch) {
          setLockTimeLeft(parseInt(minutesMatch[0]) * 60);
        } else {
          setLockTimeLeft(1800); // 30 minutos padrão
        }
        setIsLocked(true);
        setLocalError(data.message || 'Usuário bloqueado');
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        // Se não foi sucesso, incrementa contador local apenas para feedback visual
        setLoginAttempts(prev => prev + 1);
        throw new Error(data.message || 'Erro ao fazer login');
      }

      // Sucesso no login
      setLoginAttempts(0);
      setLocalError(null);

      // Salva tokens
      localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      // Redireciona baseado no role
      if (data.user.role === 'ADMIN' || data.user.isAdmin) {
        router.push('/portal/admin/dashboard');
      } else if (data.user.role === 'MANAGER') {
        router.push('/portal/dashboard/manager');
      } else {
        router.push('/portal/dashboard');
      }

    } catch (error: any) {
      setLocalError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatLockTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="login-container">
      {/* Background Orbs */}
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-orb orb-3"></div>
      <div className="bg-grid"></div>

      {/* Login Card */}
      <div className="login-card">
        <div className="login-header">
          <div className="logo">SIGEV</div>
          <h1 className="welcome-text">Bem-vindo de volta</h1>
          <p className="subtitle">
            Acesse a plataforma da rede de proteção
          </p>
        </div>

        {/* Error Message */}
        {localError && !isLocked && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {localError}
          </div>
        )}

        {/* Locked Message */}
        {isLocked && (
          <div className="locked-message">
            <span className="error-icon">🔒</span>
            Usuário bloqueado. Tempo restante: {formatLockTime(lockTimeLeft)}
          </div>
        )}

        {/* Tentativas restantes (feedback visual apenas) */}
        {loginAttempts > 0 && loginAttempts < 5 && !isLocked && (
          <div className="attempts-counter" style={{ 
            textAlign: 'center', 
            marginBottom: '16px',
            color: loginAttempts >= 3 ? '#FFA500' : 'rgba(255,255,255,0.5)'
          }}>
            Tentativas restantes: {5 - loginAttempts}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">E-mail Profissional</label>
            <div className="input-wrapper">
              <input
                type="email"
                name="email"
                className={`form-input ${localError ? 'error' : ''}`}
                placeholder="seu@email.gov.br"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={isLocked}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className={`form-input ${localError ? 'error' : ''}`}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                required
                disabled={isLocked}
              />
              <span 
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </span>
            </div>
          </div>

          <div className="form-options">
            <label className="remember-me">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleInputChange}
              />
              <span className="checkbox-custom"></span>
              <span>Lembrar acesso (7 dias)</span>
            </label>
            <Link href="/auth/forgot-password" className="forgot-password">
              Esqueceu a senha?
            </Link>
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading || isLocked}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Autenticando...
              </>
            ) : (
              'Acessar Sistema'
            )}
          </button>
        </form>

        <div className="login-footer">
          <Link href="/" className="back-link">
            <span>←</span> Voltar para página inicial
          </Link>
        </div>
      </div>
    </div>
  );
}