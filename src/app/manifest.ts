import type { MetadataRoute } from "next";
import { site } from "@/lib/content";
import { defaultDescription } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.shortName,
    short_name: "NIT JSR Intern",
    description: defaultDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1b5e20",
    lang: "en-IN",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/nitjsrlogo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
