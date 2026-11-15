"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { useGame } from "@/lib/store";
import { Avatar } from "./ui";

// Staff speak up unprompted (lib/staff/speak). Their remark shows here for a few seconds; clicking it opens that
// post in the War room, where the remark and a suggested order are waiting. They stack in the empty lower part of the
// left sidebar (and in the same corner when the sidebar is hidden), so they cover nothing on the right.
export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  const staff = useGame((s) => s.staff);
  const dismiss = useGame((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed bottom-5 left-3 z-50 flex w-[232px] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const p = staff.find((x) => x.id === t.staff);
          if (!p) return null;
          return <ToastCard key={t.id} name={p.name ?? p.role} role={p.role} text={t.text} onClose={() => dismiss(t.id)} onOpen={() => { dismiss(t.id); useGame.setState((s) => ({ view: "war", person: t.staff, unread: { ...s.unread, [t.staff]: false } })); }} />;
        })}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({ name, role, text, onClose, onOpen }: { name: string; role: string; text: string; onClose: () => void; onOpen: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 9000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-auto flex cursor-pointer gap-3 rounded-xl border border-line-strong bg-raised p-3 shadow-[0_18px_44px_-14px_rgba(0,0,0,0.9)]"
      onClick={onOpen}
    >
      <Avatar name={name} size={32} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2"><span className="shrink-0 text-[13px] font-medium whitespace-nowrap">{name}</span>{role !== name && <span className="truncate text-[11px] text-faint">{role}</span>}</div>
        <p className="mt-0.5 text-[12.5px] leading-snug text-soft">{text}</p>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="Dismiss" className="grid size-5 shrink-0 place-items-center rounded text-faint transition-colors hover:text-fg"><X className="size-3.5" /></button>
    </motion.div>
  );
}
