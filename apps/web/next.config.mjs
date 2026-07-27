import { createMDX } from "fumadocs-mdx/next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** @type {import("next").NextConfig} */
const config = {
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  transpilePackages: ["vorb-ui"],
};

const withMDX = createMDX();

export default withMDX(config);
