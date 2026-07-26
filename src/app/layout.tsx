import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { supabaseServer } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import { Dumbbell } from "lucide-react";

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
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="pattern-dots text-ink relative z-10">
          <div className="mx-auto max-w-5xl px-5 py-4 flex items-center justify-between">
            <Link href="/" className="display text-xl font-extrabold flex items-center gap-2">
              <Dumbbell className="text-coral" size={20} aria-hidden="true" />
              Train<span className="text-terracotta">Craft</span>
            </Link>
            <nav className="flex gap-6 text-sm items-center">
              {user ? (
                <>
                  <Link href="/clients" className="hover:text-terracotta">Clients</Link>
                  <Link href="/exercises" className="hover:text-terracotta">Exercise library</Link>
                  <Link href="/plans/new" className="hover:text-terracotta">New plan</Link>
                  <Link href="/workouts/new" className="hover:text-terracotta">New workout</Link>
                  <SignOutButton />
                </>
              ) : (
                <Link href="/login" className="hover:text-terracotta">Sign in</Link>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-5 py-8 relative z-10">{children}</main>
      </body>
    </html>
  );
}
