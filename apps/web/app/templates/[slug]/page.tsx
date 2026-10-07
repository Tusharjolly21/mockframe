"use client";

import { useEffect, useRef } from "react";
import { notFound, useParams, useSearchParams } from "next/navigation";
import type { MockupLayer } from "@framekit/scene";
import { EditorShell } from "@/components/editor/EditorShell";
import { decodeScreenAsset, encodeScreenAsset, type CodeDoc, type SocialPostDoc } from "@/lib/screens";
import { importPostUrl } from "@/lib/postImport";
import { useSceneStore } from "@/lib/store";
import { makeTemplateScene, templateBySlug } from "@/lib/screenTemplates";
import { appTemplateBySlug, makeAppScreenScene } from "@/lib/appScreenTemplates";
import { premiumTemplateBySlug } from "@/lib/premiumTemplates";

/**
 * /templates/<slug> — opens the editor pre-loaded with one template card
 * (Code / Bluesky post / X post) as a fresh scene.
 */
export default function TemplateSlugPage() {
  const params = useParams<{ slug: string }>();
  const search = useSearchParams();
  const meta = templateBySlug(params.slug);
  const appTemplate = meta ? undefined : appTemplateBySlug(params.slug);
  const premium = meta || appTemplate ? undefined : premiumTemplateBySlug(params.slug);
  const loaded = useRef(false);

  // premium layouts: a complete composition (Pro ones are gated at export)
  useEffect(() => {
    if (!premium || loaded.current) return;
    loaded.current = true;
    useSceneStore.setState({ scene: premium.build() });
    useSceneStore.temporal.getState().clear();
    if (premium.pro) {
      // after the editor has mounted its toast host (no cleanup: the load guard
      // above means a StrictMode re-run would never schedule it again)
      setTimeout(
        () => window.dispatchEvent(new CustomEvent("framekit:toast", { detail: `${premium.name} is a Pro layout — edit freely, export with Pro` })),
        900
      );
    }
  }, [premium]);

  // app screenshot templates: a phone + editable app screen + headline
  useEffect(() => {
    if (!appTemplate || loaded.current) return;
    loaded.current = true;
    useSceneStore.setState({ scene: makeAppScreenScene(appTemplate) });
    useSceneStore.temporal.getState().clear();
  }, [appTemplate]);

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

    const postUrl = meta.app === "social" ? search.get("url")?.slice(0, 2_000) : undefined;
    if (postUrl) {
      void importPostUrl(postUrl).then((fields) => {
        if (useSceneStore.getState().scene.id !== scene.id) return;
        useSceneStore.getState().updateLayer("layer-template", (item) => {
          if (item.type !== "mockup" || !item.media) return item;
          const post = decodeScreenAsset(item.media.assetId);
          if (post?.app !== "social") return item;
          return {
            ...item,
            media: {
              ...item.media,
              assetId: encodeScreenAsset({ ...post, ...fields, standalone: true } as SocialPostDoc),
            },
          };
        });
      }).catch(() => {
        // Keep the editable starter card visible; the URL remains available in
        // the Screen Studio importer so the user can retry or correct it.
      });
    }
  }, [meta, search]);

  if (!meta && !appTemplate && !premium) return notFound();
  return <EditorShell fromTemplate />;
}
