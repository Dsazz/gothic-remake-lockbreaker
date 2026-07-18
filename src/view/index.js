// View layer barrel. The `state -> DOM` render functions live in cohesive
// per-surface sibling modules in this folder; this file is the public import
// surface (`import * as view from "../view/index.js"`) for controllers and tests.
//
// View rules still hold for every module here: render only, handlers injected
// via arguments, and no import of `store.js`.

export { renderControls } from "./controls.js";
export { renderCatalogOverlay, renderCatalogBadge } from "./catalog.js";
export { renderTumblers, renderSolveButton, renderShortcutsHint } from "./tumblers.js";
export {
  renderLocaleSuggest,
  renderTutorOptInChip,
  renderI18nBanner,
  renderHashBanner,
  renderMappingWarning,
} from "./banners.js";
export { renderSolution, renderSequencePanel } from "./solution.js";
export { renderHelpOverlay, renderWipeConfirmOverlay, renderShortcutsOverlay } from "./overlays.js";
export {
  renderHeadPortrait,
  renderHeadSleeper,
  renderHeadSupport,
  renderVersionBadge,
  renderFooter,
} from "./chrome.js";
