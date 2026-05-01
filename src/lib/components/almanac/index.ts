/**
 * Almanac primitives — Direction B (Family Almanac).
 *
 * Editorial typographic primitives used by surfaces that opt into the
 * almanac aesthetic via the `.dg-almanac` class on their layout root.
 *
 * The `.dg-almanac` class also re-binds shadcn's CSS variables, so existing
 * Button/Card/Input/etc. components automatically pick up the almanac
 * palette (cream paper, oxblood, deep forest, gold) and square corners
 * without a per-component fork. Use these primitives directly only for
 * editorial flourishes that shadcn doesn't cover (drop-caps, double rules,
 * chapter ornaments, money displays with the Fraunces tnum treatment).
 */
export { default as Eyebrow } from "./eyebrow.svelte";
export { default as ChapterNum } from "./chapter-num.svelte";
export { default as Rule } from "./rule.svelte";
export { default as DropCap } from "./drop-cap.svelte";
export { default as Plate } from "./plate.svelte";
export { default as MoneyDisplay } from "./money-display.svelte";
