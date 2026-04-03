import Link from "next/link";

import {
  MusicToggleButton,
  MusicVolumeControl,
} from "@/components/audio/start-page-music";
import LogoutButton from "@/components/logout-button";
import styles from "./game-nav.module.css";

const gameLinks = [
  { href: "/character", label: "Character" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/activities", label: "Activities" },
  { href: "/market", label: "Market" },
  { href: "/zakzum", label: "Zakzum" },
];

export default function GameNav() {
  return (
    <header className={styles.shell}>
      <nav className={styles.nav} aria-label="Game navigation">
        {gameLinks.map((link, index) => (
          <span className={styles.linkGroup} key={link.href}>
            <Link className={styles.link} href={link.href}>
              {link.label}
            </Link>
            {index < gameLinks.length - 1 ? (
              <span className={styles.separator}>|</span>
            ) : null}
          </span>
        ))}
      </nav>
      <div className={styles.logoutWrap}>
        <MusicVolumeControl
          className={styles.volumeWrap}
          labelClassName={styles.volumeLabel}
          inputClassName={styles.volumeSlider}
        />
        <MusicToggleButton className={`music-toggle-button ${styles.musicButton}`} />
        <Link className={styles.accountButton} href="/account">
          Account
        </Link>
        <LogoutButton />
      </div>
    </header>
  );
}
