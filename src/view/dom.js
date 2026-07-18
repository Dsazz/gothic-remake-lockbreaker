// View primitives: framework-free element + SVG builders. No domain logic, no
// i18n, no storage — just DOM construction shared across the view modules.

export function el(tag, props = {}, children = []) {
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

const ARROW_PATH = {
  right: "M2 10 H11 V6 L22 12 L11 18 V14 H2 Z",
  left: "M22 10 H13 V6 L2 12 L13 18 V14 H22 Z",
};

export function arrowSvg(isRight) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", isRight ? ARROW_PATH.right : ARROW_PATH.left);
  svg.append(path);
  return svg;
}

export function openLockSvg() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  const shackle = document.createElementNS(ns, "path");
  shackle.setAttribute("class", "wt-lock-shackle");
  shackle.setAttribute("d", "M7 11V7a5 5 0 0 1 9.9-1");
  const body = document.createElementNS(ns, "rect");
  body.setAttribute("x", "4");
  body.setAttribute("y", "11");
  body.setAttribute("width", "16");
  body.setAttribute("height", "10");
  body.setAttribute("rx", "2");
  const keyhole = document.createElementNS(ns, "path");
  keyhole.setAttribute("d", "M12 15v2.5");
  svg.append(shackle, body, keyhole);
  return svg;
}

/** Magnifying glass — Browse locks / catalog search affordance. */
export function searchSvg() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  const lens = document.createElementNS(ns, "circle");
  lens.setAttribute("cx", "11");
  lens.setAttribute("cy", "11");
  lens.setAttribute("r", "7");
  const handle = document.createElementNS(ns, "path");
  handle.setAttribute("d", "M20 20 L16.5 16.5");
  svg.append(lens, handle);
  return svg;
}

/** Circular arrows — Reset lock affordance (mobile icon-only + desktop leading mark). */
export function resetSvg() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  const arc = document.createElementNS(ns, "path");
  arc.setAttribute("d", "M3 12a9 9 0 1 0 3-6.7");
  const tip = document.createElementNS(ns, "path");
  tip.setAttribute("d", "M3 4v5h5");
  svg.append(arc, tip);
  return svg;
}

export function iconBtn({ label, className = "", onClick, disabled, svg }) {
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

export function navChevronSvg(dir) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", dir === "back" ? "M14 6 L8 12 L14 18 Z" : "M10 6 L16 12 L10 18 Z");
  svg.append(path);
  return svg;
}

export function toolIconSvg(kind) {
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

export function keyboardIconSvg() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.6");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  const body = document.createElementNS(ns, "rect");
  body.setAttribute("x", "2");
  body.setAttribute("y", "6");
  body.setAttribute("width", "20");
  body.setAttribute("height", "12");
  body.setAttribute("rx", "2");
  const keys = document.createElementNS(ns, "path");
  keys.setAttribute(
    "d",
    "M6 9.5h.01M10 9.5h.01M14 9.5h.01M18 9.5h.01M6 12.5h.01M10 12.5h.01M14 12.5h.01M18 12.5h.01M8 15.5h8",
  );
  svg.append(body, keys);
  return svg;
}

export function infoIconSvg() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", "12");
  circle.setAttribute("cy", "12");
  circle.setAttribute("r", "10");
  const stem = document.createElementNS("http://www.w3.org/2000/svg", "path");
  stem.setAttribute("d", "M12 16v-4");
  const dot = document.createElementNS("http://www.w3.org/2000/svg", "path");
  dot.setAttribute("d", "M12 8h.01");
  svg.append(circle, stem, dot);
  return svg;
}

export function dismissCrossSvg() {
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

export function ackCheckSvg() {
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
