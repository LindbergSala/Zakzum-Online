import Link from "next/link";

import { MusicToggleButton } from "@/components/audio/start-page-music";
import LogoutButton from "@/components/logout-button";
import styles from "./game-nav.module.css";

const gameLinks = [
  { href: "/character", label: "Character" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/zakzum", label: "Zakzum" },
  { href: "/activities", label: "Activities" },
  { href: "/market", label: "Market" },
  { href: "/log", label: "Log" },
];

const showDebugLink = process.env.NODE_ENV !== "production";

export default function GameNav() {
  const navLinks = showDebugLink
    ? [...gameLinks, { href: "/debug", label: "Debug" }]
    : gameLinks;

  return (
    <header className={styles.shell}>
      <nav className={styles.nav} aria-label="Game navigation">
        {navLinks.map((link, index) => (
          <span className={styles.linkGroup} key={link.href}>
            <Link className={styles.link} href={link.href}>
              {link.label}
            </Link>
            {index < navLinks.length - 1 ? (
              <span className={styles.separator}>|</span>
            ) : null}
          </span>
        ))}
      </nav>
      <div className={styles.logoutWrap}>
        <MusicToggleButton className={`music-toggle-button ${styles.musicButton}`} />
        <LogoutButton />
      </div>
    </header>
  );
}
