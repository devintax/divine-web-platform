import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "@temporalio/client",
    "@temporalio/worker",
    "@temporalio/workflow",
    "@temporalio/activity",
    "stripe",
    "resend",
  ],
  async headers() {
    const securityHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cal.dfgworld.net",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com data:",
          "img-src 'self' data: blob: https://cal.dfgworld.net http://localhost:7130 http://172.16.16.59:7130 https://insforge.dfgworld.net",
          "connect-src 'self' http://localhost:* https://api-vendel.dfgworld.net https://api-textbee.dfgworld.net https://api.resend.com https://api.stripe.com https://cal.dfgworld.net",
          "frame-src 'self' https://cal.dfgworld.net",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "object-src 'none'",
        ].join("; "),
      },
    ];

    const headers = [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];

    if (process.env.NODE_ENV !== "production") {
      headers[0].headers.push(
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "Pragma", value: "no-cache" },
      );
    }

    return headers;
  },
};

export default nextConfig;
