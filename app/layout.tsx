import type { Metadata } from "next";
import "./globals.css";
import FloatingContact from "@/components/FloatingContact";

export const metadata: Metadata = {
  title: "Khiem Nguyen Dang",
  description: "Personal portfolio — cinematic journey.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <FloatingContact />
      </body>
    </html>
  );
}
