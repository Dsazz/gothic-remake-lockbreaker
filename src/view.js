// View layer: pure `state -> DOM` rendering. No business logic, no storage,
// no solving. Event handlers are injected by the controller via `handlers`.

import {
  LINK,
  DIR,
  POS_MIN,
  POS_MAX,
  CENTER,
  EDGE,
  NEAR_EDGE,
  MIN_PLATES,
  MAX_PLATES,
  MASTERY,
  masteryForId,
  countRemovedLinks,
  maxBreaksBudget,
  isInBounds,
  isPristineDefault,
} from "./domain.js";
import { GuideSource, SolveFailureReason, SupportSource } from "./analytics/values.js";
import {
  CHANGELOG_URL,
  GITHUB_ISSUES_URL,
  PRESS_PCGAMES_URL,
  SUPPORT_URL,
} from "./version.js";
import { t, tCount } from "./i18n.js";
import { localeSuggestPromptKey } from "./locale-suggest.js";

const LINK_CLASS = { [LINK.NONE]: "link-none", [LINK.SAME]: "link-same", [LINK.OPP]: "link-opp" };
const MASTERY_TIERS = [MASTERY.UNTRAINED, MASTERY.TRAINED, MASTERY.MASTER];

function linkLabel(link) {
  if (link === LINK.SAME) return t("coupling.with");
  if (link === LINK.OPP) return t("coupling.against");
  return "·";
}

function dirLabel(dir) {
  return dir === DIR.LEFT ? t("direction.right") : t("direction.left");
}

function masteryLabel(tier) {
  return t(`mastery.${tier.key}`);
}

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== undefined && value !== null) {
      node.setAttribute(key, value);
    }
  }
  for (const child of [].concat(children)) {
    if (child) node.append(child);
  }
  return node;
}

function lockLabel(plate) {
  return `L${plate + 1}`;
}

const ARROW_PATH = {
  right: "M2 10 H11 V6 L22 12 L11 18 V14 H2 Z",
  left: "M22 10 H13 V6 L2 12 L13 18 V14 H22 Z",
};

function arrowSvg(isRight) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", isRight ? ARROW_PATH.right : ARROW_PATH.left);
  svg.append(path);
  return svg;
}

// size: "focus" | "list" | "min"
function renderMoveCmd(move, size = "focus") {
  const isRight = move.dir === DIR.LEFT;
  return el(
    "span",
    {
      class: `move-cmd move-cmd--${size}`,
      "aria-label": t("move.aria", {
        lock: move.plate + 1,
        dir: dirLabel(move.dir),
      }),
    },
    [
      el("span", { class: "move-lock", text: lockLabel(move.plate) }),
      el(
        "span",
        {
          class: `move-arrow move-arrow--${isRight ? "right" : "left"}`,
          "aria-hidden": "true",
        },
        [arrowSvg(isRight)],
      ),
    ],
  );
}

function stepCounter(stepIndex, total, done) {
  if (done) return `${total}/${total}`;
  return `${stepIndex + 1}/${total}`;
}

function iconBtn({ label, className = "", onClick, disabled, svg }) {
  return el(
    "button",
    {
      class: className ? `icon-btn ${className}` : "icon-btn",
      "aria-label": label,
      title: label,
      disabled: disabled ? "" : null,
      onClick,
    },
    [svg],
  );
}

function navChevronSvg(dir) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", dir === "back" ? "M14 6 L8 12 L14 18 Z" : "M10 6 L16 12 L10 18 Z");
  svg.append(path);
  return svg;
}

function toolIconSvg(kind) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");

  if (kind === "expand") {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M6 15l6-6 6 6");
    svg.append(path);
    return svg;
  }

  if (kind === "minimize") {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M6 9l6 6 6-6");
    svg.append(path);
    return svg;
  }

  const body = document.createElementNS("http://www.w3.org/2000/svg", "path");
  body.setAttribute(
    "d",
    "m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21",
  );
  const base = document.createElementNS("http://www.w3.org/2000/svg", "path");
  base.setAttribute("d", "M22 21H7");
  svg.append(body, base);
  return svg;
}

function controlsIconSvg(kind) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  if (kind === "link") {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",
    );
    const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path2.setAttribute(
      "d",
      "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
    );
    svg.append(path, path2);
  } else {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      "M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
    );
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", "10");
    line.setAttribute("y1", "11");
    line.setAttribute("x2", "10");
    line.setAttribute("y2", "17");
    const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line2.setAttribute("x1", "14");
    line2.setAttribute("y1", "11");
    line2.setAttribute("x2", "14");
    line2.setAttribute("y2", "17");
    svg.append(path, line, line2);
  }
  return svg;
}

