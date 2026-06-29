// Pure decision logic for in-context "NEW" feature badges. Side-effect free: no
// DOM access and no reliance on browser globals — only plain data in and out.
// A badge shows when the feature was introduced after the user's first-seen
// baseline and the user has not dismissed it. Badges retire by dismissal or by
// pruning an entry from the registry — deliberately no time/version auto-expiry,
// because the release cadence makes version distance a poor proxy for "time".

export const BadgeFeature = Object.freeze({
  HOTKEYS: "hotkeys",
});

// Baseline stamped for users who had already visited before badges existed, so
// every current badge counts as "after their baseline". Lower than any release.
export const EARLIEST_BASELINE = "0.0.0";

// `since` = the release the badge starts showing from (set when VERSION is
// bumped), not necessarily when the feature historically shipped. Prune an entry
// to retire its badge. Invariant (guarded by tests): every `since` <= VERSION.
export const FEATURE_BADGE_REGISTRY = Object.freeze([
  Object.freeze({ id: BadgeFeature.HOTKEYS, since: "1.34.0" }),
]);

const SEGMENT_COUNT = 3;

function parseVersion(version) {
  const parts = String(version).split(".");
  const segments = [];
  for (let i = 0; i < SEGMENT_COUNT; i += 1) {
    segments.push(Number.parseInt(parts[i] ?? "0", 10) || 0);
  }
  return segments;
}

// Numeric per-segment semver compare. Returns -1, 0, or 1. String compare is
// wrong here ("1.9.0" would sort after "1.10.0").
export function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  for (let i = 0; i < SEGMENT_COUNT; i += 1) {
    if (left[i] !== right[i]) return left[i] < right[i] ? -1 : 1;
  }
  return 0;
}

export function isValidVersion(version) {
  return /^\d+\.\d+\.\d+$/.test(String(version));
}

// Feature ids whose badge should currently show: introduced after the user's
// baseline and not dismissed. A first-time visitor's baseline equals the current
// version, so no `since` is greater and nothing shows. Order follows the registry.
export function visibleBadgeIds({
  firstSeenVersion,
  dismissedIds = [],
  registry = FEATURE_BADGE_REGISTRY,
} = {}) {
  const baseline = firstSeenVersion || EARLIEST_BASELINE;
  const dismissed = new Set(dismissedIds);
  return registry
    .filter((entry) => !dismissed.has(entry.id))
    .filter((entry) => compareVersions(entry.since, baseline) > 0)
    .map((entry) => entry.id);
}

// Attributes a feature-open to its "NEW" badge: when the badge is showing and
// the user reached the feature through its organic affordance (icon / banner
// click), credit the badge instead. Any other path keeps its own source. Pure so
// the composition root's per-feature wiring stays a one-liner and is testable.
export function attributeBadgeSource({ badgeActive, source, organicSource, badgeSource }) {
  return badgeActive && source === organicSource ? badgeSource : source;
}
