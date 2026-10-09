"use client";

import { useEffect, useRef } from "react";
import { notFound, useParams, useSearchParams } from "next/navigation";
import type { MockupLayer, SceneDocument } from "@framekit/scene";
import { track } from "@/lib/analytics";
import { fillWithMyShots } from "@/lib/myShots";
import { EditorShell } from "@/components/editor/EditorShell";
import { decodeScreenAsset, encodeScreenAsset, fitCardScale, type CodeDoc, type SocialPostDoc } from "@/lib/screens";
import { importPostUrl } from "@/lib/postImport";
import { useSceneStore } from "@/lib/store";
import { CARD_LOOKS, makeTemplateScene, templateBySlug } from "@/lib/screenTemplates";
import { appTemplateBySlug, makeAppScreenScene } from "@/lib/appScreenTemplates";
import { premiumTemplateBySlug } from "@/lib/premiumTemplates";
import { setLiveBackground } from "@/lib/backgroundMotion";

const toast = (detail: string) => window.dispatchEvent(new CustomEvent("framekit:toast", { detail }));

/**
 * ?mine=1 (from the gallery, when it showed your screenshots): put them in
 * the template's screens once they're loaded, unless you've moved on.
 */
function swapInMyShots(scene: SceneDocument, slug: string) {
  void fillWithMyShots([scene]).then(({ scenes, filled }) => {
    if (!filled || useSceneStore.getState().scene.id !== scene.id) return;
    useSceneStore.setState({ scene: scenes[0] });
    useSceneStore.temporal.getState().clear();
    track("template_opened_with_shots", { template: slug, filled });
    setTimeout(() => toast(filled === 1 ? "Your screenshot is in" : "Your screenshots are in"), 400);
  });
}

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
  const mine = search.get("mine") === "1";

  // premium layouts: a complete composition (Pro ones are gated at export)
  useEffect(() => {
    if (!premium || loaded.current) return;
    loaded.current = true;
    const scene = premium.build();
    useSceneStore.setState({ scene });
    useSceneStore.temporal.getState().clear();
    if (mine) swapInMyShots(scene, premium.slug);
    // video templates bring their live background with them
    if (premium.video) setLiveBackground(premium.video.live);
    if (premium.pro) {
      // after the editor has mounted its toast host (no cleanup: the load guard
      // above means a StrictMode re-run would never schedule it again)
      const detail = premium.video
        ? `${premium.name} is a Pro video template — press Animate to preview it, export with Pro`
        : `${premium.name} is a Pro layout — edit freely, export with Pro`;
      setTimeout(() => window.dispatchEvent(new CustomEvent("framekit:toast", { detail })), 900);
    }
  }, [premium, mine]);

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
    if (mine && meta.deviceId) swapInMyShots(scene, meta.slug);

    const postUrl = meta.app === "social" ? search.get("url")?.slice(0, 2_000) : undefined;
    if (postUrl) {
      const starter = scene.layers.find((item): item is MockupLayer => item.id === "layer-template" && item.type === "mockup");
      const starterId = starter?.media?.assetId;
      setTimeout(() => toast("Importing the post…"), 300);
      void importPostUrl(postUrl).then((fields) => {
        const st = useSceneStore.getState();
        const layer = st.scene.layers.find((item): item is MockupLayer => item.id === "layer-template" && item.type === "mockup");
        if (st.scene.id !== scene.id || !layer?.media) return;
        if (layer.media.assetId !== starterId) {
          // the user started editing while it loaded — don't overwrite their work
          toast("Post loaded — paste the link in the Post URL panel to apply it");
          return;
        }
        const post = decodeScreenAsset(layer.media.assetId);
        if (post?.app !== "social") return;
        const assetId = encodeScreenAsset({ ...post, commentList: [], ...fields, standalone: true } as SocialPostDoc);
        const look = CARD_LOOKS.social;
        const scale = fitCardScale(assetId, st.scene.canvas.width, st.scene.canvas.height, look.fill);
        st.updateLayer("layer-template", (item) =>
          item.type !== "mockup" || !item.media
            ? item
            : { ...item, media: { ...item.media, assetId }, transform: { ...item.transform, scale: scale ?? item.transform.scale } }
        );
        toast(fields.name ? `Imported ${fields.name}'s post ✓` : "Imported the post ✓");
      }).catch((error: unknown) => {
        // keep the editable starter card, and remember the link so the Post URL
        // panel is prefilled for a retry
        toast(error instanceof Error ? error.message : "That post couldn't be imported");
        useSceneStore.getState().updateLayer("layer-template", (item) => {
          if (item.type !== "mockup" || !item.media || item.media.assetId !== starterId) return item;
          const post = decodeScreenAsset(item.media.assetId);
          if (post?.app !== "social") return item;
          return { ...item, media: { ...item.media, assetId: encodeScreenAsset({ ...post, sourceUrl: postUrl }) } };
        });
      });
    }
  }, [meta, search, mine]);

  if (!meta && !appTemplate && !premium) return notFound();
  return <EditorShell fromTemplate />;
}
