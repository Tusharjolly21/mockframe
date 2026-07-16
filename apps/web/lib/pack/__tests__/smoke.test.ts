import { describe, expect, it } from "vitest";
import { createScene, SceneDocumentSchema } from "@framekit/scene";
import { getDevice } from "@framekit/devices";

describe("test infra", () => {
  it("resolves @framekit/scene and validates a factory scene", () => {
    const scene = createScene();
    expect(SceneDocumentSchema.safeParse(scene).success).toBe(true);
  });

  it("resolves the device registry", () => {
    expect(getDevice("iphone-16-pro-max")?.screen).toEqual({ width: 1320, height: 2868, cornerRadius: 168 });
  });
});
