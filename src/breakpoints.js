// Shared responsive breakpoints. Cross-cutting constants used by onboarding,
// view, and controllers — the single source for both the pixel values and the
// ready-to-use matchMedia query strings, so no call site rebuilds a template.

export const MOBILE_BREAKPOINT = 768;
export const DESKTOP_SEQUENCE_BREAKPOINT = 900;

export const MOBILE_MEDIA = `(max-width: ${MOBILE_BREAKPOINT}px)`;
export const DESKTOP_SEQUENCE_MEDIA = `(min-width: ${DESKTOP_SEQUENCE_BREAKPOINT}px)`;