function holeLabel(value) {
  return String(value + 4);
}

// Danger of a pin by distance from the notch: at a wall (breaks the pick if
// pushed further) vs one nudge from a wall. Symmetric across both walls.
function dangerClass(value) {
  const distance = Math.abs(value);
  if (distance >= EDGE) return "at-edge";
  if (distance === NEAR_EDGE) return "near-edge";
  return "";
}

// Locks N (back) through 1 (front), top to bottom — matches in-game view.
function platesDisplayOrder(plateCount) {
  return Array.from({ length: plateCount }, (_, i) => plateCount - 1 - i);
}

function masteryNoteText(state) {
  const tier = masteryForId(state.masteryLevel);
  const reset = tier.resetOnBreak ? t("mastery.noteReset") : t("mastery.noteKept");
  const masterExtra = tier.id === MASTERY.MASTER.id ? t("mastery.noteMasterExtra") : "";
  return t("mastery.note", {
    mistakes: tier.mistakes,
    reset,
    masterExtra,
  });
}

function breaksHintText(breaksBudget, removed) {
  if (breaksBudget <= 0) return t("breaks.hintZero");
  if (removed >= breaksBudget) return t("breaks.hintDone");
  return t("breaks.hintProgress", { removed, total: breaksBudget });
}

function renderMasterySelector(state, handlers) {
  const pills = MASTERY_TIERS.map((tier) =>
    el("button", {
      class: `pill ${tier.id === state.masteryLevel ? "is-active" : ""}`,
      text: masteryLabel(tier),
      type: "button",
      onClick: () => handlers.onSetMasteryLevel(tier.id),
    }),
  );
  return el("div", { class: "mastery-block" }, [
    el("span", { class: "field-label", text: t("mastery.label") }),
    el("div", { class: "pill-row mastery-row" }, pills),
    el("p", { class: "mastery-note", text: masteryNoteText(state) }),
  ]);
}

function renderBreaksStepper(state, handlers) {
  if (state.masteryLevel !== MASTERY.MASTER.id) return null;
  const max = maxBreaksBudget(state.plateCount);
  const removed = countRemovedLinks(state.removedLinks);
  return el("div", { class: "breaks-stepper" }, [
    el("span", { class: "field-label", text: t("controls.breaksLabel") }),
    el("div", { class: "breaks-stepper-controls" }, [
      el("button", {
        class: "pill breaks-step",
        type: "button",
        text: "−",
        "aria-label": t("controls.breaksFewer"),
        disabled: state.breaksBudget <= 0 ? "" : null,
        onClick: () => handlers.onAdjustBreaksBudget(-1),
      }),
      el("span", { class: "breaks-value", text: String(state.breaksBudget) }),
      el("button", {
        class: "pill breaks-step",
        type: "button",
        text: "+",
        "aria-label": t("controls.breaksMore"),
        disabled: state.breaksBudget >= max ? "" : null,
        onClick: () => handlers.onAdjustBreaksBudget(1),
      }),
    ]),
    el("p", {
      class: "breaks-hint",
      text: breaksHintText(state.breaksBudget, removed),
    }),
  ]);
}

function mismatchChecklist(state) {
  const items = [
    t("walkthrough.mismatch1"),
    t("walkthrough.mismatch2"),
    t("walkthrough.mismatch3"),
  ];
  if (state.masteryLevel === MASTERY.MASTER.id && state.breaksBudget > 0) {
    items.push(t("walkthrough.mismatch4"));
  }
  return el("ul", { class: "mismatch-checklist" }, items.map((text) => el("li", { text })));
}

export function renderControls(container, state, handlers) {
  const counts = [];
  for (let n = MIN_PLATES; n <= MAX_PLATES; n++) {
    counts.push(
      el("button", {
        class: `pill ${n === state.plateCount ? "is-active" : ""}`,
        text: String(n),
        onClick: () => handlers.onSetPlateCount(n),
      }),
    );
  }
  const breaksStepper = renderBreaksStepper(state, handlers);
  const showLockActions = !isPristineDefault(state);
  const locksBlock = el("div", { class: "locks-block" }, [
    el("span", { class: "field-label", text: t("controls.locksLabel") }),
    el("div", { class: "pill-row locks-row" }, counts),
  ]);
  const actionsBlock = el("div", { class: "controls-actions" }, [
    iconBtn({
      label: t("controls.wipeLock"),
      className: "icon-btn--tool",
      onClick: handlers.onClearAll,
      svg: controlsIconSvg("wipe"),
    }),
  ]);
  container.replaceChildren(
    renderMasterySelector(state, handlers),
    ...(breaksStepper ? [breaksStepper] : []),
    el("div", { class: "controls-footer" }, [
      locksBlock,
      ...(showLockActions ? [actionsBlock] : []),
    ]),
  );
}

