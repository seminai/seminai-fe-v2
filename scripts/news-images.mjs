import sharp from "sharp";
import { readdirSync, existsSync } from "node:fs";
for (const name of readdirSync("public/news").filter(
  (file) => file.endsWith(".webp") && !/-\d+\.webp$/.test(file),
)) {
  for (const width of [320, 640]) {
    const target = `public/news/${name.replace(".webp", `-${width}.webp`)}`;
    if (!existsSync(target))
      await sharp(`public/news/${name}`)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toFile(target);
  }
}
