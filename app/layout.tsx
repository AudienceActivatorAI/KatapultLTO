import type { Metadata } from "next";
import { CartProvider } from "@/contexts/CartContext";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Visualizer & Lease-to-Own — Brought to you by Katapult",
  description:
    "Visualize tires & wheels on your vehicle, then see Lease-to-Own options brought to you by Katapult.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>
        <CartProvider>
          {children}
          <Toaster position="top-right" />
        </CartProvider>
      </body>
    </html>
  );
}
