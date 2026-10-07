"use client";

import { useCallback, useEffect, useState } from "react";

const FULL_EDITOR_KEY = "fk-mobile-gate-dismissed";

/**
 * Phones get the phone editor; everything else (and a phone that asked for
 * the full editor this session) gets the full one. null until we know, so a
 * phone never flashes the desktop panels.
 */
export function usePhoneMode(embedded: boolean): { phone: boolean | null; openFullEditor: () => void } {
  const [phone, setPhone] = useState<boolean | null>(null);

  useEffect(() => {
    let full = embedded;
    try {
      full ||= !!sessionStorage.getItem(FULL_EDITOR_KEY);
    } catch {
      /* storage blocked */
    }
    const small = window.matchMedia("(max-width: 767px)").matches;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    setPhone(!full && small && touch);
  }, [embedded]);

  const openFullEditor = useCallback(() => {
    try {
      sessionStorage.setItem(FULL_EDITOR_KEY, "1");
    } catch {
      /* storage blocked */
    }
    setPhone(false);
  }, []);

  return { phone, openFullEditor };
}
