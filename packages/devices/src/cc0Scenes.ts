import type { Device } from "./types";

/**
 * Photoreal photo-scene devices built from CC0 / free-commercial stock photos
 * (Pexels license: free for commercial use, modification allowed, no attribution
 * required, no "main element" restriction — so they are safe to embed and ship,
 * unlike Freepik/Pixeden PSDs). Each is an ORDINARY OPAQUE PHOTO, so the plate
 * uses `mode: "under"`: the screenshot is warped onto the screen `screenQuad`
 * and painted ON TOP of the photographed (blank/off) screen.
 *
 * To add one: drop the photo in apps/web/public/scenes/<id>/plate.jpg, mark the
 * 4 screen corners [TL,TR,BR,BL] in plate px, and add an entry here.
 */
export const CC0_SCENES: Device[] = [];
