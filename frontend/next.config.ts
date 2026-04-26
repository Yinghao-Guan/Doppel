import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // Generate sourcemaps for production JS so Lighthouse and error-tracking
  // tools (e.g. Sentry, when wired up) can resolve minified stacks. The maps
  // are emitted next to the JS chunks; revisit serving strategy when we wire
  // an error tracker that uploads them server-side.
  productionBrowserSourceMaps: true,
};

export default nextConfig;
