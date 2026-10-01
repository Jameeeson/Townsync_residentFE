import type { NextConfig } from "next";


const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  reactCompiler: true,
  serverExternalPackages: ["tesseract.js", "sharp"],
  // Vercel only ships files its tracer sees being require()d. sharp's native libvips-cpp.so and
  // tesseract's wasm/worker files are loaded by the OS / by path at runtime, so the tracer misses them
  // and the function fails with "libvips-cpp.so: cannot open shared object file". Include them explicitly.
  outputFileTracingIncludes: {
    "/api/ocr": [
      "./node_modules/@img/sharp-libvips-linux-x64/**/*",
      "./node_modules/@img/sharp-linux-x64/**/*",
      "./node_modules/tesseract.js/**/*",
      "./node_modules/tesseract.js-core/**/*",
    ],
  },
};

export default nextConfig;
