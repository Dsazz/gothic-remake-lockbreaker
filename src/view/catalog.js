// Catalog browse overlay: search, place filter, lock list, replace confirm.
// While open, filter re-renders patch in place so the search input keeps focus.

import { t, tCount } from "../i18n/index.js";
import { Key } from "../keyboard-keys.js";
import { el, searchSvg, navChevronSvg } from "./dom.js";
import { trapFocus } from "./overlays.js";

const OVERLAY_ID = "catalog-overlay";
let keyListener = null;
/** @type {{ ui: object, handlers: object } | null} */
let session = null;

function clearKeys() {
  if (!keyListener) return;
  document.removeEventListener("keydown", keyListener);
  keyListener = null;
}

function dismissCatalog() {
  if (!session) return;
  const { ui, handlers } = session;
  if (ui.replaceConfirmOpen) handlers.onCancelCatalogReplace?.();
  else handlers.onCloseCatalog?.();
}

function renderPlaceOptions(ui) {
  return [
    el("option", { value: "", text: t("catalog.allPlaces") }),
    ...ui.places.map((place) => el("option", { value: place, text: place })),
  ];
}

function renderPlaceSelect(ui, handlers) {
  const select = el(
    "select",
    {
      class: "catalog-place-select",
      "aria-label": t("catalog.placeFilterAria"),
      onChange: (e) => handlers.onCatalogPlace?.(e.target.value),
    },
    renderPlaceOptions(ui),
  );
  select.value = ui.place ?? "";
  return select;
}

function renderFiltersRow(ui, handlers) {
  return el("div", { class: "catalog-filters-row" }, [
    el("input", {
      class: "catalog-search",
      type: "search",
      placeholder: t("catalog.searchPlaceholder"),
      value: ui.query ?? "",
      "aria-label": t("catalog.searchPlaceholder"),
      onInput: (e) => handlers.onCatalogQuery?.(e.target.value),
    }),
    renderPlaceSelect(ui, handlers),
  ]);
}

function renderResultCount(ui) {
  if (ui.loading || ui.loadError) return null;
  return el("p", {
    class: "catalog-result-count",
    text: tCount("catalog.resultCount", ui.entries.length),
  });
}

function renderListBody(ui, handlers) {
  if (ui.loading && !ui.entries.length) {
    return el("p", { class: "catalog-status", text: t("catalog.loading") });
  }
  if (ui.loadError) {
    return el("div", { class: "catalog-status-block" }, [
      el("p", { class: "catalog-status catalog-status--error", text: t("catalog.loadError") }),
      el("button", {
        class: "pill",
        type: "button",
        text: t("catalog.retry"),
        onClick: () => handlers.onRetryCatalogLoad?.(),
      }),
    ]);
  }
  if (!ui.entries.length) {
    const children = [el("p", { class: "catalog-status", text: t("catalog.empty") })];
    if (ui.query || ui.place) {
      children.push(
        el("button", {
          class: "pill pill-ghost",
          type: "button",
          text: t("catalog.clearFilters"),
          onClick: () => handlers.onClearCatalogFilters?.(),
        }),
      );
    }
    return el("div", { class: "catalog-status-block" }, children);
  }
  return el(
    "ul",
    { class: "catalog-list", role: "listbox", "aria-label": t("catalog.listLabel") },
    ui.entries.map((entry) =>
      el("li", { class: "catalog-item" }, [
        el(
          "button",
          {
            class: "catalog-item-btn",
            type: "button",
            onClick: () => handlers.onSelectCatalogLock(entry.id),
          },
          [
            el("span", { class: "catalog-item-copy" }, [
              el("span", { class: "catalog-item-name", text: entry.name }),
              el("span", { class: "catalog-item-place", text: entry.place }),
            ]),
            el("span", { class: "catalog-item-chevron", "aria-hidden": "true" }, [
              navChevronSvg("forward"),
            ]),
          ],
        ),
      ]),
    ),
  );
}

function renderReplaceConfirm(ui, handlers) {
  if (!ui.replaceConfirmOpen) return null;
  return el("div", { class: "catalog-replace-overlay" }, [
    el("div", { class: "catalog-replace-dialog", role: "alertdialog" }, [
      el("p", {
        class: "catalog-replace-copy",
        text: t("catalog.replaceConfirm", { name: ui.pendingName || "" }),
      }),
      el("div", { class: "catalog-replace-actions" }, [
        el("button", {
          class: "pill pill-ghost",
          type: "button",
          text: t("confirm.cancel"),
          onClick: () => handlers.onCancelCatalogReplace?.(),
        }),
        el("button", {
          class: "pill",
          type: "button",
          text: t("catalog.replace"),
          onClick: () => handlers.onConfirmCatalogReplace?.(),
        }),
      ]),
    ]),
  ]);
}

