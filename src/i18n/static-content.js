import { t } from "./index.js";

// innerHTML: locale strings are trusted first-party JSON only — never user input.
function setHtml(selector, key) {
  const node = document.querySelector(selector);
  if (node) node.innerHTML = t(key);
}

function setText(selector, key, params) {
  const node = document.querySelector(selector);
  if (node) node.textContent = t(key, params);
}

function setMapLabel(selector, key) {
  const node = document.querySelector(selector);
  if (node) node.textContent = t(key);
}

function setAriaLabel(selector, key) {
  const node = document.querySelector(selector);
  if (node) node.setAttribute("aria-label", t(key));
}

function setAppDefinition() {
  const titleEl = document.querySelector(".app-title");
  if (titleEl) titleEl.textContent = t("app.srTitle");
  const bodyEl = document.querySelector(".app-definition-body");
  if (bodyEl) bodyEl.textContent = t("app.definitionBody");
}

// Localizes every [data-i18n] node in the guide body — markup shape lives in
// index.html (crawler-facing), keys live in locales/*.json. No positional coupling.
function applyGuideContent() {
  setText(".lockpicking-guide summary", "guide.summary");
  setText(".lockpicking-guide .info-modal-title", "guide.summary");
  setAriaLabel(".lockpicking-guide .info-modal-close", "common.close");
  const body = document.querySelector(".lockpicking-guide-body");
  if (!body) return;
  for (const node of body.querySelectorAll("[data-i18n]")) {
    node.textContent = t(node.dataset.i18n);
  }
}

export function applyStaticContent() {
  setAppDefinition();

  setText(".panel--lock h2", "section.lock");
  setText(".panel--tumblers h2", "section.tumblers");
  setText(".panel--sequence h2", "section.sequence");

  setText("#how-to-map summary", "howto.summary");
  setText("#how-to-map .info-modal-title", "howto.summary");
  setAriaLabel("#how-to-map .info-modal-close", "common.close");
  const steps = document.querySelectorAll(".how-to-map-steps li");
  const stepKeys = ["howto.step1", "howto.step2", "howto.step3", "howto.step4"];
  steps.forEach((li, i) => {
    if (stepKeys[i]) li.innerHTML = t(stepKeys[i]);
  });

  setText(".how-to-map-subhead", "howto.subhead");
  const tierNotes = document.querySelectorAll(".how-to-map-tier-note");
  if (tierNotes[0]) tierNotes[0].innerHTML = t("howto.tierNote1");
  if (tierNotes[1]) tierNotes[1].innerHTML = t("howto.tierNote2");

  const ths = document.querySelectorAll(".how-to-map-table thead th");
  const thKeys = ["howto.table.tier", "howto.table.wallMistakes", "howto.table.onBreak"];
  ths.forEach((th, i) => {
    if (thKeys[i]) th.textContent = t(thKeys[i]);
  });

  const tierRows = document.querySelectorAll(".how-to-map-table tbody tr");
  const tierNameKeys = ["mastery.untrained", "mastery.trainedCost", "mastery.masterCost"];
  const tierEffectKeys = [
    "howto.table.untrainedReset",
    "howto.table.trainedKept",
    "howto.table.masterKept",
  ];
  tierRows.forEach((row, i) => {
    const cells = row.querySelectorAll("td");
    if (cells[0] && tierNameKeys[i]) cells[0].textContent = t(tierNameKeys[i]);
    if (cells[2] && tierEffectKeys[i]) cells[2].textContent = t(tierEffectKeys[i]);
  });

  setText("#browse-locks-howto", "catalog.browse");
  const howtoImg = document.querySelector(".how-to-map-figure img");
  if (howtoImg) howtoImg.setAttribute("alt", t("howto.imgAlt"));

  setHtml(".panel-note", "panel.tumblersNote");

  setMapLabel(".map-callout--lock1 .map-label-text", "map.lock1");
  setMapLabel(".map-callout--notch .map-label-text", "map.notch");
  setMapLabel(".map-callout--lock5 .map-label-text", "map.lock6");
  setMapLabel(".map-label-text--callout", "map.turnOnce");

  const solveBtn = document.getElementById("solve-btn");
  if (solveBtn) solveBtn.textContent = t("solve.cta");

  applyGuideContent();
}
