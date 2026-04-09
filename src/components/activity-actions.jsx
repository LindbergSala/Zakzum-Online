import Link from "next/link";

import { ACTIVITY_GROUPS, getActivityGroupAvailability } from "@/lib/core-loop-data";

function buildDecisionSignal(groupId) {
  if (groupId === "quest") {
    return "Best starting point when you want steady progress and lower risk.";
  }

  if (groupId === "adventure") {
    return "Higher pressure and stronger swings. Better when HP and stamina are stable.";
  }

  return "Save this for later progression and stronger builds.";
}

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
            <p className="activity-item-signal">{buildDecisionSignal(group.id)}</p>
            <div className="activity-item-badges" aria-label={`${group.name} quick facts`}>
              {badges.map((badge) => (
                <span key={`${group.id}-${badge}`} className="activity-item-badge">
                  {badge}
                </span>
              ))}
            </div>
            <p className="activity-item-note">
              {availability.isOpen
                ? "Open now. Choose this when its risk and reward match your current resources."
                : availability.reason}
            </p>
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
