"use client";
// Plain links (not next/link) so pages never prefetch in the background;
// the verify page's security policy forbids all network connections.
import { usePathname } from "next/navigation";

const PAGES = [
  ["/", "Overview"],
  ["/plan", "Analysis plan"],
  ["/validation", "Validation"],
  ["/verify", "Verify a bundle"],
  ["/audit", "Audit instructions"],
  ["/demo", "Demo"],
] as const;

export function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Site">
      {PAGES.map(([href, label]) => (
        <a key={href} href={href} aria-current={path === href ? "page" : undefined}>{label}</a>
      ))}
    </nav>
  );
}
