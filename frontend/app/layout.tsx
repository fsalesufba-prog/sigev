import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';


// Font Inter do Next.js (melhor performance que Google Fonts direto)
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800']
});

// 👇 Viewport separado (correto)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#0066FF',
  colorScheme: 'light',
};

// 👇 Metadata (correto)
export const metadata: Metadata = {
  title: 'SIGEV - Sistema Integrado de Gestão da Escuta de Violência',
  description: 'Sistema para registro e gestão da escuta especializada de crianças e adolescentes',
  keywords: 'escuta especializada, violência infantil, assistência social, rede de proteção',
  authors: [{ name: 'Município de Luzerna' }],
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  );
}