function bindKeys(host) {
  clearKeys();
  const sheet = host.querySelector(".catalog-sheet");
  keyListener = (e) => {
    if (e.key === Key.ESCAPE) {
      dismissCatalog();
      return;
    }
    if (sheet) trapFocus(sheet, e);
  };
  document.addEventListener("keydown", keyListener);
}

function patchCatalogOverlay(host, ui, handlers) {
  session = { ui, handlers };

  const select = host.querySelector(".catalog-place-select");
  if (select) {
    select.replaceChildren(...renderPlaceOptions(ui));
    select.value = ui.place ?? "";
  }

  const countHost = host.querySelector(".catalog-result-count");
  const nextCount = renderResultCount(ui);
  if (countHost && nextCount) {
    countHost.textContent = nextCount.textContent;
  } else if (countHost && !nextCount) {
    countHost.remove();
  } else if (!countHost && nextCount) {
    const body = host.querySelector(".catalog-body");
    body?.before(nextCount);
  }

  const bodyHost = host.querySelector(".catalog-body");
  if (bodyHost) bodyHost.replaceChildren(renderListBody(ui, handlers));

  const search = host.querySelector(".catalog-search");
  const query = ui.query ?? "";
  if (search && document.activeElement !== search && search.value !== query) {
    search.value = query;
  }

  const existingConfirm = host.querySelector(".catalog-replace-overlay");
  const nextConfirm = renderReplaceConfirm(ui, handlers);
  if (existingConfirm && nextConfirm) existingConfirm.replaceWith(nextConfirm);
  else if (existingConfirm) existingConfirm.remove();
  else if (nextConfirm) host.append(nextConfirm);

  bindKeys(host);
}

function mountCatalogOverlay(ui, handlers) {
  session = { ui, handlers };

  const sheetChildren = [
    el("div", { class: "catalog-sheet-head" }, [
      el("h2", { id: "catalog-sheet-title", class: "catalog-sheet-title" }, [
        el("span", { class: "catalog-sheet-title-icon", "aria-hidden": "true" }, [searchSvg()]),
        el("span", { class: "catalog-sheet-title-text", text: t("catalog.title") }),
      ]),
      el("button", {
        class: "catalog-sheet-close",
        type: "button",
        "aria-label": t("common.close"),
        text: "×",
        onClick: () => dismissCatalog(),
      }),
    ]),
    renderFiltersRow(ui, handlers),
  ];
  const count = renderResultCount(ui);
  if (count) sheetChildren.push(count);
  sheetChildren.push(el("div", { class: "catalog-body" }, [renderListBody(ui, handlers)]));

  const sheet = el(
    "div",
    {
      class: "catalog-sheet",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "catalog-sheet-title",
    },
    sheetChildren,
  );

  const children = [
    el("button", {
      class: "catalog-backdrop",
      type: "button",
      "aria-label": t("common.close"),
      onClick: () => dismissCatalog(),
    }),
    sheet,
  ];
  const confirm = renderReplaceConfirm(ui, handlers);
  if (confirm) children.push(confirm);

  const host = el("div", { id: OVERLAY_ID, class: "catalog-overlay" }, children);
  document.body.append(host);
  document.body.classList.add("catalog-open");
  bindKeys(host);
  requestAnimationFrame(() => {
    host.querySelector(".catalog-search")?.focus();
  });
}

function restoreBrowseFocus() {
  document.getElementById("browse-locks-btn")?.focus();
}

export function renderCatalogOverlay(ui, handlers) {
  const existing = document.getElementById(OVERLAY_ID);

  if (!ui?.open) {
    const wasOpen = Boolean(existing);
    clearKeys();
    session = null;
    existing?.remove();
    document.body.classList.remove("catalog-open");
    if (wasOpen) restoreBrowseFocus();
    return;
  }

  if (existing) {
    patchCatalogOverlay(existing, ui, handlers);
    return;
  }

  mountCatalogOverlay(ui, handlers);
}

export function renderCatalogBadge(container, state) {
  if (!container) return;
  if (!state?.catalogId) {
    container.replaceChildren();
    container.hidden = true;
    return;
  }
  container.hidden = false;
  container.replaceChildren(
    el(
      "div",
      {
        class: "catalog-badge",
        "aria-label": t("catalog.badgeAria"),
      },
      [
        el("span", { class: "catalog-badge-name", text: state.catalogName }),
        el("span", { class: "catalog-badge-place", text: state.catalogPlace }),
      ],
    ),
  );
}
