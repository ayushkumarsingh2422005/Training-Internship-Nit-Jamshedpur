"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { navLinks } from "@/lib/content";

export function SiteNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const drawer = (
    <>
      <div
        className={`nav-drawer-backdrop${menuOpen ? " open" : ""}`}
        aria-hidden={!menuOpen}
        onClick={closeMenu}
      />
      <aside
        id="nav-drawer"
        className={`nav-drawer${menuOpen ? " open" : ""}`}
        aria-hidden={!menuOpen}
        aria-label="Mobile navigation"
      >
        <div className="nav-drawer-header">
          <p className="nav-drawer-title">Menu</p>
          <button type="button" className="nav-drawer-close" aria-label="Close menu" onClick={closeMenu}>
            ×
          </button>
        </div>
        <ul className="nav-list-drawer">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={active ? "nav-drawer-link active" : "nav-drawer-link"}
                  onClick={closeMenu}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>
    </>
  );

  return (
    <nav className="site-nav" aria-label="Main navigation">
      <div className="container nav-inner">
        <div className="nav-emblem-spacer" aria-hidden="true" />

        <ul className="nav-list nav-list-desktop">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <li key={link.href}>
                <Link href={link.href} className={active ? "nav-link active" : "nav-link"}>
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          className="nav-toggle"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="nav-drawer"
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span className={`hamburger${menuOpen ? " open" : ""}`} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>

      {mounted ? createPortal(drawer, document.body) : null}
    </nav>
  );
}
