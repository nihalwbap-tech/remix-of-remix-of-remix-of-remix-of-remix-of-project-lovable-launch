import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/coach/PagePlaceholder";

export const Route = createFileRoute("/coach/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — No More Copium" },
      { name: "description", content: "Coach dashboard in No More Copium." },
      { property: "og:title", content: "Dashboard — No More Copium" },
      {
        property: "og:description",
        content: "Coach dashboard in No More Copium.",
      },
    ],
  }),
  component: () => (
    <PagePlaceholder
      title="Dashboard"
      description="Coach dashboard features will be added in a future phase."
    />
  ),
});
