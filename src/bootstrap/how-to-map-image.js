const HOW_TO_MAP_IMAGE = "/assets/onboarding-game-lock.webp";

export function wireHowToMapImage() {
  const details = document.getElementById("how-to-map");
  const img = details?.querySelector(".how-to-map-visual img");
  if (!details || !img || img.dataset.lazyBound === "1") return;

  img.dataset.lazyBound = "1";

  const load = () => {
    if (img.src) return;
    img.src = HOW_TO_MAP_IMAGE;
  };

  if (details.open) load();
  details.addEventListener("toggle", () => {
    if (details.open) load();
  });
}
