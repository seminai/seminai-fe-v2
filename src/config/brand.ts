import logo96Url from "@/assets/landing/logo-96.webp";
import logo192Url from "@/assets/landing/logo-192.webp";

/** Both build systems expose the same asset: Vite returns a URL, Astro returns image metadata. */
function imageUrl(asset: string | { src: string }): string {
  return typeof asset === "string" ? asset : asset.src;
}

export const APP_LOGO_URL = imageUrl(logo96Url);
export const APP_LOGO_SRCSET = `${imageUrl(logo96Url)} 1x, ${imageUrl(logo192Url)} 2x`;
