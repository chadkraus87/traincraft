import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { supabaseServer } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

export const metadata: Metadata = {
  title: "TrainCraft",
  description: "Client management and safe AI workout programming for personal trainers",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;800&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="bg-pine text-paper">
          <div className="mx-auto max-w-5xl px-5 py-4 flex items-center justify-between">
            <Link href="/" className="display text-xl font-extrabold">
              Train<span className="text-moss">Craft</span>
            </Link>
            <nav className="flex gap-6 text-sm items-center">
              {user ? (
                <>
                  <Link href="/clients" className="hover:text-moss">Clients</Link>
                  <Link href="/exercises" className="hover:text-moss">Exercise library</Link>
                  <Link href="/plans/new" className="hover:text-moss">New plan</Link>
                  <SignOutButton />
                </>
              ) : (
                <Link href="/login" className="hover:text-moss">Sign in</Link>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
      </body>
    </html>
  );
}
