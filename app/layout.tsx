import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "EventBiz — Vendor Operations",
  description: "Find events, auto-fill applications, track your pipeline",
};

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
    >
      {children}
    </Link>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <nav className="bg-gray-900 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-2">
                <Link href="/" className="text-xl font-bold text-white tracking-tight">
                  EventBiz
                </Link>
                <span className="text-xs bg-amber-500 text-black px-1.5 py-0.5 rounded font-semibold">
                  v0.2
                </span>
              </div>
              <div className="flex items-center gap-1">
                <NavLink href="/">Dashboard</NavLink>
                <NavLink href="/events">Events</NavLink>
                <NavLink href="/settings">Settings</NavLink>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
