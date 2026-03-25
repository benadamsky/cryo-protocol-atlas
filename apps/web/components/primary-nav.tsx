"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { INTERNAL_DEBUG_ENABLED } from "@/lib/runtime-flags";

const PRIMARY_ITEMS = [
  { href: "/", label: "Recommendation" },
  { href: "/wedges", label: "Wedges" },
  { href: "/experiments", label: "Experiments" },
  { href: "/evidence", label: "Evidence" },
  { href: "/discovery", label: "Discovery" },
  { href: "/debug", label: "Debug" }
].filter((item) => INTERNAL_DEBUG_ENABLED || item.href !== "/debug");

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
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
    <div className={`topbar__nav-shell${isOpen ? " is-open" : ""}`}>
      <button
        aria-controls="primary-nav"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        className="topbar__menu-button"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="topbar__menu-button-copy">Menu</span>
        <span aria-hidden="true" className="topbar__menu-icon">
          <span />
          <span />
          <span />
        </span>
      </button>

      <nav className="topbar__nav" id="primary-nav" aria-label="Primary">
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
    </div>
  );
}
