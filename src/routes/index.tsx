import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pipeline Tracker" },
      { name: "description", content: "Track, work and report on your sales pipeline." },
      { property: "og:title", content: "Pipeline Tracker" },
      {
        property: "og:description",
        content: "Track, work and report on your sales pipeline.",
      },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/board" });
  },
  component: () => null,
});
