"use client";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function SignOutButton() {
  const signOut = async () => {
    await supabaseBrowser().auth.signOut();
    window.location.href = "/login";
  };
  return <button onClick={signOut} className="hover:text-moss">Sign out</button>;
}
