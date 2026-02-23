"use client"

import * as React from 'react'
import Link from 'next/link'
import {
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Mail,
  Phone,
  MapPin,
  Download,
  FileText,
  Shield,
  CreditCard
} from 'lucide-react'
import { Button } from '../ui/button'

export function Footer() {
  const currentYear = new Date().getFullYear()

  const links = {
    produto: [
      { label: 'Recursos', href: '#recursos' },
      { label: 'Planos', href: '#planos' },
      { label: 'Demonstração', href: '/demo' },
      { label: 'Preços', href: '#planos' },
      { label: 'API', href: '/api' },
    ],
    empresa: [
      { label: 'Sobre Nós', href: '/sobre' },
      { label: 'Blog', href: '/blog' },
      { label: 'Carreiras', href: '/carreiras' },
      { label: 'Contato', href: '/contato' },
      { label: 'Parceiros', href: '/parceiros' },
    ],
    suporte: [
      { label: 'Central de Ajuda', href: '/ajuda' },
      { label: 'Documentação', href: '/docs' },
      { label: 'Tutoriais', href: '/tutoriais' },
      { label: 'Status do Sistema', href: '/status' },
      { label: 'Chatbot', href: '/chatbot' },
    ],
    legal: [
      { label: 'Termos de Uso', href: '/termos' },
      { label: 'Política de Privacidade', href: '/privacidade' },
      { label: 'Cookies', href: '/cookies' },
      { label: 'LGPD', href: '/lgpd' },
      { label: 'Contrato', href: '/contrato' },
    ],
  }

  const contactInfo = [
    { icon: Mail, text: 'contato@sqtecnologiadainformacao.com', href: 'mailto:contato@sqtecnologiadainformacao.com' },
    { icon: Phone, text: '+55 (71) 98260-7352', href: 'tel:+5571982607352' },
    { icon: MapPin, text: 'Salvador, BA - Brasil', href: 'https://maps.google.com' },
  ]

  const socialMedia = [
    { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
    { icon: Linkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
  ]

  const certifications = [
    { icon: Shield, text: 'Dados Criptografados' },
    { icon: CreditCard, text: 'Pagamento Seguro' },
    { icon: FileText, text: 'LGPD Compliant' },
  ]

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <footer className="bg-gradient-to-b from-gray-900 to-gray-950 text-gray-300">
      {/* Main Footer */}
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
        <div style={{display:"flex", flexDirection:"row", gap:"2rem", flexWrap:"wrap"}}>

          {/* Logo e Descrição */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="relative">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-iho-blue to-iho-cyan flex items-center justify-center">
                  <span className="text-white font-bold text-xl">IHO</span>
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-iho-blue to-iho-cyan rounded-xl blur opacity-30"></div>
              </div>

            </div>

            <p className="text-gray-400 mb-6 max-w-md">
              Revolucionando a gestão de equipamentos na construção civil com tecnologia de ponta e inteligência artificial.
            </p>




          </div>
          {/* Informações de Contato */}
          <div className="space-y-3 mb-8">
            {contactInfo.map((info, index) => (
              <a
                key={index}
                href={info.href}
                className="flex items-center space-x-3 text-gray-400 hover:text-iho-cyan transition-colors"
              >
                <info.icon className="h-4 w-4" />
                <span>{info.text}</span>
              </a>
            ))}
          </div>
          {/* Links */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Produto</h4>
            <ul className="space-y-2">
              {links.produto.map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-iho-cyan transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {/* Certificações */}
          <div className="space-y-2">
            {certifications.map((cert, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm text-gray-400">
                <cert.icon className="h-4 w-4 text-green-400" />
                <span>{cert.text}</span>
              </div>
            ))}
          </div>

        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 my-8 md:my-12"></div>

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <p className="text-gray-400 text-sm">
              © {currentYear} IHO - S&Q Tecnologia da Informação. Todos os direitos reservados.
            </p>
            <p className="text-gray-500 text-xs mt-1">
              CNPJ: 64.684.955/0001-98 • IHO é uma marca registrada.
            </p>
          </div>

          {/* Social Media */}
          <div className="flex items-center space-x-4">
            {socialMedia.map((social, index) => (
              <a
                key={index}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 w-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-iho-blue hover:text-white transition-all"
                aria-label={social.label}
              >
                <social.icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mt-8 pt-8 border-t border-gray-800 flex items-center justify-center">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h5 className="text-sm font-semibold text-gray-300 mb-2">Formas de Pagamento</h5>
              <div className="flex items-center space-x-2">
                <div className="h-8 w-20 bg-gray-800 rounded flex items-center justify-center">
                  <span className="text-xs font-bold">DÉBITO</span>
                </div>
                <div className="h-8 w-20 bg-gray-800 rounded flex items-center justify-center">
                  <span className="text-xs font-bold">CRÉDITO</span>
                </div>
                <div className="h-8 w-20 bg-gray-800 rounded flex items-center justify-center">
                  <span className="text-xs font-bold">PIX</span>
                </div>
              </div>
            </div>


          </div>
        </div>

        {/* Back to Top */}
        <div className="mt-8 text-center">
          <button
            onClick={scrollToTop}
            className="text-gray-400 hover:text-iho-cyan transition-colors text-sm"
          >
            Voltar ao topo ↑
          </button>
        </div>
      </div>
    </footer>
  )
}