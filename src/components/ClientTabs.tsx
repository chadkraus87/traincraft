"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["", "Overview"],
  ["/intake", "Intake & consent"],
  ["/progress", "Progress"],
  ["/nutrition", "Nutrition"],
  ["/billing", "Billing"],
] as const;

export default function ClientTabs({ clientId }: { clientId: string }) {
  const pathname = usePathname();
  const base = `/clients/${clientId}`;
  return (
    <nav aria-label="Client sections" className="flex gap-1 flex-wrap border-b border-steel/20 mb-6">
      {TABS.map(([suffix, label]) => {
        const href = base + suffix;
        const active = suffix === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`px-3 py-2 text-sm -mb-px border-b-2 ${
              active ? "border-coral text-coral" : "border-transparent text-steel hover:text-coral"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
