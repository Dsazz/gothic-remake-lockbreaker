// View layer barrel. The `state -> DOM` render functions live in cohesive
// per-surface modules under `src/view/`; this file preserves the public import
// surface (`import * as view from "./view.js"`) for controllers and tests.
//
// View rules still hold for every module here: render only, handlers injected
// via arguments, and no import of `store.js`.

export { renderControls } from "./view/controls.js";
export { renderTumblers, renderSolveButton } from "./view/tumblers.js";
export {
  renderLocaleSuggest,
  renderTutorOptInChip,
  renderI18nBanner,
  renderHashBanner,
  renderMappingWarning,
} from "./view/banners.js";
export { renderSolution, renderSequencePanel } from "./view/solution.js";
export { renderHelpOverlay, renderWipeConfirmOverlay } from "./view/overlays.js";
export {
  renderHeadPortrait,
  renderHeadSleeper,
  renderHeadSupport,
  renderVersionBadge,
  renderFooter,
} from "./view/chrome.js";
