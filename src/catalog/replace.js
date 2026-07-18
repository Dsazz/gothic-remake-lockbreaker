import { isPristineDefault } from "../core/domain.js";

/** True when loading a catalog lock would replace meaningful user work. */
export function shouldConfirmCatalogReplace(state, hasSolutionSession) {
  return Boolean(hasSolutionSession) || !isPristineDefault(state);
}
