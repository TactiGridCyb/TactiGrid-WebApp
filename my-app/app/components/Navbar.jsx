"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import styles from "../styles/componentsDesign/Navbar.module.css";
import LoginDialog from "../components/LoginDialog";

export default function Navbar() {
  const [showDialog, setShowDialog] = useState(false);
  const [user, setUser] = useState(null);

  const pathname = usePathname();
  const searchParams = useSearchParams();

  const listRef = useRef(null);
  const bubbleRef = useRef(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d?.user ?? null))
      .catch(() => {});
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  const links = [
    { href: "/", label: "Home" },
    { href: "/old-missions", label: "View old Missions" },
    { href: "/create-mission", label: "Create new Mission" },
    { href: "/config", label: "Configuration" },
    { href: "/dashboard", label: "Statistics" },
  ];

  const moveBubbleTo = (el) => {
    if (!el || !listRef.current || !bubbleRef.current) return;
    const listRect = listRef.current.getBoundingClientRect();
    const r = el.getBoundingClientRect();

    const left = r.left - listRect.left - 6;
    const top = r.top - listRect.top - 4;
    const width = r.width + 12;
    const height = r.height + 8;

    const bubble = bubbleRef.current;
    bubble.style.setProperty("--b-left", `${left}px`);
    bubble.style.setProperty("--b-top", `${top}px`);
    bubble.style.setProperty("--b-width", `${width}px`);
    bubble.style.setProperty("--b-height", `${height}px`);
    bubble.classList.add(styles.visible);
  };

  const hideBubble = () => {
    if (bubbleRef.current) bubbleRef.current.classList.remove(styles.visible);
  };

  useEffect(() => {
    const active = listRef.current?.querySelector(`[data-active="true"]`);
    if (active) moveBubbleTo(active);
  }, [pathname, searchParams]);

  return (
    <nav className={styles.navbar} role="navigation" aria-label="Main">
      <div className={styles.inner}>
        <ul className={styles.navList} ref={listRef} onMouseLeave={hideBubble}>
          <span className={styles.bubble} ref={bubbleRef} aria-hidden="true" />

          {links.map((l) => {
            const effectiveHref = user
              ? l.href
              : l.href === "/"
              ? "/"
              : `/unconnected?next=${encodeURIComponent(l.href)}`;

            const nextParam = searchParams?.get("next");
            const isActiveWhenLoggedOut =
              (pathname === "/unconnected" && nextParam === l.href) ||
              (pathname === "/" && l.href === "/");

            const isActive = user ? pathname === l.href : isActiveWhenLoggedOut;

            return (
              <li key={l.href} className={styles.navItem}>
                <Link
                  href={effectiveHref}
                  className={`${styles.link} ${isActive ? styles.linkActive : ""}`}
                  data-active={isActive ? "true" : "false"}
                  aria-current={isActive ? "page" : undefined}
                  onMouseEnter={(e) => moveBubbleTo(e.currentTarget)}
                  onFocus={(e) => moveBubbleTo(e.currentTarget)}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {user ? (
          <div className={styles.sessionArea}>
            <span className={styles.greeting}>Hello&nbsp;{user.email}</span>
            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={logout}>
              Logout
            </button>
          </div>
        ) : (
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => setShowDialog(true)}
          >
            Log&nbsp;In
          </button>
        )}
      </div>

      {showDialog && (
        <LoginDialog onClose={() => setShowDialog(false)} onSuccess={(u) => setUser(u)} />
      )}
    </nav>
  );
}
