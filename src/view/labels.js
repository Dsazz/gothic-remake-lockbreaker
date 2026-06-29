// Pure label and class-name mapping for the view layer. Maps domain values to
// localized text / CSS class names. No DOM construction.

import { LINK, DIR, POS_MIN, POS_MAX, CENTER, EDGE, NEAR_EDGE } from "../core/domain.js";
import { t } from "../i18n/index.js";

export function linkLabel(link) {
  if (link === LINK.SAME) return t("coupling.with");
  if (link === LINK.OPP) return t("coupling.against");
  return "·";
}

// The on-screen/in-game groove axis is mirrored relative to the solver's
// POS_MIN..POS_MAX axis, so DIR.LEFT (-1) is shown to the player as "right" (and
// vice versa). This inversion is intentional and validated against the game —
// keep label and arrow flipped together; do not "correct" it.
export function dirLabel(dir) {
  return dir === DIR.LEFT ? t("direction.right") : t("direction.left");
}

export function masteryLabel(tier) {
  return t(`mastery.${tier.key}`);
}

export function lockLabel(plate) {
  return `L${plate + 1}`;
}

export function holeLabel(value) {
  return String(value + 4);
}

// Danger of a pin by distance from the notch: at a wall (breaks the pick if
// pushed further) vs one nudge from a wall. Symmetric across both walls.
export function dangerClass(value) {
  const distance = Math.abs(value);
  if (distance >= EDGE) return "at-edge";
  if (distance === NEAR_EDGE) return "near-edge";
  return "";
}

export function holeClassList(v, value, { moving = false } = {}) {
  const active = v === value;
  return [
    "hole",
    active ? "is-active" : "",
    v === CENTER ? "is-notch" : "",
    v === POS_MIN || v === POS_MAX ? "is-wall" : "",
    Math.abs(v) === NEAR_EDGE ? "is-near-slot" : "",
    active ? dangerClass(value) : "",
    active && moving ? "is-moving" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

// Locks N (back) through 1 (front), top to bottom — matches in-game view.
export function platesDisplayOrder(plateCount) {
  return Array.from({ length: plateCount }, (_, i) => plateCount - 1 - i);
}
