import type { Metadata } from "next";
import { iranYekan, modam } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "حسابا",
  description: "نرم‌افزار حسابداری هوشمند",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className={`${iranYekan.variable} ${modam.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
