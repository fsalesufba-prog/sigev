// frontend/app/page.tsx
import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'SIGEV - Sistema de Gestão da Escuta Especializada',
    description: 'Protegendo crianças e adolescentes com tecnologia de ponta',
};

export default function HomePage() {
    const features = [
        {
            icon: '🔒',
            title: 'Segurança e LGPD',
            description: 'Controle de acesso por perfil de usuário, criptografia de dados e registro de atividades. Sistema adequado às diretrizes da LGPD para proteção de informações sensíveis.'
        },
        {
            icon: '🌐',
            title: 'Rede Integrada',
            description: 'Compartilhamento seguro de informações entre Conselho Tutelar, Ministério Público, Judiciário e demais órgãos da rede, com histórico completo de encaminhamentos.'
        },
        {
            icon: '📂',
            title: 'Gestão de Casos',
            description: 'Cadastro completo de ocorrências, anexos de documentos, acompanhamento de medidas aplicadas e controle de prazos em um único ambiente.'
        },
        {
            icon: '📊',
            title: 'Relatórios e Indicadores',
            description: 'Geração de relatórios detalhados e exportação em PDF ou Excel. Acompanhe volume de atendimentos, tipos de ocorrência e tempo médio de resposta.'
        },
        {
            icon: '📱',
            title: 'Acesso Multiplataforma',
            description: 'Sistema responsivo que funciona em computador, tablet e celular, permitindo consultas rápidas mesmo em atendimentos externos.'
        },
        {
            icon: '⚙️',
            title: 'Automação de Fluxos',
            description: 'Encaminhamentos padronizados, notificações automáticas de prazo e organização de tarefas para agilizar o trabalho da equipe.'
        }
    ];


    const stats = [
        { number: '100%', label: 'Controle de Acesso por Perfil' },
        { number: 'LGPD', label: 'Conformidade com a Lei 13.709/18' },
        { number: 'Online', label: 'Acesso Multiplataforma' },
        { number: 'Suporte', label: 'Atendimento em Horário Comercial' }
    ];


    return (
        <>

            {/* Background Glow Orbs */}
            <div className="bg-glow">
                <div className="glow-orb" style={{
                    top: '10%',
                    left: '5%',
                    width: '400px',
                    height: '400px',
                    background: 'radial-gradient(circle, rgba(0,102,255,0.2) 0%, transparent 70%)',
                    animationDelay: '0s'
                }} />
                <div className="glow-orb" style={{
                    top: '40%',
                    right: '10%',
                    width: '600px',
                    height: '600px',
                    background: 'radial-gradient(circle, rgba(138,43,226,0.15) 0%, transparent 70%)',
                    animationDelay: '2s'
                }} />
                <div className="glow-orb" style={{
                    bottom: '20%',
                    left: '20%',
                    width: '500px',
                    height: '500px',
                    background: 'radial-gradient(circle, rgba(0,212,255,0.15) 0%, transparent 70%)',
                    animationDelay: '4s'
                }} />
            </div>

            {/* Hero Section */}
            <section className="section" style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                background: 'radial-gradient(circle at 30% 30%, rgba(0,102,255,0.1) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(138,43,226,0.1) 0%, transparent 50%), #030614'
            }}>
                <div className="container">
                    <div style={{
                        maxWidth: '900px',
                        margin: '0 auto',
                        textAlign: 'center',
                        animation: 'float 4s ease-out'
                    }}>
                        <h1 className="section-title gradient-text-primary" style={{
                            fontSize: 'clamp(48px, 8vw, 80px)',
                            marginBottom: '30px'
                        }}>
                            Protegendo o Futuro
                            <span style={{
                                display: 'block',
                                fontSize: 'clamp(32px, 5vw, 48px)',
                                marginTop: '20px'
                            }}>
                                com Tecnologia
                            </span>
                        </h1>

                        <p className="section-subtitle" style={{
                            fontSize: 'clamp(18px, 2.5vw, 24px)',
                            color: 'rgba(255, 255, 255, 0.9)',
                            marginBottom: '50px',
                            textShadow: '0 0 20px rgba(0,212,255,0.3)'
                        }}>
                            Sistema integrado para proteção integral de crianças e adolescentes vítimas de violência, com gestão segura de casos e articulação da rede de atendimento.
                        </p>

                        <div className="flex-center">
                            <Link href="/auth/login" className="btn-primary-3d">
                                Acessar Plataforma →
                            </Link>
                                <a
                                    href="https://wa.me/5571982607352?text=Oi%2C%20quero%20falar%20sobre%20o%20SIGEV"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-outline-neon"
                                >
                                    Fale conosco
                                </a>
                        </div>

                        {/* Stats */}
                        <div className="flex-stats">
                            {stats.map((stat, index) => (
                                <div key={index} className="stat-card" style={{ minWidth: '150px' }}>
                                    <div className="stat-number">{stat.number}</div>
                                    <div className="stat-label">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="section" style={{
                background: 'linear-gradient(180deg, #030614 0%, #0a0c1a 100%)',
                position: 'relative'
            }}>
                <div className="bg-grid" style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    opacity: 0.1
                }} />

                <div className="container">
                    <h2 className="section-title gradient-text-secondary">
                        Inovação que Protege
                    </h2>
                    <p className="section-subtitle">
                        Tecnologias exclusivas desenvolvidas para atender aos mais rigorosos padrões
                        da Lei 13.431/2017 com performance e segurança incomparáveis.
                    </p>

                    <div className="grid-auto-fit">
                        {features.map((feature, index) => (
                            <div key={index} className="glass-card-premium">
                                <div className="feature-icon" style={{
                                    color: index % 2 === 0 ? '#00D4FF' : '#8A2BE2'
                                }}>
                                    {feature.icon}
                                </div>
                                <h3 className="feature-title">{feature.title}</h3>
                                <p className="feature-description">{feature.description}</p>

                                {/* Decorative Line */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: '30px',
                                    left: '30px',
                                    right: '30px',
                                    height: '2px',
                                    background: 'linear-gradient(90deg, transparent, #00D4FF, #8A2BE2, transparent)',
                                    opacity: 0.3
                                }} />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="section" style={{
                background: 'radial-gradient(circle at 50% 50%, rgba(0,102,255,0.2) 0%, transparent 60%), #030614',
                textAlign: 'center'
            }}>
                <div className="container">
                    <div style={{
                        maxWidth: '800px',
                        margin: '0 auto'
                    }}>
                        <h2 className="section-title gradient-text-primary" style={{ fontSize: '48px' }}>
                            Transforme a Proteção Infantil
                        </h2>
                        <p className="section-subtitle" style={{ marginBottom: '50px' }}>
                            Junte-se à revolução na gestão da escuta especializada.
                        </p>

                        <div className="flex-center">
                            <Link href="/auth/login" className="btn-primary-3d">
                                Começar Agora →
                            </Link>
                            <Link href="https://wa.me/5571982607352?text=Oi%2C%20quero%20falar%20sobre%20o%20SIGEV" className="btn-outline-neon">
                                Falar com Consultor
                            </Link>
                        </div>

                        {/* Trust Badges */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '40px',
                            marginTop: '60px',
                            opacity: 0.7
                        }}>
                            <span style={{ color: '#00D4FF', fontWeight: '600' }}>✓ Conformidade LGPD</span>
                            <span style={{ color: '#8A2BE2', fontWeight: '600' }}>✓ Certificado Digital</span>
                            <span style={{ color: '#00D4FF', fontWeight: '600' }}>✓ ISO 27001</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer-premium">
                <div className="container">
                    <div className="footer-content">
                        <div className="footer-logo">
                            SIGEV
                        </div>

                        <div>
                            <a href="#" className="footer-link">Sobre</a>
                            <a href="#" className="footer-link">Segurança</a>
                            <a href="#" className="footer-link">Contato</a>
                            <a href="#" className="footer-link">Blog</a>
                        </div>

                        <div className="footer-copyright">
                            © 2026 SIGEV. S&Q Tecnologia da Informação. Todos os direitos reservados.
                        </div>
                    </div>
                    
                </div>
            </footer>
        </>
    );
}