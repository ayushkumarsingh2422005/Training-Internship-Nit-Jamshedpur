import type { MetadataRoute } from "next";
import { studentPortalPath } from "@/lib/content";
import { getPublishedNotices } from "@/lib/notices";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

const staticRoutes: MetadataRoute.Sitemap = [
  {
    url: getSiteUrl(),
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    url: `${getSiteUrl()}/about`,
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    url: `${getSiteUrl()}/program`,
    changeFrequency: "monthly",
    priority: 0.85,
  },
  {
    url: `${getSiteUrl()}/notices`,
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    url: `${getSiteUrl()}/winners`,
    changeFrequency: "weekly",
    priority: 0.8,
  },
  {
    url: `${getSiteUrl()}${studentPortalPath}`,
    changeFrequency: "weekly",
    priority: 0.95,
  },
  {
    url: `${getSiteUrl()}/contact`,
    changeFrequency: "monthly",
    priority: 0.75,
  },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();

  try {
    const notices = await getPublishedNotices();
    const latestNoticeDate = notices[0]?.date ? new Date(notices[0].date) : new Date();

    return staticRoutes.map((entry) => {
      if (entry.url === `${base}/notices`) {
        return { ...entry, lastModified: latestNoticeDate };
      }
      return entry;
    });
  } catch {
    return staticRoutes;
  }
}
