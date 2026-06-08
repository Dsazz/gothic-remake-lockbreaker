import { VERSION } from "../version.js";
import { Events } from "./events.js";
import { send } from "./transport.js";

function baseProps(plateCount) {
  return { plate_count: plateCount, app_version: VERSION };
}

export function trackSolveResult({ plateCount, moveCount }) {
  const event = moveCount > 0 ? Events.LOCK_SOLVED : Events.LOCK_NO_SOLUTION;
  send(event, { ...baseProps(plateCount), move_count: moveCount });
}

export function trackShareLinkCopied({ plateCount }) {
  send(Events.SHARE_LINK_COPIED, baseProps(plateCount));
}

export function trackLockCleared() {
  send(Events.LOCK_CLEARED, { app_version: VERSION });
}
