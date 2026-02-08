import nextMDX from "@next/mdx";

/** @type {import('rehype-pretty-code').Options} */
const options = {
  // See Options section below.
};

const withMDX = nextMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [],
    rehypePlugins: [["rehype-pretty-code", options], "rehype-slug"],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withMDX(nextConfig);
