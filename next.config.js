/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    },
    // pdfjs-dist (used inside pdf-parse) loads pdf.worker.mjs as a separate
    // file at runtime. Webpack bundling these into the route's single output
    // file leaves that worker file behind, so university-doc OCR fails with
    // "Cannot find module .../pdf.worker.mjs". Marking them external makes
    // Next.js require() them straight from node_modules instead, where the
    // worker file is still sitting next to everything else. Next 14.2's
    // stable name for this is `serverComponentsExternalPackages` — the
    // bare top-level `serverExternalPackages` key only exists from Next 15
    // on and gets silently rejected as an unrecognized option here.
    serverComponentsExternalPackages: ['pdfjs-dist', 'pdf-parse', '@napi-rs/canvas', 'tesseract.js'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost'
      }
    ]
  }
}

module.exports = nextConfig
