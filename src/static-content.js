import { t } from "./i18n.js";

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

export function applyStaticContent() {
  setText(".sr-only", "app.srTitle");
  setText(".app-definition", "app.definition");

  setText(".panel--lock h2", "section.lock");
  setText(".panel--tumblers h2", "section.tumblers");
  setText(".panel--sequence h2", "section.sequence");

  setText("#how-to-map summary", "howto.summary");
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

  setText("#load-example-lock", "howto.example");
  const howtoImg = document.querySelector(".how-to-map-figure img");
  if (howtoImg) howtoImg.setAttribute("alt", t("howto.imgAlt"));

  setHtml(".panel-note", "panel.tumblersNote");

  setMapLabel(".map-callout--lock1 .map-label-text", "map.lock1");
  setMapLabel(".map-callout--notch .map-label-text", "map.notch");
  setMapLabel(".map-callout--lock5 .map-label-text", "map.lock6");
  setMapLabel(".map-label-text--callout", "map.turnOnce");

  const solveBtn = document.getElementById("solve-btn");
  if (solveBtn) solveBtn.textContent = t("solve.cta");
}
