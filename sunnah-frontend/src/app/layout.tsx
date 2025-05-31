import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "مشروع السُنّة",
  description: "منصة رقمية لجمع وترتيب الأحاديث النبوية",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-gray-50">
        <nav className="bg-gray-800 text-white shadow-lg">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <a href="/" className="text-2xl font-bold">
                مشروع السُنّة
              </a>
              <div className="hidden md:flex gap-6">
                <a href="/" className="hover:text-emerald-200">
                  الرئيسية
                </a>
                <a href="/narrators" className="hover:text-emerald-200">
                  الرواة
                </a>
                <a href="/search" className="hover:text-emerald-200">
                  البحث
                </a>
              </div>
            </div>
          </div>
        </nav>

        <main className="min-h-screen">{children}</main>

        <footer className="bg-gray-800 text-white py-8">
          <div className="container mx-auto px-4 text-center">
            <p>مشروع السُنّة © {new Date().getFullYear()}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}