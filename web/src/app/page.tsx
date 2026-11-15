"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { Overlays } from "@/components/Overlays";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useGame } from "@/lib/store";
import { Factions } from "@/views/Factions";
import { MapView } from "@/views/MapView";
import { Profile } from "@/views/Profile";
import { WarRoom } from "@/views/WarRoom";

// "case" belongs to the real-case screens (kept, not mounted); it falls back to Profile.
const VIEWS = { case: Profile, profile: Profile, war: WarRoom, map: MapView, factions: Factions };

export default function Home() {
  const view = useGame((s) => s.view);
  const View = VIEWS[view];

  useEffect(() => {
    // The campaign clock never stops; speed only changes how far each tick moves it.
    const clock = setInterval(() => useGame.getState().tick(), 250);
    const chatter = setInterval(() => useGame.getState().speak(), 50000);
    return () => { clearInterval(clock); clearInterval(chatter); };
  }, []);

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
      <Overlays />
    </div>
  );
}
