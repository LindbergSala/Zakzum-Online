import Link from "next/link";

import { ACTIVITY_GROUPS, getActivityGroupAvailability } from "@/lib/core-loop-data";

export default function ActivityActions() {
  return (
    <ul className="activity-list">
      {ACTIVITY_GROUPS.map((group) => {
        const availability = getActivityGroupAvailability(group.id);
        const ctaLabel =
          group.id === "quest"
            ? "Open Quest Board"
            : group.id === "adventure"
              ? "Open Adventure Board"
              : availability.badgeLabel;
        const groupHref =
          group.id === "quest"
            ? "/quest"
            : group.id === "adventure"
              ? "/adventure"
              : `/activities/${group.id}`;
        const badges = Array.isArray(group.overviewBadges)
          ? group.overviewBadges
              .filter(
                (badge) =>
                  typeof badge === "string" &&
                  !badge.toLowerCase().includes("tier"),
              )
              .slice(0, 3)
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
              {availability.isOpen ? (
                <Link href={groupHref}>
                  {ctaLabel}
                </Link>
              ) : (
                <span className="activity-item-cta-disabled" aria-disabled="true" title={availability.reason}>
                  {ctaLabel}
                </span>
              )}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
