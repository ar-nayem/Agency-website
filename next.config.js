/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfjs-dist (used inside pdf-parse) loads pdf.worker.mjs as a separate
  // file at runtime. Webpack bundling these into the route's single output
  // file leaves that worker file behind, so university-doc OCR fails with
  // "Cannot find module .../pdf.worker.mjs". Marking them external makes
  // Next.js require() them straight from node_modules instead, where the
  // worker file is still sitting next to everything else.
  serverExternalPackages: ['pdfjs-dist', 'pdf-parse', '@napi-rs/canvas', 'tesseract.js'],
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    }
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
