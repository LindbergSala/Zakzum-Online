import {
  HEARTLANDS_REGION_ID,
  HEARTLANDS_REGION_NAME,
  getHeartlandsLocationProfile,
} from "@/lib/heartlands-lore";

function createHeartlandsLocationRef(locationId) {
  const locationProfile = getHeartlandsLocationProfile(locationId);
  if (!locationProfile) {
    throw new Error(`Unknown Heartlands location id: ${locationId}`);
  }

  return {
    locationId: locationProfile.id,
    locationName: locationProfile.name,
    locationTitle: locationProfile.title,
    regionId: HEARTLANDS_REGION_ID,
    regionName: HEARTLANDS_REGION_NAME,
  };
}

export const HEARTLANDS_LOCATIONS = {
  kingston: createHeartlandsLocationRef("kingston"),
  goldmere: createHeartlandsLocationRef("goldmere"),
  mournstead: createHeartlandsLocationRef("mournstead"),
  saintsHollow: createHeartlandsLocationRef("saints-hollow"),
  elfhome: createHeartlandsLocationRef("elfhome"),
  northwatch: createHeartlandsLocationRef("northwatch"),
  barrowfield: createHeartlandsLocationRef("barrowfield"),
  blackthornHold: createHeartlandsLocationRef("blackthorn-hold"),
};

export { HEARTLANDS_REGION_ID, HEARTLANDS_REGION_NAME };