import path from "node:path";

/** @type {import("next").NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true
  },
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  webpack: (config) => {
    // packages/ use NodeNext-style "./x.js" imports that resolve to .ts sources.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"]
    };
    return config;
  }
};

export default nextConfig;
