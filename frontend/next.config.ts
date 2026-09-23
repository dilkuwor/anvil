import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Rewrites to the API default to 30s. LLM connection tests (and slow Ollama
  // replies) exceed that in production and surface as a failed Test connection.
  experimental: {
    proxyTimeout: 120_000,
  },
  async headers() {
    return [
      {
        // The worker must never be served from the browser's own cache, or an old copy of it
        // would keep control of the caches after a deploy.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  async rewrites() {
    const target = process.env.API_PROXY_TARGET || "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${target}/api/:path*`,
      },
      {
        source: "/mcp",
        destination: `${target}/mcp`,
      },
      {
        source: "/mcp/:path*",
        destination: `${target}/mcp/:path*`,
      },
      {
        source: "/oauth/token",
        destination: `${target}/oauth/token`,
      },
      {
        source: "/oauth/register",
        destination: `${target}/oauth/register`,
      },
      {
        source: "/oauth/revoke",
        destination: `${target}/oauth/revoke`,
      },
      {
        source: "/.well-known/oauth-authorization-server",
        destination: `${target}/.well-known/oauth-authorization-server`,
      },
      {
        source: "/.well-known/oauth-authorization-server/:path*",
        destination: `${target}/.well-known/oauth-authorization-server/:path*`,
      },
      {
        source: "/.well-known/oauth-protected-resource",
        destination: `${target}/.well-known/oauth-protected-resource`,
      },
      {
        source: "/.well-known/oauth-protected-resource/:path*",
        destination: `${target}/.well-known/oauth-protected-resource/:path*`,
      },
    ];
  },
};

export default nextConfig;
