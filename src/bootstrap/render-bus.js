// Owns the late-bound render dispatch + handler registry so the composition root
// carries one stable handle instead of three mutable `let`s (renderAll,
// renderLocaleChrome, handlers). The init cycle is real — the renderer is built
// from the controllers, which in turn must be able to trigger renders — so the
// real targets are injected once via connect() after they exist. Until then the
// dispatchers are inert no-ops, exactly as before.

export function createRenderBus() {
  let renderAll = () => {};
  let renderLocaleChrome = () => {};
  let handlers = {};

  return {
    getHandlers: () => handlers,
    all: (state) => renderAll(state),
    localeChrome: () => renderLocaleChrome(),
    connect(targets) {
      if (targets.renderAll) renderAll = targets.renderAll;
      if (targets.renderLocaleChrome) renderLocaleChrome = targets.renderLocaleChrome;
      if (targets.handlers) handlers = targets.handlers;
    },
  };
}
