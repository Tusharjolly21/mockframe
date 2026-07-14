"use client";

import { useEffect, useRef } from "react";
import { notFound, useParams, useSearchParams } from "next/navigation";
import type { MockupLayer } from "@framekit/scene";
import { EditorShell } from "@/components/editor/EditorShell";
import { decodeScreenAsset, encodeScreenAsset, type CodeDoc } from "@/lib/screens";
import { useSceneStore } from "@/lib/store";
import { makeTemplateScene, templateBySlug } from "@/lib/screenTemplates";

/**
 * /templates/<slug> — opens the editor pre-loaded with one template card
 * (Code / Bluesky post / X post) as a fresh scene.
 */
export default function TemplateSlugPage() {
  const params = useParams<{ slug: string }>();
  const search = useSearchParams();
  const meta = templateBySlug(params.slug);
  const loaded = useRef(false);

  useEffect(() => {
    if (!meta || loaded.current) return;
    loaded.current = true;
    const scene = makeTemplateScene(meta);
    if (meta.app === "code") {
      const code = search.get("code")?.slice(0, 12_000);
      const language = search.get("language")?.slice(0, 30);
      const filename = search.get("filename")?.slice(0, 120);
      const layer = scene.layers.find((item): item is MockupLayer => item.type === "mockup");
      const doc = layer?.media ? decodeScreenAsset(layer.media.assetId) : undefined;
      if (layer?.media && doc?.app === "code" && code) {
        layer.media.assetId = encodeScreenAsset({ ...doc, code, language: language || doc.language, filename: filename || doc.filename } as CodeDoc);
      }
    }
    useSceneStore.setState({ scene });
    // start this template's editing session with a clean undo history
    useSceneStore.temporal.getState().clear();
  }, [meta, search]);

  if (!meta) return notFound();
  return <EditorShell />;
}