function linkChips(turned, state, handlers) {
  const { plateCount, matrix, removedLinks, masteryLevel, breaksBudget } = state;
  const masterGone = masteryLevel === MASTERY.MASTER.id && breaksBudget > 0;
  const removedCount = countRemovedLinks(removedLinks);
  const chips = [];

  for (let reactor = 0; reactor < plateCount; reactor++) {
    if (reactor === turned) continue;
    const link = matrix[reactor][turned];
    const removed = removedLinks[reactor][turned];
    const couplingChip = el("button", {
      class: ["link-chip", LINK_CLASS[link], removed ? "link-removed" : ""].filter(Boolean).join(" "),
      text: `${lockLabel(reactor)} ${linkLabel(link)}`,
      type: "button",
      "aria-label": t("tumbler.couplingAria", {
        lock: lockLabel(reactor),
        coupling: linkLabel(link),
      }),
      onClick: () => handlers.onCycleCell(reactor, turned),
    });

    if (!masterGone || link === LINK.NONE) {
      chips.push(couplingChip);
      continue;
    }

    const canMarkGone = removed || removedCount < breaksBudget;
    const goneBtn = el("button", {
      class: `link-gone-btn${removed ? " is-active" : ""}`,
      text: removed ? t("coupling.goneDone") : t("coupling.gone"),
      type: "button",
      "aria-label": removed
        ? t("tumbler.goneUndoAria", { lock: lockLabel(reactor) })
        : t("tumbler.goneAria", { lock: lockLabel(reactor) }),
      disabled: canMarkGone ? null : "",
      onClick: () => handlers.onToggleLinkRemoved(reactor, turned),
    });

    chips.push(el("div", { class: "link-chip-group" }, [couplingChip, goneBtn]));
  }
  return chips;
}

function holeClassList(v, value, { moving = false } = {}) {
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

function holeGrooveElements(value, { interactive, plate, handlers, moving = false } = {}) {
  const holes = [];
  for (let v = POS_MIN; v <= POS_MAX; v++) {
    const hole = holeLabel(v);
    const className = holeClassList(v, value, { moving });
    if (interactive) {
      holes.push(
        el("button", {
          class: className,
          text: hole,
          "aria-label": t("tumbler.holeAria", { hole }),
          onClick: () => handlers.onSetPosition(plate, v),
        }),
      );
    } else {
      holes.push(
        el("span", {
          class: className,
          text: hole,
          "aria-hidden": "true",
        }),
      );
    }
  }
  return holes;
}

function positionGroove(plate, value, handlers) {
  return el(
    "div",
    { class: "plate-holes" },
    holeGrooveElements(value, { interactive: true, plate, handlers }),
  );
}

function holeGrooveReadout(value, { moving = false } = {}) {
  return el(
    "div",
    { class: "plate-holes plate-holes--readout" },
    holeGrooveElements(value, { moving }),
  );
}

function tumblerCard(plate, state, handlers) {
  const value = state.positions[plate];
  return el("article", { class: `tumbler-card ${dangerClass(value)}` }, [
    el("header", { class: "tumbler-head" }, [
      el("h3", { class: "tumbler-title", text: t("tumbler.lock", { n: plate + 1 }) }),
      el("span", {
        class: "tumbler-sub",
        text:
          plate === 0
            ? t("tumbler.frontPlate")
            : plate === state.plateCount - 1
              ? t("tumbler.backPlate")
              : "",
      }),
    ]),
    el("div", { class: "tumbler-start" }, [
      el("span", { class: "tumbler-field-label", text: t("tumbler.startHole") }),
      positionGroove(plate, value, handlers),
    ]),
    el("div", { class: "tumbler-links" }, [
      el("span", { class: "tumbler-field-label", text: t("tumbler.turningMoves") }),
      el("div", { class: "link-chip-row" }, linkChips(plate, state, handlers)),
    ]),
  ]);
}

function holeLegend() {
  return el("div", { class: "hole-legend" }, [
    el("span", { class: "hole-legend-wall", text: t("legend.wallLeft") }),
    el("span", { class: "hole-legend-notch", text: t("legend.notch") }),
    el("span", { class: "hole-legend-wall", text: t("legend.wallRight") }),
  ]);
}

export function renderTumblers(container, state, handlers, ui = {}) {
  const cards = platesDisplayOrder(state.plateCount).map((plate) =>
    tumblerCard(plate, state, handlers),
  );
  container.classList.toggle("is-pulse", Boolean(ui.pulse));
  container.replaceChildren(holeLegend(), ...cards);
}

export function renderSolveButton(button, { mapped, justEnabled }) {
  if (!button) return;
  button.textContent = t("solve.cta");
  button.disabled = !mapped;
  button.setAttribute("aria-disabled", mapped ? "false" : "true");
  button.classList.toggle("is-disabled", !mapped);
  button.classList.toggle("is-ready-flash", Boolean(justEnabled));
}

function dismissCrossSvg() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M6 6 L18 18 M18 6 L6 18");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  svg.append(path);
  return svg;
}

