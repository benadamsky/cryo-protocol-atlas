"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PRIMARY_ITEMS = [
  { href: "/", label: "Recommendation" },
  { href: "/wedges", label: "Wedges" },
  { href: "/experiments", label: "Experiments" },
  { href: "/evidence", label: "Evidence" },
  { href: "/discovery", label: "Discovery" }
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PrimaryNav() {
  const pathname = usePathname();

  return (
    <nav className="topbar__nav" aria-label="Primary">
      {PRIMARY_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`topbar__nav-link${active ? " is-active" : ""}`}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
