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
  
  // Webpack configuration to handle chunk loading errors
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Handle chunk loading errors on client side
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
      };
    }
    return config;
  },
  
  // Generate stable build IDs to prevent chunk mismatches
  generateBuildId: async () => {
    // Use Vercel's git commit SHA if available, otherwise let Next.js generate one
    // This ensures consistent chunk names across deployments
    if (process.env.VERCEL_GIT_COMMIT_SHA) {
      return process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 12); // Use first 12 chars
    }
    // Let Next.js generate a build ID automatically for local builds
    return null;
  },
};

module.exports = nextConfig;
