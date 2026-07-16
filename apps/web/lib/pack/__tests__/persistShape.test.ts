import { describe, expect, it } from "vitest";
import { packAssetIds } from "../persistShape";
import { createPack, createPackScreen } from "../schema";

describe("packAssetIds", () => {
  it("collects screen assets and image-background override, skipping nulls", () => {
    const pack = createPack();
    pack.screens = [createPackScreen("a1"), createPackScreen(), createPackScreen("a2")];
    pack.style.background = { type: "image", assetId: "bg1", fit: "cover", blur: 0, opacity: 1 };
    expect(packAssetIds(pack)).toEqual(["a1", "a2", "bg1"]);
  });

  it("non-image backgrounds contribute nothing", () => {
    const pack = createPack();
    pack.screens = [createPackScreen("a1")];
    expect(packAssetIds(pack)).toEqual(["a1"]);
  });
});
