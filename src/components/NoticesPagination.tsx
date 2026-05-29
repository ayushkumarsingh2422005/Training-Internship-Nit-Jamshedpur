import Link from "next/link";

type Props = {
  page: number;
  totalPages: number;
  total: number;
};

function pageHref(page: number): string {
  return page <= 1 ? "/notices" : `/notices?page=${page}`;
}

export function NoticesPagination({ page, totalPages, total }: Props) {
  if (totalPages <= 1) {
    return null;
  }

  const pages: number[] = [];
  const windowStart = Math.max(1, page - 2);
  const windowEnd = Math.min(totalPages, page + 2);
  for (let index = windowStart; index <= windowEnd; index += 1) {
    pages.push(index);
  }

  return (
    <nav className="notice-pagination" aria-label="Notices pagination">
      {page > 1 ? (
        <Link href={pageHref(page - 1)} className="btn btn-secondary btn-sm">
          Previous
        </Link>
      ) : (
        <span className="btn btn-secondary btn-sm notice-pagination-disabled">Previous</span>
      )}

      <div className="notice-pagination-pages">
        {pages.map((pageNumber) =>
          pageNumber === page ? (
            <span key={pageNumber} className="notice-pagination-current" aria-current="page">
              {pageNumber}
            </span>
          ) : (
            <Link key={pageNumber} href={pageHref(pageNumber)} className="notice-pagination-link">
              {pageNumber}
            </Link>
          ),
        )}
      </div>

      {page < totalPages ? (
        <Link href={pageHref(page + 1)} className="btn btn-secondary btn-sm">
          Next
        </Link>
      ) : (
        <span className="btn btn-secondary btn-sm notice-pagination-disabled">Next</span>
      )}

      <span className="notice-pagination-meta">
        Page {page} of {totalPages} ({total} notices)
      </span>
    </nav>
  );
}
