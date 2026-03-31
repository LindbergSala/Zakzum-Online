import Link from "next/link";

import { ACTIVITY_GROUPS } from "@/lib/core-loop-data";

export default function ActivityActions() {
  return (
    <ul className="activity-list">
      {ACTIVITY_GROUPS.map((group) => {
        const ctaLabel =
          group.id === "quest"
            ? "Open Quest"
            : group.id === "adventure"
              ? "Open Adventure"
              : "Open Arena";
        const groupHref =
          group.id === "quest"
            ? "/quest"
            : group.id === "adventure"
              ? "/adventure"
              : `/activities/${group.id}`;
        const badges = Array.isArray(group.overviewBadges)
          ? group.overviewBadges.slice(0, 3)
          : [];

        return (
          <li key={group.id} className={`activity-item activity-item-${group.id}`}>
            <h2>{group.name}</h2>
            <p className="activity-item-summary">
              {group.summary ?? group.description}
            </p>
            <div className="activity-item-badges" aria-label={`${group.name} quick facts`}>
              {badges.map((badge) => (
                <span key={`${group.id}-${badge}`} className="activity-item-badge">
                  {badge}
                </span>
              ))}
            </div>
            <p className="activity-item-cta">
              <Link href={groupHref}>
                {ctaLabel}
              </Link>
            </p>
          </li>
        );
      })}
    </ul>
  );
}
