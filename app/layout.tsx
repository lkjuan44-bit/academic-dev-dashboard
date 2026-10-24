import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Academic & Dev Dashboard",
  description:
    "Tu espacio personal para organizar cursos, horarios y progreso académico.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
