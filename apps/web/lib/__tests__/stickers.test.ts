import { describe, expect, it } from "vitest";
import { SceneDocumentSchema, createScene } from "@framekit/scene";
import { parseLabelId } from "../../../../packages/renderer/src/annotations";
import { addAnnotation, addLabel } from "../sceneOps";

describe("label stickers", () => {
  it("parses kind and free text (dashes included)", () => {
    expect(parseLabelId("label-pill-New")).toEqual({ kind: "pill", text: "New" });
    expect(parseLabelId("label-burst-50% off - today")).toEqual({ kind: "burst", text: "50% off - today" });
    expect(parseLabelId("label-rating")).toEqual({ kind: "rating", text: "" });
  });

  it("adds a schema-valid label layer with its tint", () => {
    const { scene, layerId } = addLabel(createScene(), "laurel", "#1 App", "#d49b00");
    const layer = scene.layers.find((l) => l.id === layerId);
    expect(layer).toMatchObject({ type: "sticker", stickerId: "label-laurel-#1 App", tint: "#d49b00" });
    expect(SceneDocumentSchema.safeParse(scene).success).toBe(true);
  });
});

describe("annotations", () => {
  it("applies the picker accent to pointers and frames only", () => {
    const arrow = addAnnotation(createScene(), "annot-arrow-loop", "#0a84ff");
    expect(arrow.scene.layers.at(-1)).toMatchObject({ stickerId: "annot-arrow-loop", tint: "#0a84ff" });
    const redact = addAnnotation(createScene(), "annot-redact", "#0a84ff");
    expect(redact.scene.layers.at(-1)).toMatchObject({ tint: "#111114" });
  });

  it("gives sized annotations an editable footprint and seeds callout text", () => {
    const box = addAnnotation(createScene(), "annot-box");
    expect(box.scene.layers.at(-1)).toMatchObject({ size: { width: 440, height: 260 } });
    const callout = addAnnotation(createScene(), "annot-callout");
    expect(callout.scene.layers.at(-1)).toMatchObject({ stickerId: "annot-callout-New" });
  });
});
