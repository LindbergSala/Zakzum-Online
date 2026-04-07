import Link from "next/link";

import styles from "./rest-lock-banner.module.css";

export default function RestLockBanner({
  areaLabel = "This area",
  manageHref = "/character",
  manageLabel = "Go to Character",
}) {
  return (
    <section className={styles.banner} aria-label={`${areaLabel} locked during rest`}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>Rest Active</p>
        <h2 className={styles.title}>{areaLabel} is locked while you rest</h2>
        <p className={styles.body}>
          Cancel Rest from Character when you want to use this area again.
        </p>
      </div>
      <Link className={styles.link} href={manageHref}>
        {manageLabel}
      </Link>
    </section>
  );
}