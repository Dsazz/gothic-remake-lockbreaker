/** @returns {{ wasMapped: boolean, justBecameMapped: boolean }} */
export function advanceMappedTracking(previousWasMapped, isMappedNow) {
  return {
    wasMapped: isMappedNow,
    justBecameMapped: isMappedNow && !previousWasMapped,
  };
}