function ackCheckSvg() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M7 12.5 L10.5 16 L17 8");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2.25");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.append(path);
  return svg;
}

function bannerDismissButton(onClick) {
  return el(
    "button",
    {
      class: "icon-btn icon-btn--tool hash-banner-dismiss",
      type: "button",
      "aria-label": t("solution.dismiss"),
      onClick,
    },
    [dismissCrossSvg()],
  );
}

function i18nAckButton(onClick) {
  return el(
    "button",
    {
      class: "i18n-ack-btn",
      type: "button",
      "aria-label": t("i18nBanner.dismiss"),
      title: t("i18nBanner.dismiss"),
      onClick,
    },
    [ackCheckSvg()],
  );
}

export function renderLocaleSuggest(container, ui, handlers) {
  if (!container) return;
  if (!ui?.visible || !ui.suggestedLocale) {
    container.replaceChildren();
    container.hidden = true;
    return;
  }
  container.hidden = false;
  const promptKey = localeSuggestPromptKey(ui.suggestedLocale);
  const promptId = "locale-suggest-prompt";
  const prompt = promptKey ? t(promptKey) : "";
  const languageLabel = t(`locale.${ui.suggestedLocale}`);

  container.replaceChildren(
    el(
      "div",
      {
        class: "locale-suggest",
        role: "region",
        "aria-labelledby": promptId,
      },
      [
        el("p", { class: "locale-suggest-text", id: promptId, text: prompt }),
        el("div", { class: "locale-suggest-actions" }, [
          el("button", {
            class: "locale-suggest-primary",
            type: "button",
            text: languageLabel,
            onClick: () => handlers.onAcceptLocaleSuggest?.(),
          }),
          el("button", {
            class: "locale-suggest-secondary",
            type: "button",
            text: t("localeSuggest.english"),
            onClick: () => handlers.onDeclineLocaleSuggest?.({ explicit: true }),
          }),
        ]),
        el(
          "button",
          {
            class: "icon-btn icon-btn--tool locale-suggest-dismiss",
            type: "button",
            "aria-label": t("localeSuggest.dismiss"),
            onClick: () => handlers.onDeclineLocaleSuggest?.({ explicit: false }),
          },
          [dismissCrossSvg()],
        ),
      ],
    ),
  );
}

export function renderTutorOptInChip(container, ui, handlers) {
  if (!container) return;
  if (!ui?.visible) {
    container.replaceChildren();
    container.hidden = true;
    return;
  }
  container.hidden = false;
  container.replaceChildren(
    el("div", { class: "tutor-opt-in", role: "region", "aria-label": t("tutorOptIn.prompt") }, [
      el("p", { class: "tutor-opt-in-text", text: t("tutorOptIn.prompt") }),
      el("button", {
        class: "pill pill-primary tutor-opt-in-start",
        type: "button",
        text: t("tutorOptIn.start"),
        onClick: () => handlers.onTutorOptInStart?.(),
      }),
      el(
        "button",
        {
          class: "icon-btn icon-btn--tool tutor-opt-in-dismiss",
          type: "button",
          "aria-label": t("tutorOptIn.dismiss"),
          onClick: () => handlers.onTutorOptInDismiss?.(),
        },
        [dismissCrossSvg()],
      ),
    ]),
  );
}

