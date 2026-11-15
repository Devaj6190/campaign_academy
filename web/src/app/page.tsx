"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { DecisionCard, useTicker } from "@/components/Clock";
import { Paper, PaperNotice } from "@/components/Paper";
import { Sidebar } from "@/components/Sidebar";
import { Toasts } from "@/components/Toasts";
import { TopBar } from "@/components/TopBar";
import { startSaving } from "@/lib/save";
import { useGame } from "@/lib/store";
import { CaseView } from "@/views/CaseView";
import { MapView } from "@/views/MapView";
import { Profile } from "@/views/Profile";
import { VoterGroups } from "@/views/VoterGroups";
import { WarRoom } from "@/views/WarRoom";

// Every screen reads the current case. The War room is the live staff: real agents (lib/staff) whose work lands on
// the case as a layer over the student's decisions. The clock (lib/cases/clock) runs between decisions and stops at each one.
const VIEWS = { case: CaseView, profile: Profile, war: WarRoom, map: MapView, factions: VoterGroups };

export default function Home() {
  const view = useGame((s) => s.view);
  const View = VIEWS[view];
  // The saved campaign loads before the clock and the staff watchers start (they mount in useTicker), then keeps saving.
  useEffect(() => startSaving(), []);
  useTicker();

  return (
    <div className="grid h-full grid-rows-[56px_minmax(0,1fr)]">
      <TopBar />
      <div className="flex min-h-0">
        <Sidebar />
        <main className="relative min-w-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={view} className="absolute inset-0" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
              <View />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <Paper />
      <PaperNotice />
      <DecisionCard />
      <Toasts />
    </div>
  );
}
