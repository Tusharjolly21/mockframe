"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AuthModal } from "./AuthModal";

/**
 * Header account control: "Sign in" for guests, avatar + menu (email, sign out)
 * for a real account. Hidden entirely when Firebase auth isn't configured.
 */
export function AccountButton() {
  const { configured, loading, account, signOut } = useAuth();
  const [modal, setModal] = useState(false);
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menu]);

  if (!configured || loading) return null;

  if (!account) {
    return (
      <>
        <button
          onClick={() => setModal(true)}
          className="fk-press ml-0.5 rounded-lg bg-[#17171c] px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-black"
        >
          Sign in
        </button>
        {modal && <AuthModal onClose={() => setModal(false)} />}
      </>
    );
  }

  const label = account.name || account.email || "Account";
  const initial = (account.name || account.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative ml-0.5">
      <button
        onClick={() => setMenu((v) => !v)}
        title={label}
        className="fk-press grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 text-[12px] font-bold text-white"
      >
        {account.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={account.photo} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          initial
        )}
      </button>
      {menu && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-[70] w-56 overflow-hidden rounded-xl border border-[#ececf2] bg-white py-1 shadow-xl">
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f0f0f5] text-[#8a8a94]">
              <UserIcon size={15} />
            </span>
            <div className="min-w-0">
              {account.name && <p className="truncate text-[12.5px] font-semibold text-[#17171c]">{account.name}</p>}
              <p className="truncate text-[11.5px] text-[#8a8a94]">{account.email}</p>
            </div>
          </div>
          <div className="my-1 h-px bg-[#f0f0f3]" />
          <button
            onClick={async () => {
              setMenu(false);
              await signOut();
            }}
            className="fk-press flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] font-medium text-[#4a4a55] hover:bg-black/[0.04]"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