export function renderI18nBanner(container, ui, handlers) {
  if (!container) return;
  if (!ui?.visible) {
    container.replaceChildren();
    container.hidden = true;
    return;
  }
  container.hidden = false;
  const text = el("p", { class: "i18n-toast-text" });
  text.append(`${t("i18nBanner.text")} `);
  text.append(
    el("a", {
      class: "i18n-toast-link",
      href: GITHUB_ISSUES_URL,
      target: "_blank",
      rel: "noopener noreferrer",
      text: t("i18nBanner.link"),
      onClick: () => handlers.onSupportClick?.(SupportSource.I18N_BANNER),
    }),
  );
  container.replaceChildren(
    el("div", { class: "i18n-toast", role: "status" }, [text, i18nAckButton(handlers.onDismissI18nBanner)]),
  );
}

export function renderHashBanner(container, ui, handlers) {
  if (!container) return;
  if (!ui?.visible) {
    container.replaceChildren();
    container.hidden = true;
    return;
  }
  container.hidden = false;
  container.replaceChildren(
    el("div", { class: "hash-banner" }, [
      el("p", { class: "hash-banner-text", text: t("solution.sharedBanner") }),
      bannerDismissButton(handlers.onDismissHashBanner),
    ]),
  );
}

export function renderSharePrompt(container, ui, handlers) {
  if (!container) return;
  if (!ui?.visible) {
    container.replaceChildren();
    container.hidden = true;
    return;
  }
  const copied = Boolean(ui?.copyCopied);
  container.hidden = false;
  container.replaceChildren(
    el("div", { class: "share-prompt" }, [
      el("p", { class: "share-prompt-text", text: t("solution.shareText") }),
      el("button", {
        class: `pill pill-primary share-prompt-btn${copied ? " is-copied" : ""}`,
        type: "button",
        text: copied ? t("solution.shareCopied") : t("solution.shareBtn"),
        "aria-label": copied ? t("solution.shareCopied") : t("solution.shareBtn"),
        onClick: handlers.onSharePromptClick,
      }),
      el("button", {
        class: "pill pill-ghost share-prompt-dismiss",
        type: "button",
        text: t("solution.dismiss"),
        onClick: handlers.onDismissSharePrompt,
      }),
    ]),
  );
}

// solution: undefined (not run), [] (already solved), Move[] (steps), or null (no safe path)
export function renderSolution(container, solution, walkthrough, ui, handlers) {
  if (ui?.blockedMessage) {
    container.replaceChildren(
      el("p", { class: "alert", text: ui.blockedMessage }),
    );
    return;
  }

  if (solution === undefined) {
    const hint = ui?.lockReady ? t("solution.hintReady") : t("solution.hintMap");
    container.replaceChildren(el("p", { class: "hint", text: hint }));
    return;
  }

  if (solution === null) {
    const isOob = ui?.failureReason === SolveFailureReason.OOB_START;
    const message = isOob ? t("solution.oob") : t("solution.noPath");
    const children = [el("p", { class: "alert", text: message })];
    if (!isOob) {
      children.push(
        el("p", { class: "hint solution-failure-hint", text: t("solution.noPathHint") }),
        el("div", { class: "solution-failure-actions" }, [
          el("button", {
            class: "pill pill-ghost solution-guide-btn",
            type: "button",
            text: t("solution.openGuide"),
            onClick: () => handlers.onOpenGuide?.(GuideSource.FAILURE_NO_PATH),
          }),
          el("button", {
            class: "pill solution-example-btn",
            type: "button",
            text: t("solution.loadExample"),
            onClick: () => handlers.onLoadExampleFromFailure?.(),
          }),
        ]),
      );
    }
    container.replaceChildren(el("div", { class: "solution-failure" }, children));
    return;
  }

  if (solution.length === 0) {
    container.replaceChildren(
      el("p", { class: "success", text: t("solution.alreadyOpen") }),
    );
    return;
  }

  if (ui?.minimized) {
    container.replaceChildren(renderMinimizedSummary(walkthrough, handlers));
    return;
  }

  const { stepIndex, showAll } = walkthrough;
  const steps = solution.map((move, i) => {
    const status = i < stepIndex ? "is-done" : i === stepIndex ? "is-current" : "is-upcoming";
    const target = i < stepIndex ? i : i + 1;
    const jump = () => handlers.onJumpTo(target);
    return el(
      "li",
      {
        class: `step ${status}`,
        role: "button",
        tabindex: "0",
        onClick: jump,
        onKeydown: (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            jump();
          }
        },
      },
      [
        el("span", { class: "step-num", text: status === "is-done" ? "✓" : String(i + 1) }),
        el("span", { class: "step-text" }, [renderMoveCmd(move, "list")]),
      ],
    );
  });

  const toggle = el("button", {
    class: "pill pill-ghost step-toggle",
    text: showAll ? t("solution.hideAll") : t("solution.showAll", { n: solution.length }),
    onClick: () => handlers.onToggleSteps(),
  });

  const children = [
    el("p", {
      class: "success solution-count",
      text: tCount("solution.turnCount", solution.length),
    }),
    renderWalkthrough(walkthrough, ui.state, handlers, ui),
    toggle,
  ];
  if (showAll) children.push(el("ol", { class: "step-list" }, steps));

  container.replaceChildren(...children);
}

