/** @type {import('next').NextConfig} */
const nextConfig = {
  // Asegúrate de que NO esté la línea "output: export"
  // Si tienes imágenes de dominios externos (como las de uploadthing), añádelas aquí:
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'utfs.io',
      },
    ],
  },
};

export default nextConfig;