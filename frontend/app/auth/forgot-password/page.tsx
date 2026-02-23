// frontend/app/auth/forgot-password/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './ForgotPasswordStyles.css';

type Step = 'EMAIL' | 'CPF' | 'SENT' | 'RESET' | 'SUCCESS';

export default function ForgotPasswordPage() {
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState<Step>('EMAIL');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [resendDisabled, setResendDisabled] = useState(false);

  // Efeito para contagem regressiva de reenvio
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setResendDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  // Verificar se está em modo reset (com token na URL)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      setCurrentStep('RESET');
    }
  }, []);

  // Formata CPF (000.000.000-00)
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14);
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
    setError(null);
  };

  // Valida CPF
  const isValidCPF = (cpf: string) => {
    const numbers = cpf.replace(/\D/g, '');
    if (numbers.length !== 11) return false;
    
    // Validação básica (não todos zeros iguais)
    if (/^(\d)\1+$/.test(numbers)) return false;
    
    return true;
  };

  // PASSO 1: Solicitar recuperação por email
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Por favor, informe seu e-mail profissional');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      await response.json();

      // Avança para próximo passo
      setCurrentStep('CPF');
      setResendDisabled(true);
      setCountdown(60); // 60 segundos para reenviar
      
    } catch (error: any) {
      setError('Erro ao processar solicitação. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // PASSO 2: Confirmar CPF
  const handleConfirmCPF = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidCPF(cpf)) {
      setError('Por favor, informe um CPF válido');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Aqui você pode validar o CPF com o backend se necessário
      setCurrentStep('SENT');
      
    } catch (error: any) {
      setError('CPF não corresponde ao cadastro. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // PASSO 3: Redefinir senha (quando clica no link do email)
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenFromUrl = urlParams.get('token') || token;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: tokenFromUrl,
          password: newPassword,
          confirmPassword: confirmPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erro ao redefinir senha');
      }

      setCurrentStep('SUCCESS');
      
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStepStatus = (step: Step) => {
    const steps: Step[] = ['EMAIL', 'CPF', 'SENT', 'RESET', 'SUCCESS'];
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(step);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'EMAIL':
        return (
          <form onSubmit={handleRequestReset}>
            <div className="form-group">
              <label className="form-label">E-MAIL PROFISSIONAL</label>
              <div className="input-wrapper">
                <span className="input-icon">📧</span>
                <input
                  type="email"
                  className={`form-input ${error ? 'error' : ''}`}
                  placeholder="seu@email.gov.br"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="forgot-button"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading-spinner"></span>
                  ENVIANDO...
                </>
              ) : (
                'CONTINUAR'
              )}
            </button>

            <Link href="/auth/login" className="back-link">
              <span>←</span> VOLTAR PARA O LOGIN
            </Link>
          </form>
        );

      case 'CPF':
        return (
          <form onSubmit={handleConfirmCPF}>
            <div className="info-box">
              <span className="info-icon">📧</span>
              <div className="info-content">
                <p className="info-title">CÓDIGO ENVIADO PARA:</p>
                <p className="info-email">{email}</p>
                <p className="info-text">Para sua segurança, confirme seu CPF:</p>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">CPF</label>
              <div className="input-wrapper">
                <span className="input-icon">🆔</span>
                <input
                  type="text"
                  className={`form-input ${error ? 'error' : ''}`}
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={handleCPFChange}
                  maxLength={14}
                  disabled={isLoading}
                  required
                />
                <span className="cpf-mask">•••.•••.•••-••</span>
              </div>
            </div>

            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="forgot-button"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading-spinner"></span>
                  VERIFICANDO...
                </>
              ) : (
                'CONFIRMAR CPF'
              )}
            </button>

            <button 
              type="button"
              className="secondary-button"
              onClick={() => setCurrentStep('EMAIL')}
              disabled={resendDisabled}
            >
              {resendDisabled ? `REENVIAR EM ${countdown}s` : 'REENVIAR CÓDIGO'}
            </button>
          </form>
        );

      case 'SENT':
        return (
          <div className="success-message">
            <span className="success-icon">✉️</span>
            <h3 className="success-title">E-MAIL ENVIADO!</h3>
            <p className="success-text">
              Enviamos as instruções para redefinir sua senha para:
            </p>
            <p className="success-email">{email}</p>
            
            <div className="info-box warning">
              <span className="info-icon">📌</span>
              <div className="info-content">
                <p>Verifique sua caixa de entrada e spam</p>
                <p>O link é válido por 30 minutos</p>
                <p>Link de uso único</p>
              </div>
            </div>

            <button 
              type="button"
              className="secondary-button"
              onClick={() => {
                setResendDisabled(true);
                setCountdown(60);
                handleRequestReset(new Event('submit') as any);
              }}
              disabled={resendDisabled}
            >
              {resendDisabled ? `REENVIAR EM ${countdown}s` : 'REENVIAR E-MAIL'}
            </button>

            <Link href="/auth/login" className="back-link">
              <span>←</span> VOLTAR PARA O LOGIN
            </Link>
          </div>
        );

      case 'RESET':
        return (
          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label className="form-label">NOVA SENHA</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${error ? 'error' : ''}`}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError(null);
                  }}
                  disabled={isLoading}
                  required
                  minLength={6}
                />
                <span 
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </span>
              </div>
              <div className="attempts-counter">
                <span>Mínimo 6 caracteres</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">CONFIRMAR NOVA SENHA</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`form-input ${error ? 'error' : ''}`}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError(null);
                  }}
                  disabled={isLoading}
                  required
                  minLength={6}
                />
                <span 
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </span>
              </div>
            </div>

            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="forgot-button"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading-spinner"></span>
                  REDEFININDO...
                </>
              ) : (
                'REDEFINIR SENHA'
              )}
            </button>
          </form>
        );

      case 'SUCCESS':
        return (
          <div className="success-message">
            <span className="success-icon">✅</span>
            <h3 className="success-title">SENHA REDEFINIDA!</h3>
            <p className="success-text">
              Sua senha foi alterada com sucesso.
              Agora você pode fazer login com sua nova senha.
            </p>

            <button 
              type="button"
              className="forgot-button"
              onClick={() => router.push('/auth/login')}
            >
              IR PARA O LOGIN
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="forgot-password-container">
      {/* Background Orbs */}
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-orb orb-3"></div>
      <div className="bg-grid"></div>

      {/* Forgot Password Card */}
      <div className="forgot-card">
        <div className="forgot-header">
          <div className="logo">SIGEV</div>
          <h1 className="welcome-text">Recuperar senha</h1>
          <p className="subtitle">
            {currentStep === 'EMAIL' && "Digite seu e-mail para receber instruções"}
            {currentStep === 'CPF' && "Confirme seu CPF para segurança"}
            {currentStep === 'SENT' && "Verifique seu e-mail"}
            {currentStep === 'RESET' && "Crie uma nova senha"}
            {currentStep === 'SUCCESS' && "Senha alterada com sucesso!"}
          </p>
        </div>

        {/* Steps Indicator */}
        <div className="steps-container">
          <div className={`step ${getStepStatus('EMAIL')}`}>
            <div className="step-icon">
              {getStepStatus('EMAIL') === 'completed' ? '✓' : '1'}
            </div>
            <span className="step-label">E-MAIL</span>
          </div>
          <div className={`step-line ${getStepStatus('EMAIL') === 'completed' ? 'active' : ''}`}></div>
          
          <div className={`step ${getStepStatus('CPF')}`}>
            <div className="step-icon">
              {getStepStatus('CPF') === 'completed' ? '✓' : '2'}
            </div>
            <span className="step-label">CPF</span>
          </div>
          <div className={`step-line ${getStepStatus('CPF') === 'completed' ? 'active' : ''}`}></div>
          
          <div className={`step ${getStepStatus('RESET')}`}>
            <div className="step-icon">
              {getStepStatus('RESET') === 'completed' ? '✓' : '3'}
            </div>
            <span className="step-label">REDEFINIR</span>
          </div>
        </div>

        {renderStep()}

        <div className="divider">
          <span>SEGURANÇA</span>
        </div>

        <div className="security-note">
          <span className="security-icon">🔒</span>
          <span>Suas informações estão protegidas com criptografia de ponta a ponta</span>
        </div>
      </div>
    </div>
  );
}