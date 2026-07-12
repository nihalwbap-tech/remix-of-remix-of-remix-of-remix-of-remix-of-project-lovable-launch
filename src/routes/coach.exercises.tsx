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

function ExerciseLibraryPage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Exercise Library</h1>
      <div className="mt-10 rounded-lg border border-dashed border-border p-10 text-center">
        <h2 className="text-base font-medium text-foreground">No exercises yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Exercises and tags will be added in the next exercise-library phase.
        </p>
      </div>
    </section>
  );
}