export function renderSequencePanel(panel, solution, ui, handlers) {
  if (!panel) return;
  const actions = panel.querySelector("#sequence-actions");
  const hasMoves = Array.isArray(solution) && solution.length > 0;
  const minimized = Boolean(ui?.minimized && hasMoves);
  panel.classList.toggle("is-minimized", minimized);
  panel.classList.toggle("has-solution", hasMoves);
  panel.setAttribute("aria-expanded", String(!minimized));

  if (!actions) return;
  if (!hasMoves) {
    actions.replaceChildren();
    return;
  }

  const panelTool = minimized
    ? { label: t("sequence.expand"), kind: "expand", onClick: handlers.onExpandSequence }
    : { label: t("sequence.minimize"), kind: "minimize", onClick: handlers.onMinimizeSequence };

  actions.replaceChildren(
    iconBtn({
      label: panelTool.label,
      className: "icon-btn--tool",
      onClick: panelTool.onClick,
      svg: toolIconSvg(panelTool.kind),
    }),
    iconBtn({
      label: t("sequence.clear"),
      className: "icon-btn--tool",
      onClick: handlers.onClearSolution,
      svg: toolIconSvg("clear"),
    }),
  );
}

function renderMinimizedSummary(walkthrough, handlers) {
  const { states, stepIndex, move } = walkthrough;
  const total = states.length - 1;
  const counter = stepCounter(stepIndex, total, !move);

  const arrowColChildren = [el("span", { class: "sequence-min-step", text: counter })];

  if (move) {
    const isRight = move.dir === DIR.LEFT;
    arrowColChildren.push(
      el(
        "span",
        {
          class: `move-arrow move-arrow--${isRight ? "right" : "left"}`,
          "aria-hidden": "true",
        },
        [arrowSvg(isRight)],
      ),
    );
  } else {
    arrowColChildren.push(el("span", { class: "sequence-min-done", text: t("solution.lockOpen") }));
  }

  const coreChildren = [
    move ? el("span", { class: "move-lock", text: lockLabel(move.plate) }) : null,
    el("div", { class: "sequence-min-arrow-col" }, arrowColChildren),
  ];

  const coreProps = { class: "sequence-min-core" };
  if (move) {
    coreProps["aria-label"] = t("move.aria", {
      lock: move.plate + 1,
      dir: dirLabel(move.dir),
    });
  }

  const core = el("div", coreProps, coreChildren);

  return el("div", { class: "sequence-min" }, [
    el("div", { class: "sequence-min-nav" }, [
      iconBtn({
        label: t("nav.back"),
        onClick: () => handlers.onWalk(-1),
        disabled: stepIndex === 0,
        svg: navChevronSvg("back"),
      }),
      core,
      iconBtn({
        label: move ? t("nav.next") : t("nav.done"),
        onClick: () => handlers.onWalk(1),
        disabled: stepIndex === total,
        svg: navChevronSvg("next"),
      }),
    ]),
  ]);
}

const HELP_OVERLAY_ID = "wt-help-overlay";
let helpEscapeListener = null;

function clearHelpEscapeListener() {
  if (!helpEscapeListener) return;
  document.removeEventListener("keydown", helpEscapeListener);
  helpEscapeListener = null;
}

