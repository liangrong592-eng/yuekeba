import type { Metadata } from "next"; import "./globals.css";
export const metadata: Metadata = { title: "Fitness Booking", description: "Book your workout" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body className="min-h-screen bg-white antialiased">{children}</body></html>;
}
