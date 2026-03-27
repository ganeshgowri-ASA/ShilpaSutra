import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three"],
  devIndicators: { appIsrStatus: false },
  turbopack: {},
  webpack: (config, { isServer }) => {
    // Exclude canvas binding (Three.js doesn't need it)
    config.externals = [...(config.externals || []), { canvas: "canvas" }];

    // Tree-shake Three.js: only include used examples/jsm modules
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Use production Three.js build
        three: "three",
      };

      // Split large chunks for better caching
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization?.splitChunks,
          cacheGroups: {
            ...(config.optimization?.splitChunks?.cacheGroups ?? {}),
            three: {
              test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
              name: "three-vendor",
              chunks: "all",
              priority: 20,
            },
            radix: {
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              name: "radix-vendor",
              chunks: "all",
              priority: 15,
            },
          },
        },
      };
    }

    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
