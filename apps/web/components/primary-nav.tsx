"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { INTERNAL_DEBUG_ENABLED } from "@/lib/runtime-flags";

const PRIMARY_ITEMS = [
  { href: "/", label: "Recommendation", prefixes: ["/domains"] },
  { href: "/wedges", label: "Wedges", prefixes: [] },
  { href: "/experiments", label: "Experiments", prefixes: [] },
  { href: "/evidence", label: "Evidence", prefixes: [] },
  { href: "/discovery", label: "Discovery", prefixes: [] },
  { href: "/debug", label: "Debug", prefixes: ["/compare", "/history", "/optimizer"] }
].filter((item) => INTERNAL_DEBUG_ENABLED || item.href !== "/debug");

function isActive(pathname: string, item: (typeof PRIMARY_ITEMS)[number]) {
  if (pathname === item.href) {
    return true;
  }

  if (item.href !== "/" && pathname.startsWith(`${item.href}/`)) {
    return true;
  }

  return item.prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function PrimaryNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <header className={`nav${isOpen ? " is-open" : ""}`}>
      <Link className="nav__brand" href="/">
        Cryo Protocol Atlas
      </Link>
      <button
        aria-controls="primary-nav"
        aria-expanded={isOpen}
        className="nav__toggle"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        {isOpen ? "Close" : "Menu"}
      </button>
      <nav className="nav__links" id="primary-nav" aria-label="Primary">
        {PRIMARY_ITEMS.map((item) => {
          const active = isActive(pathname, item);

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={active ? "is-active" : undefined}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
