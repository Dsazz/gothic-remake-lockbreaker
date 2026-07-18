const LOCK_QUERY = "lock";

export function readLockQueryId(search = globalThis.location?.search ?? "") {
  try {
    return new URLSearchParams(search).get(LOCK_QUERY);
  } catch {
    return null;
  }
}

export function writeLockQueryId(id) {
  try {
    const url = new URL(globalThis.location.href);
    url.searchParams.set(LOCK_QUERY, id);
    globalThis.history?.replaceState?.(null, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // ignore
  }
}

export function clearLockQueryId() {
  try {
    const url = new URL(globalThis.location.href);
    if (!url.searchParams.has(LOCK_QUERY)) return;
    url.searchParams.delete(LOCK_QUERY);
    const search = url.searchParams.toString();
    globalThis.history?.replaceState?.(
      null,
      "",
      `${url.pathname}${search ? `?${search}` : ""}${url.hash}`,
    );
  } catch {
    // ignore
  }
}
