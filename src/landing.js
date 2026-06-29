import { isPristineDefault } from "./core/domain.js";
import { LandingType } from "./analytics/values.js";

export function resolveLandingType(state, wasLoadedFromHash, hasVisited) {
  if (wasLoadedFromHash && !isPristineDefault(state)) return LandingType.HASH;
  if (hasVisited) return LandingType.RETURNING;
  return LandingType.COLD;
}
