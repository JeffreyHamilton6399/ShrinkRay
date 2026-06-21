/** Mobile device detection for performance safeguards. */

export function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || (navigator.maxTouchPoints > 1 && window.innerWidth < 768)
  );
}

export function isLowMemoryDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  // @ts-expect-error - deviceMemory is non-standard but widely supported
  const mem = navigator.deviceMemory;
  if (mem) return mem <= 4; // 4GB or less = low memory
  return isMobile(); // fallback: assume mobile = low memory
}

/** Max video file size we'll attempt on this device (bytes). */
export function maxVideoSize(): number {
  if (isLowMemoryDevice()) return 100 * 1024 * 1024; // 100MB on mobile
  return 500 * 1024 * 1024; // 500MB on desktop
}
