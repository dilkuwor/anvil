import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Rewrites to the API default to 30s. LLM connection tests (and slow Ollama
  // replies) exceed that in production and surface as a failed Test connection.
  experimental: {
    proxyTimeout: 120_000,
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
    ];
  },
};

export default nextConfig;
