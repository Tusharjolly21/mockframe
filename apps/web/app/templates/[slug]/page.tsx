"use client";

import { useEffect, useRef } from "react";
import { notFound, useParams } from "next/navigation";
import { EditorShell } from "@/components/editor/EditorShell";
import { useSceneStore } from "@/lib/store";
import { makeTemplateScene, templateBySlug } from "@/lib/screenTemplates";

/**
 * /templates/<slug> — opens the editor pre-loaded with one template card
 * (Code / Bluesky post / X post) as a fresh scene.
 */
export default function TemplateSlugPage() {
  const params = useParams<{ slug: string }>();
  const meta = templateBySlug(params.slug);
  const loaded = useRef(false);

  useEffect(() => {
    if (!meta || loaded.current) return;
    loaded.current = true;
    useSceneStore.setState({ scene: makeTemplateScene(meta) });
    // start this template's editing session with a clean undo history
    useSceneStore.temporal.getState().clear();
  }, [meta]);

  if (!meta) return notFound();
  return <EditorShell />;
}
