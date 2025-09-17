'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from './components/Navbar.jsx';
import styles from './styles/pagesDesign/Home.module.css';

/* —— tiny helper: reveal-on-scroll (no libs) —— */
function useRevealOnScroll() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add(styles.revealIn);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.16 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* —— tiny clock hook: returns { time, date } —— */
function useClock() {
  const [now, setNow] = useState(null);

  useEffect(() => {
    let intervalId;
    const update = () => setNow(new Date());

    // update immediately
    update();

    // align first repeat to EXACT next minute, then every minute
    const msToNextMinute = 60000 - (Date.now() % 60000);
    const timeoutId = setTimeout(() => {
      update();
      intervalId = setInterval(update, 60000);
    }, msToNextMinute);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // Formatters (use browser locale)
  const time =
    now
      ? new Intl.DateTimeFormat(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false, // <- set to true for 12-hour with AM/PM
        }).format(now)
      : '--:--';

  const weekday =
    now
      ? new Intl.DateTimeFormat(undefined, { weekday: 'short' })
          .format(now)
          .toUpperCase()
      : '---';

  const day = now ? now.getDate() : '--';
  const date = `${weekday} • ${day}`;

  return { time, date };
}

/* —— inline, transparent Apple-Watch-style SVG —— */
function WatchHeroSVG(props) {
  const C = 260;
  const { time, date } = useClock();

  return (
    <svg
      viewBox="0 0 520 520"
      aria-hidden="true"
      className={styles.watch}
      {...props}
    >
      {/* ===== STRAPS (behind) ===== */}
      <g opacity="0.9">
        <rect x="210" y="0" width="100" height="120" rx="22" fill="url(#aw-strap)" />
        <rect x="210" y="400" width="100" height="120" rx="22" fill="url(#aw-strap)" />
      </g>

      {/* ===== BODY + BEZEL ===== */}
      <g filter="url(#aw-bodyShadow)">
        <rect x="150" y="120" width="220" height="280" rx="64" fill="url(#aw-bezel)" />
        <rect x="150.5" y="120.5" width="219" height="279" rx="63.5" fill="none" stroke="rgba(255,255,255,.45)" />
      </g>

      {/* ===== SIDE BUTTONS ===== */}
      <rect x="372" y="170" width="12" height="56" rx="6" fill="url(#aw-sideBtn)" />
      <g filter="url(#aw-crownShadow)">
        <circle cx="385" cy={C} r="14" fill="url(#aw-crown)" />
        <circle cx="385" cy={C} r="11" fill="none" stroke="rgba(255,255,255,.45)" />
      </g>

      {/* ===== SCREEN (inset) ===== */}
      <rect x="164" y="134" width="192" height="252" rx="54" fill="url(#aw-screen)" />
      <rect x="164" y="134" width="192" height="252" rx="54" fill="url(#aw-glass)" />

      {/* ===== FACE CONTENT (now dynamic) ===== */}
      <text
        x={C}
        y="240"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
        fontSize="56"
        fontWeight="800"
        fill="#ffffff"
        style={{ textShadow: '0 6px 18px rgba(0,0,0,.35)' }}
        suppressHydrationWarning
      >
        {time}
      </text>

      <text
        x={C}
        y="272"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
        fontSize="14"
        fontWeight="600"
        fill="rgba(255,255,255,.82)"
        suppressHydrationWarning
      >
        {date}
      </text>

      <g transform="translate(0, 8)">
        <rect x="190" y="288" width="60" height="26" rx="13" fill="rgba(255,255,255,.10)" stroke="rgba(255,255,255,.18)"/>
        <rect x="270" y="288" width="60" height="26" rx="13" fill="rgba(255,255,255,.10)" stroke="rgba(255,255,255,.18)"/>
      </g>

      <g opacity="0.9" transform="translate(0, 8)">
        <circle cx={C - 18} cy="344" r="3" fill="rgba(255,255,255,.7)" />
        <circle cx={C}       cy="344" r="3" fill="rgba(255,255,255,1)" />
        <circle cx={C + 18}  cy="344" r="3" fill="rgba(255,255,255,.7)" />
      </g>

      <rect x="152" y="122" width="216" height="276" rx="62" fill="none" stroke="rgba(255,255,255,.28)" />

      {/* ===== DEFS ===== */}
      <defs>
        <linearGradient id="aw-strap" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor="rgba(255,255,255,.70)" />
          <stop offset="100%" stopColor="rgba(255,255,255,.18)" />
        </linearGradient>

        <radialGradient id="aw-bezel" cx="50%" cy="40%" r="75%">
          <stop offset="0%"   stopColor="rgba(255,255,255,.24)" />
          <stop offset="100%" stopColor="rgba(255,255,255,.10)" />
        </radialGradient>

        <linearGradient id="aw-sideBtn" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%"   stopColor="rgba(255,255,255,.45)" />
          <stop offset="100%" stopColor="rgba(255,255,255,.15)" />
        </linearGradient>
        <radialGradient id="aw-crown" cx="50%" cy="50%" r="60%">
          <stop offset="0%"   stopColor="rgba(255,255,255,.75)" />
          <stop offset="100%" stopColor="rgba(255,255,255,.25)" />
        </radialGradient>

        <linearGradient id="aw-screen" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor="rgba(10,10,12,1)" />
          <stop offset="100%" stopColor="rgba(5,6,8,1)" />
        </linearGradient>

        <linearGradient id="aw-glass" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor="rgba(255,255,255,.18)" />
          <stop offset="12%"  stopColor="rgba(255,255,255,.10)" />
          <stop offset="30%"  stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>

        <filter id="aw-bodyShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="24" floodColor="rgba(0,0,0,.35)" />
        </filter>
        <filter id="aw-crownShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="rgba(0,0,0,.35)" />
        </filter>
      </defs>
    </svg>
  );
}

export default function HomePage() {
  useRevealOnScroll();

  return (
    <div className={styles.page}>
      <Navbar />

      {/* —— HERO —— */}
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy} data-reveal>
            <span className={styles.badge}>TactiGrind</span>
            <h1 className={styles.h1}>
              Mission control, <span className={styles.h1Accent}>made effortless</span>.
            </h1>
            <p className={styles.lede}>
              TactiGrind streamlines mission planning and post-mission analysis for teams in the field.
              Create missions in seconds, assign squads, set locations, and review outcomes — all inside a
              fast, glass-smooth interface.
            </p>

            <div className={styles.ctaRow}>
              <Link href="/create-mission" className={`${styles.btn} ${styles.btnPrimary}`}>Create mission</Link>
              <Link href="/old-missions" className={`${styles.btn} ${styles.btnGhost}`}>Old missions</Link>
            </div>
          </div>

          <div className={styles.heroArt} data-reveal>
            <WatchHeroSVG />
            <div className={styles.glow} />
          </div>
        </div>
        <br />
        <br />

        {/* subtle background accents */}
        <div className={`${styles.blob} ${styles.blobA}`} aria-hidden="true" />
        <div className={`${styles.blob} ${styles.blobB}`} aria-hidden="true" />
      </header>

      {/* —— FEATURES —— */}
      <section className={styles.features}>
        <div className={styles.featureCard} data-reveal>
          <h3 className={styles.featureTitle}>Plan fast</h3>
          <p className={styles.featureText}>Guided mission wizard with map-based picking and beautiful selectors.</p>
        </div>
        <div className={styles.featureCard} data-reveal>
          <h3 className={styles.featureTitle}>Coordinate smart</h3>
          <p className={styles.featureText}>Assign soldiers & commanders, apply configurations, and stay in sync.</p>
        </div>
        <div className={styles.featureCard} data-reveal>
          <h3 className={styles.featureTitle}>Review clearly</h3>
          <p className={styles.featureText}>Dashboards and reports that surface the signal — not the noise.</p>
        </div>
      </section>

      {/* —— HOW IT WORKS / STEPS —— */}
      <section className={styles.steps}>
        <div className={styles.stepsInner}>
          <div className={styles.step} data-reveal>
            <div className={styles.stepNum}>1</div>
            <h4 className={styles.stepTitle}>Create</h4>
            <p className={styles.stepText}>Start a new mission, set time & duration, choose a location on the map.</p>
          </div>
          <div className={styles.step} data-reveal>
            <div className={styles.stepNum}>2</div>
            <h4 className={styles.stepTitle}>Assign</h4>
            <p className={styles.stepText}>Pick soldiers & commanders and apply the right configuration.</p>
          </div>
          <div className={styles.step} data-reveal>
            <div className={styles.stepNum}>3</div>
            <h4 className={styles.stepTitle}>Analyze</h4>
            <p className={styles.stepText}>Track outcomes, upload logs, and review finished missions.</p>
          </div>
        </div>
      </section>

      {/* —— FOOTER MINI —— */}
      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} TactiGrind. Built for focus.</p>
      </footer>
    </div>
  );
}
