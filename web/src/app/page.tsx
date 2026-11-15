"use client";

import { AnimatePresence, motion } from "motion/react";
import { Overlays } from "@/components/Overlays";
import { Paper } from "@/components/Paper";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useGame } from "@/lib/store";
import { CaseView } from "@/views/CaseView";
import { MapView } from "@/views/MapView";
import { Profile } from "@/views/Profile";
import { VoterGroups } from "@/views/VoterGroups";
import { WarRoom } from "@/views/WarRoom";

// Case, Profile, Map and Factions read the current case. The War room is the live staff: real agents (lib/staff)
// that still act on the first version's simulated race until they are wired to the case. Its dialogs are in Overlays.
// The game clock is not running; time moves when the student makes a decision.
const VIEWS = { case: CaseView, profile: Profile, war: WarRoom, map: MapView, factions: VoterGroups };

export default function Home() {
  const view = useGame((s) => s.view);
  const View = VIEWS[view];

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
      <Overlays />
    </div>
  );
}
