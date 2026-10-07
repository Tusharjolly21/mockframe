"use client";

import { useEffect, useRef } from "react";
import { notFound, useParams, useSearchParams } from "next/navigation";
import { createId } from "@framekit/scene";
import { EditorShell } from "@/components/editor/EditorShell";
import { track } from "@/lib/analytics";
import { fillWithMyShots, useMyShots } from "@/lib/myShots";
import { useSceneStore } from "@/lib/store";
import { useShotBatchStore } from "@/lib/shotBatch";
import { buildStoreSet, storeSetBySlug, type StorePlatform } from "@/lib/storeSets";

/**
 * /templates/sets/<set>?device=ios|android — opens the editor with a store
 * listing set loaded as an eight-shot batch: the filmstrip under the canvas
 * switches shots, and the whole set exports as one ZIP.
 */
export default function StoreSetPage() {
  const params = useParams<{ set: string }>();
  const search = useSearchParams();
  const set = storeSetBySlug(params.set);
  const platform: StorePlatform = search.get("device") === "android" ? "android" : "ios";
  const startAt = Math.min(8, Math.max(1, Number(search.get("shot")) || 1)) - 1;
  const loaded = useRef(false);
  const mine = search.get("mine") === "1";

  // runs after EditorShell's own mount effect (children first), so the batch
  // it seeded with a blank shot is replaced by the set
  useEffect(() => {
    if (!set || loaded.current) return;
    loaded.current = true;
    const shots = buildStoreSet(set, platform).map((shot) => ({ id: createId(), name: shot.name, scene: shot.scene }));
    const first = shots[Math.min(startAt, shots.length - 1)];
    useShotBatchStore.setState({ shots, activeId: first.id });
    useSceneStore.setState({ scene: first.scene });
    useSceneStore.temporal.getState().clear();
    window.dispatchEvent(new CustomEvent("framekit:fit"));

    // ?mine=1: the gallery showed this set with your screenshots, so open it that way
    if (!mine) return;
    void fillWithMyShots(shots.map((s) => s.scene)).then(({ scenes, filled }) => {
      const batch = useShotBatchStore.getState();
      if (!filled || batch.shots[0]?.id !== shots[0].id || useSceneStore.getState().scene.id !== first.scene.id) return;
      const next = shots.map((s, i) => ({ ...s, scene: scenes[i] }));
      useShotBatchStore.setState({ shots: next });
      useSceneStore.setState({ scene: next.find((s) => s.id === first.id)!.scene });
      useSceneStore.temporal.getState().clear();
      track("template_opened_with_shots", { template: `set:${set.slug}`, filled });
      setTimeout(
        () => window.dispatchEvent(new CustomEvent("framekit:toast", { detail: useMyShots.getState().shots.length === 1 ? "Your screenshot is in all eight shots" : "Your screenshots are in all eight shots" })),
        400
      );
    });
  }, [set, platform, startAt, mine]);

  if (!set) return notFound();
  return <EditorShell fromTemplate />;
}
