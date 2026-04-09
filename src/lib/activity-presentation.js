const ACTIVITY_IMAGE_CACHE_VERSION = "20260403";

const QUEST_ACTIVITY_IMAGE_BY_TIER = {
  1: "/images/activities/quest/heartlands/Quest_I.png",
  2: "/images/activities/quest/heartlands/Quest_II.png",
  3: "/images/activities/quest/heartlands/Quest_III.png",
  4: "/images/activities/quest/heartlands/Quest_IV.png",
  5: "/images/activities/quest/heartlands/Quest_V.png",
};

const ADVENTURE_ACTIVITY_IMAGE_BY_TIER = {
  1: "/images/activities/adventure/heartlands/Adventure_I.png",
  2: "/images/activities/adventure/heartlands/Adventure_II.png",
  3: "/images/activities/adventure/heartlands/Adventure_III.png",
  4: "/images/activities/adventure/heartlands/Adventure_IV.png",
  5: "/images/activities/adventure/heartlands/Adventure_V.png",
};

const ACTIVITY_IMAGE_BY_GROUP_AND_TIER = {
  quest: QUEST_ACTIVITY_IMAGE_BY_TIER,
  adventure: ADVENTURE_ACTIVITY_IMAGE_BY_TIER,
};

export function getActivityIllustrationSrc(activity) {
  if (!activity || typeof activity.tier !== "number") {
    return null;
  }

  const imagePath = ACTIVITY_IMAGE_BY_GROUP_AND_TIER[activity.groupId]?.[activity.tier] ?? null;
  return imagePath ? `${imagePath}?v=${ACTIVITY_IMAGE_CACHE_VERSION}` : null;
}