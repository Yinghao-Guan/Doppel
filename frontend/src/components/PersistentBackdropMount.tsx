"use client";

import dynamic from "next/dynamic";

const PersistentBackdrop = dynamic(
  () =>
    import("@/components/PersistentBackdrop").then(
      (m) => m.PersistentBackdrop,
    ),
  { ssr: false },
);

export default function PersistentBackdropMount() {
  return <PersistentBackdrop />;
}
