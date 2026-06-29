export const SolveCoachmarkTrigger = Object.freeze({
  SHOW: "show",
  DEFER: "defer",
  NONE: "none",
});

export function resolveSolveCoachmarkTrigger({
  landingCold,
  justBecameMapped,
  tourActive,
  mapped,
}) {
  if (!justBecameMapped || !mapped || !landingCold) return SolveCoachmarkTrigger.NONE;
  if (tourActive) return SolveCoachmarkTrigger.DEFER;
  return SolveCoachmarkTrigger.SHOW;
}
