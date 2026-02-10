import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevTrack",
  description: "Organiza tu aprendizaje técnico",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}