import type { Metadata } from "next";
import { NoticesPagination } from "@/components/NoticesPagination";
import { formatDate, notices as fallbackNotices } from "@/lib/content";
import { getPublishedNoticesPage, paginateNotices, type PublicNotice } from "@/lib/notices";

export const metadata: Metadata = {
  title: "Notices",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ page?: string }>;
};

function fallbackNoticesList(): PublicNotice[] {
  return fallbackNotices.map((item) => ({
    id: item.id,
    title: item.title,
    date: item.date,
    category: item.category,
    excerpt: item.excerpt,
    body: item.body,
    isNew: Boolean(item.isNew),
  }));
}

export default async function NoticesPage({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams;
  const requestedPage = Math.max(Number(pageParam ?? 1) || 1, 1);

  const result = await getPublishedNoticesPage(requestedPage).catch(() =>
    paginateNotices(fallbackNoticesList(), requestedPage),
  );

  const { items: notices, page, totalPages, total } = result;

  return (
    <main className="page-main">
      <div className="container">
        <header className="page-header">
          <h1>Notices &amp; Announcements</h1>
          <p className="page-lead">
            Official updates on training schedules, attendance rules, fees, and assessments. Notices are issued in
            coordination with DHTE Jharkhand and participating polytechnics.
          </p>
        </header>

        {notices.length === 0 ? (
          <p className="page-lead">No notices published yet.</p>
        ) : (
          <>
            <div className="notice-board">
              {notices.map((notice) => (
                <article key={notice.id} id={notice.id} className="notice-card">
                  <div className="notice-card-head">
                    <span className={`category-tag cat-${notice.category.toLowerCase()}`}>{notice.category}</span>
                    <time dateTime={notice.date}>{formatDate(notice.date)}</time>
                    {notice.isNew ? <span className="badge-new">New</span> : null}
                  </div>
                  <h2>{notice.title}</h2>
                  <p className="notice-excerpt">{notice.excerpt}</p>
                  <div className="notice-body">{notice.body}</div>
                </article>
              ))}
            </div>

            <NoticesPagination page={page} totalPages={totalPages} total={total} />
          </>
        )}
      </div>
    </main>
  );
}
