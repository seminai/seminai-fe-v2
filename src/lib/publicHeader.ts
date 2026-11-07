/** Keep the divider absent at the top without changing the header's geometry. */
export function bindHeaderScroll(header: HTMLElement): () => void {
  const update = () => {
    header.dataset.scrolled = String(window.scrollY > 0);
  };
  update();
  window.addEventListener("scroll", update, { passive: true });
  return () => window.removeEventListener("scroll", update);
}
