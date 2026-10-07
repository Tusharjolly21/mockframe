import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const persisted: { id: string; cloud: boolean; local: boolean; updatedAt: number }[] = [];

vi.mock("../assets", () => ({ collectAssets: () => [], restoreAssets: () => {} }));
vi.mock("../drafts", async () => {
  const { create } = await import("zustand");
  type S = {
    currentId: string | null;
    currentName: string | null;
    epoch: number;
    saveState: string;
    savedAt: number | null;
    setCurrent: (id: string | null, name?: string | null) => void;
    setSaveState: (s: string, at?: number) => void;
  };
  const useDraftsUi = create<S>()((set) => ({
    currentId: null,
    currentName: null,
    epoch: 0,
    saveState: "idle",
    savedAt: null,
    setCurrent: (currentId, currentName = null) => set((s) => ({ currentId, currentName, epoch: s.epoch + 1 })),
    setSaveState: (saveState, savedAt) => set((s) => ({ saveState, savedAt: savedAt ?? s.savedAt })),
  }));
  return {
    useDraftsUi,
    captureThumbnail: async () => "thumb",
    defaultDraftName: () => "Draft",
    sceneAssetIds: () => [],
    openDraft: (r: { scene: unknown }) => r.scene,
    persistDraft: async (r: { id: string; updatedAt: number }, o: { cloud?: boolean; local?: boolean } = {}) => {
      persisted.push({ id: r.id, updatedAt: r.updatedAt, cloud: o.cloud ?? true, local: o.local ?? true });
      return r;
    },
  };
});

// minimal browser globals for the page-hide listeners
const target = new EventTarget();
vi.stubGlobal("document", Object.assign(target, { visibilityState: "visible", querySelector: () => null }));
vi.stubGlobal("window", Object.assign(new EventTarget(), { dispatchEvent: () => true }));

const { startAutosave } = await import("../autosave");
const { useDraftsUi } = await import("../drafts");
const { sceneTemporal, useSceneStore } = await import("../store");

function edit() {
  useSceneStore.getState().setScene((s) => ({ ...s, canvas: { ...s.canvas, width: s.canvas.width + 1 } }));
}

describe("editor autosave", () => {
  let stop: () => void;
  beforeEach(() => {
    vi.useFakeTimers();
    persisted.length = 0;
    useSceneStore.getState().resetScene();
    sceneTemporal.getState().clear();
    useDraftsUi.setState({ currentId: null, currentName: null });
    stop = startAutosave();
  });
  afterEach(() => {
    stop();
    vi.useRealTimers();
  });

  it("does not save an untouched canvas", async () => {
    await vi.advanceTimersByTimeAsync(60_000);
    expect(persisted).toHaveLength(0);
    expect(useDraftsUi.getState().currentId).toBeNull();
  });

  it("creates one draft on the first edit and updates it in place after", async () => {
    edit();
    await vi.advanceTimersByTimeAsync(1500);
    const first = persisted.filter((p) => p.local);
    expect(first).toHaveLength(1);
    const id = useDraftsUi.getState().currentId;
    expect(id).toBe(first[0].id);
    expect(useDraftsUi.getState().saveState).toBe("saved");

    edit();
    await vi.advanceTimersByTimeAsync(1500);
    const locals = persisted.filter((p) => p.local);
    expect(locals).toHaveLength(2);
    expect(locals[1].id).toBe(id);
  });

  it("debounces a burst of edits into one write", async () => {
    for (let i = 0; i < 10; i++) {
      edit();
      await vi.advanceTimersByTimeAsync(200);
    }
    await vi.advanceTimersByTimeAsync(1500);
    expect(persisted.filter((p) => p.local)).toHaveLength(1);
  });

  it("mirrors to the cloud at most every 30 seconds, cloud-only", async () => {
    edit();
    await vi.advanceTimersByTimeAsync(1500);
    expect(persisted.filter((p) => !p.local)).toHaveLength(1); // first sync is immediate
    for (let i = 0; i < 5; i++) {
      edit();
      await vi.advanceTimersByTimeAsync(2000);
    }
    expect(persisted.filter((p) => !p.local)).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(30_000);
    const cloud = persisted.filter((p) => !p.local);
    expect(cloud).toHaveLength(2);
    expect(cloud.every((p) => p.cloud)).toBe(true);
  });

  it("treats a reset or an opened draft as a new baseline", async () => {
    edit();
    await vi.advanceTimersByTimeAsync(1500);
    persisted.length = 0;

    // Start over: reset then repoint to no draft — nothing should be written
    useSceneStore.getState().resetScene();
    useDraftsUi.getState().setCurrent(null);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(persisted).toHaveLength(0);

    // Opening a draft: the loaded scene isn't re-saved until it's edited
    useSceneStore.getState().setScene((s) => ({ ...s, id: "loaded" }));
    useDraftsUi.getState().setCurrent("draft-b", "B");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(persisted).toHaveLength(0);

    edit();
    await vi.advanceTimersByTimeAsync(1500);
    expect(persisted.filter((p) => p.local).map((p) => p.id)).toEqual(["draft-b"]);
  });

  it("writes a pending edit immediately when the tab is hidden", async () => {
    edit();
    await vi.advanceTimersByTimeAsync(100);
    expect(persisted).toHaveLength(0);
    Object.assign(document, { visibilityState: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.assign(document, { visibilityState: "visible" });
    await vi.advanceTimersByTimeAsync(0);
    expect(persisted.filter((p) => p.local)).toHaveLength(1);
  });
});
