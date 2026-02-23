// frontend/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['sigev.sqtecnologiadainformacao.com', 'localhost'],
  },
  experimental: {
    optimizeCss: false, // Desabilita otimização de CSS se houver problemas
  },
}

module.exports = nextConfig