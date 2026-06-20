/** @type {import('next').NextConfig} */

// HTTP security headers applied to every route.
// CSP is intentionally broad (unsafe-eval + unsafe-inline) because Three.js /
// WebGL shader compilation requires them; tighten per-route once the CAD
// kernel is stable enough to enumerate trusted sources precisely.
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Three.js shaders require eval; tighten once WASM CAD kernel is stable
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      // WebGL textures and WASM blobs come from self + blob:
      "img-src 'self' data: blob:",
      "font-src 'self'",
      // Connects to Anthropic, OpenRouter, and Railway DB proxy
      "connect-src 'self' https://api.anthropic.com https://openrouter.ai",
      // WebGL worker threads
      "worker-src 'self' blob:",
    ].join("; "),
  },
];

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three"],
  devIndicators: { appIsrStatus: false },
  turbopack: {},
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: "canvas" }];
    return config;
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
