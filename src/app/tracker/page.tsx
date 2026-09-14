import type { Metadata } from "next";
import { TrackerBoard } from "@/components/tracker-board";

export const metadata: Metadata = {
  title: "Outreach tracker",
};

export default function TrackerPage() {
  return <TrackerBoard />;
}
