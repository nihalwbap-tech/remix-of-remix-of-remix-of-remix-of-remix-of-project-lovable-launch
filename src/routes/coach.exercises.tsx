import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/coach/exercises")({
  head: () => ({
    meta: [
      { title: "Exercise Library — No More Copium" },
      {
        name: "description",
        content: "Exercise Library for coaches in No More Copium.",
      },
      { property: "og:title", content: "Exercise Library — No More Copium" },
      {
        property: "og:description",
        content: "Exercise Library for coaches in No More Copium.",
      },
    ],
  }),
  component: ExerciseLibraryPage,
});

import { ExerciseLibrary } from "@/components/coach/ExerciseLibrary";

function ExerciseLibraryPage() {
  return <ExerciseLibrary />;
}
