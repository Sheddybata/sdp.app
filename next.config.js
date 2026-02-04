/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // PWA configuration
  // Service worker is registered client-side in sw-register.tsx
  // Static assets are served from public/ directory
  
  // Output configuration for static export (used by Capacitor)
  // Set output: 'export' when building for native apps
  // For web deployment, remove this or set to undefined
  // output: process.env.BUILD_FOR_NATIVE === 'true' ? 'export' : undefined,
  
  // Image optimization (disable for static export if needed)
  images: {
    unoptimized: process.env.BUILD_FOR_NATIVE === 'true',
  },
  
  // TypeScript configuration
  typescript: {
    // Allow function props in client components (they're safe between client components)
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
