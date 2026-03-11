import Link from "next/link";

import { ACTIVITY_DEFINITIONS } from "@/lib/core-loop-data";

export default function ActivityActions() {
  return (
    <ul className="activity-list">
      {ACTIVITY_DEFINITIONS.map((activity) => (
        <li key={activity.id} className={`activity-item activity-item-${activity.id}`}>
          <h2>{activity.name}</h2>
          <p>{activity.riskProfile}</p>
          <p>{activity.pageIntro}</p>
          <p>
            <strong>Energy cost:</strong> {activity.energyCost}
          </p>
          <p>
            <Link href={`/activities/${activity.id}`}>
              Open {activity.name}
            </Link>
          </p>
        </li>
      ))}
    </ul>
  );
}
