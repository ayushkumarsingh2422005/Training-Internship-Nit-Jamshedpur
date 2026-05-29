import type { Metadata } from "next";
import { site, siteLinks } from "@/lib/content";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";

export const defaultKeywords = [
  "NIT Jamshedpur internship",
  "NIT JSR industrial training",
  "DHTE Jharkhand internship",
  "Government Polytechnic Jharkhand training",
  "diploma internship NIT Jamshedpur",
  "Jharkhand polytechnic internship portal",
  "NIT Jamshedpur internship portal",
  "industrial training Jharkhand",
  "skill development NIT JSR",
  "internship notices NIT Jamshedpur",
] as const;

export const defaultDescription =
  "Official NIT Jamshedpur × DHTE Jharkhand portal for industrial training and internships. View notices, training modules, shortlist login, profile updates, and programme information for Government Polytechnic students.";

const ogImage = {
  url: "/nitjsrlogo.png",
  width: 512,
  height: 512,
  alt: "NIT Jamshedpur Internship Portal",
};

type PageMetadataOptions = {
  title: string;
  description?: string;
  path: string;
  keywords?: string[];
  noIndex?: boolean;
  /** Use for home page so the title template is not applied twice. */
  absoluteTitle?: boolean;
};

export function createPageMetadata({
  title,
  description = defaultDescription,
  path,
  keywords = [...defaultKeywords],
  noIndex = false,
  absoluteTitle = false,
}: PageMetadataOptions): Metadata {
  const url = absoluteUrl(path);
  const ogTitle = absoluteTitle ? title : `${title} | ${site.shortName}`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: ogTitle,
      description,
      url,
      siteName: site.shortName,
      locale: "en_IN",
      type: "website",
      images: [ogImage],
    },
    twitter: {
      card: "summary",
      title: ogTitle,
      description,
      images: [ogImage.url],
    },
    robots: noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
  };
}

export function rootMetadata(): Metadata {
  const siteUrl = getSiteUrl();
  const googleVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${site.title} | NIT Jamshedpur × DHTE Jharkhand`,
      template: `%s | ${site.shortName}`,
    },
    description: defaultDescription,
    keywords: [...defaultKeywords],
    applicationName: site.shortName,
    authors: [{ name: "NIT Jamshedpur" }, { name: "DHTE Jharkhand" }],
    creator: "NIT Jamshedpur",
    publisher: "Department of Higher and Technical Education, Jharkhand",
    category: "education",
    alternates: {
      canonical: siteUrl,
    },
    openGraph: {
      title: `${site.title} | NIT Jamshedpur`,
      description: defaultDescription,
      url: siteUrl,
      siteName: site.shortName,
      locale: "en_IN",
      type: "website",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: `${site.title} | NIT Jamshedpur`,
      description: defaultDescription,
      images: [ogImage.url],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    ...(googleVerification ? { verification: { google: googleVerification } } : {}),
  };
}

export function organizationJsonLd() {
  const siteUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "NIT Jamshedpur Internship Portal",
    alternateName: site.shortName,
    url: siteUrl,
    logo: absoluteUrl("/nitjsrlogo.png"),
    description: defaultDescription,
    email: site.nitContact,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Jamshedpur",
      addressRegion: "Jharkhand",
      postalCode: "831014",
      addressCountry: "IN",
    },
    parentOrganization: {
      "@type": "CollegeOrUniversity",
      name: "National Institute of Technology Jamshedpur",
      url: siteLinks.nitOfficial,
    },
    sameAs: [siteLinks.nitOfficial],
  };
}

export function websiteJsonLd() {
  const siteUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.shortName,
    url: siteUrl,
    description: defaultDescription,
    inLanguage: "en-IN",
    publisher: {
      "@type": "Organization",
      name: "NIT Jamshedpur × DHTE Jharkhand",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