export function renderHelpOverlay({ visible, state }, handlers) {
  clearHelpEscapeListener();
  const existing = document.getElementById(HELP_OVERLAY_ID);

  if (!visible) {
    existing?.remove();
    document.body.classList.remove("wt-help-open");
    return;
  }

  const close = () => handlers.onStepMismatch();
  helpEscapeListener = (e) => {
    if (e.key === "Escape") close();
  };
  document.addEventListener("keydown", helpEscapeListener);

  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const sheet = el(
    "div",
    {
      class: `wt-help-sheet${isMobile ? " wt-help-sheet--bottom" : ""}`,
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "wt-help-sheet-title",
    },
    [
      el("div", { class: "wt-help-sheet-head" }, [
        el("h2", {
          id: "wt-help-sheet-title",
          class: "wt-help-sheet-title",
          text: t("walkthrough.helpTitle"),
        }),
        el("button", {
          class: "wt-help-sheet-close",
          type: "button",
          "aria-label": t("walkthrough.closeTips"),
          text: "×",
          onClick: close,
        }),
      ]),
      el("p", {
        class: "wt-help-lead",
        text: t("walkthrough.helpLead"),
      }),
      mismatchChecklist(state),
    ],
  );

  const host = el("div", { id: HELP_OVERLAY_ID, class: "wt-help-overlay" }, [
    el("button", {
      class: "wt-help-backdrop",
      type: "button",
      "aria-label": t("walkthrough.closeTips"),
      onClick: close,
    }),
    el(
      "div",
      { class: `wt-help-sheet-host${isMobile ? " wt-help-sheet-host--bottom" : ""}` },
      [sheet],
    ),
  ]);

  if (existing) existing.replaceWith(host);
  else document.body.append(host);
  document.body.classList.add("wt-help-open");
  requestAnimationFrame(() => {
    host.querySelector(".wt-help-sheet-close")?.focus();
  });
}

function renderWalkthrough(walkthrough, _state, handlers, ui = {}) {
  const { states, stepIndex, move } = walkthrough;
  const board = states[stepIndex];

  const pins = platesDisplayOrder(board.length).map((plate) => {
    const value = board[plate];
    const moving = move && move.plate === plate;
    return el(
      "div",
      { class: `wt-plate${moving ? " is-current" : ""}` },
      [
        el("span", { class: "wt-label", text: lockLabel(plate) }),
        holeGrooveReadout(value, { moving }),
      ],
    );
  });

  const total = states.length - 1;
  const pct = total === 0 ? 100 : Math.round((stepIndex / total) * 100);
  const counter = stepCounter(stepIndex, total, !move);

  const progressHeadChildren = [el("span", { class: "wt-counter", text: counter })];
  if (move) {
    progressHeadChildren.push(
      el("button", {
        class: `wt-help-trigger${ui.showMismatchTips ? " is-open" : ""}`,
        type: "button",
        text: ui.showMismatchTips ? t("walkthrough.hideTips") : t("walkthrough.somethingOff"),
        "aria-label": ui.showMismatchTips
          ? t("walkthrough.hideTips")
          : t("walkthrough.somethingOff"),
        "aria-expanded": ui.showMismatchTips ? "true" : "false",
        onClick: handlers.onStepMismatch,
      }),
    );
  }

  const current = move
    ? el("div", { class: "wt-current" }, [renderMoveCmd(move, "focus")])
    : el("div", { class: "wt-current is-open" }, [
        el("span", { class: "wt-open-text", text: t("walkthrough.lockOpen") }),
      ]);

  const children = [
    el("div", { class: "wt-progress" }, [
      el("div", { class: "wt-progress-head" }, progressHeadChildren),
      el("div", { class: "wt-bar" }, [
        el("div", { class: "wt-bar-fill", style: `width:${pct}%` }),
      ]),
    ]),
    current,
    el("div", { class: "wt-board" }, pins),
  ];

  children.push(
    el("div", { class: "wt-nav" }, [
      el("button", {
        class: "pill",
        text: t("nav.backChevron"),
        disabled: stepIndex === 0 ? "" : null,
        onClick: () => handlers.onWalk(-1),
      }),
      el("button", {
        class: "pill pill-primary",
        text: move ? t("nav.nextChevron") : t("nav.done"),
        disabled: stepIndex === total ? "" : null,
        onClick: () => handlers.onWalk(1),
      }),
    ]),
  );

  return el("div", { class: "walkthrough", "data-inbounds": String(isInBounds(board)) }, children);
}

function versionLink(version) {
  return el("a", {
    class: "app-version",
    href: CHANGELOG_URL,
    target: "_blank",
    rel: "noopener noreferrer",
    text: `v${version}`,
  });
}

