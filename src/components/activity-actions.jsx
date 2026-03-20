import Link from "next/link";

import { ACTIVITY_GROUPS, getActivitiesForGroup } from "@/lib/core-loop-data";

export default function ActivityActions() {
  return (
    <ul className="activity-list">
      {ACTIVITY_GROUPS.map((group) => {
        const activities = getActivitiesForGroup(group.id);
        const first = activities[0];
        const last = activities[activities.length - 1];

        return (
          <li key={group.id} className={`activity-item activity-item-${group.id}`}>
            <h2>{group.name}</h2>
            <p>{group.tagline}</p>
            <p>{group.description}</p>
            <p>
              <strong>Progression:</strong>{" "}
              {activities.length > 1
                ? `${first?.name} -> ${last?.name}`
                : first?.name ?? "No activities available yet."}
            </p>
            <p>
              <strong>Difficulty range:</strong>{" "}
              {first?.roll?.difficulty ?? "-"} to {last?.roll?.difficulty ?? "-"}
            </p>
            <p>
              <strong>Energy range:</strong>{" "}
              {first?.energyCost ?? "-"} to {last?.energyCost ?? "-"}
            </p>
            <p>
              <Link href={`/activities/${group.id}`}>
                Open {group.name}
              </Link>
            </p>
          </li>
        );
      })}
    </ul>
  );
}
