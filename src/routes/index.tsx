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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  component: () => null,
});