function pressLink(url, labelKey) {
  return el("a", {
    class: "app-foot-link",
    href: url,
    target: "_blank",
    rel: "noopener noreferrer",
    text: t(labelKey),
  });
}

function pressMentionsLine() {
  return el("p", { class: "app-foot-press" }, [
    el("span", { text: `${t("press.featured")} ` }),
    pressLink(PRESS_PCGAMES_URL, "press.pcgames"),
  ]);
}

const FOOTER_FAQ_KEYS = [
  ["footer.faq.q1", "footer.faq.a1"],
  ["footer.faq.q2", "footer.faq.a2"],
  ["footer.faq.q3", "footer.faq.a3"],
];

function footerIssuesLink() {
  return el("a", {
    class: "app-version",
    href: GITHUB_ISSUES_URL,
    target: "_blank",
    rel: "noopener noreferrer",
    text: t("footer.issues"),
  });
}

function footerFaq() {
  return el("details", { class: "app-foot-faq" }, [
    el("summary", { text: t("footer.faqSummary") }),
    el("dl", { class: "app-foot-faq-list" }, FOOTER_FAQ_KEYS.flatMap(([qKey, aKey]) => [
      el("dt", { text: t(qKey) }),
      el("dd", { text: t(aKey) }),
    ])),
  ]);
}

function footerUtility(version) {
  return el("nav", { class: "app-foot-utility" }, [
    versionLink(version),
    footerIssuesLink(),
  ]);
}

function supportOreImg(className, size) {
  return el("img", {
    class: className,
    src: "assets/ore.webp",
    alt: "",
    "aria-hidden": "true",
    width: String(size),
    height: String(size),
  });
}

const SLEEPER_ICON_SIZE = 96;

function sleeperSupportImg(className, src) {
  return el("img", {
    class: className,
    src,
    alt: "",
    "aria-hidden": "true",
    width: String(SLEEPER_ICON_SIZE),
    height: String(SLEEPER_ICON_SIZE),
  });
}

function sleeperSupportIcon() {
  return el("span", { class: "app-head-sleeper-icon" }, [
    sleeperSupportImg("app-head-sleeper-img is-sleep", "assets/sleeper-sleep.webp"),
    sleeperSupportImg("app-head-sleeper-img is-awake", "assets/sleeper-awake.webp"),
  ]);
}

export function renderHeadSleeper(container, handlers) {
  if (!container) return;
  container.hidden = false;
  container.replaceChildren(
    el("a", {
      class: "app-head-sleeper-link",
      href: SUPPORT_URL,
      target: "_blank",
      rel: "noopener noreferrer",
      "aria-label": t("support.aria"),
      onClick: () => handlers.onSupportClick?.(SupportSource.HEADER_SLEEPER),
    }, [
      sleeperSupportIcon(),
      el("span", { class: "app-head-sleeper-tip", text: t("support.sleeperTip") }),
    ]),
  );
}

export function renderHeadSupport(container, handlers) {
  if (!container) return;
  container.hidden = false;
  container.replaceChildren(
    el("a", {
      class: "app-head-support-link",
      href: SUPPORT_URL,
      target: "_blank",
      rel: "noopener noreferrer",
      "aria-label": t("support.aria"),
      onClick: () => handlers.onSupportClick?.(SupportSource.HEADER_ORE),
    }, [
      supportOreImg("app-head-support-ore", 36),
      el("span", { class: "app-head-support-label", text: t("support.cta") }),
    ]),
  );
}

function supportStrip(handlers) {
  return el("div", { class: "support-strip" }, [
    el("a", {
      class: "support-cta",
      href: SUPPORT_URL,
      target: "_blank",
      rel: "noopener noreferrer",
      "aria-label": t("support.aria"),
      onClick: () => handlers.onSupportClick?.(SupportSource.FOOTER_STRIP),
    }, [
      supportOreImg("support-ore", 36),
      el("span", { class: "support-cta-copy" }, [
        el("span", { class: "support-cta-text", text: t("support.cta") }),
        el("span", { class: "support-cta-sub", text: t("support.sub") }),
      ]),
    ]),
  ]);
}


export function renderVersionBadge(container, version) {
  container.replaceChildren(versionLink(version));
}

export function renderFooter(container, version, handlers) {
  container.replaceChildren(
    el("div", { class: "app-foot-stack" }, [
      el("div", { class: "app-foot-band" }, [
        supportStrip(handlers),
        pressMentionsLine(),
        footerFaq(),
        footerUtility(version),
      ]),
    ]),
  );
}
