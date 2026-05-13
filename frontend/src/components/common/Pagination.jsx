import React from 'react';

/**
 * Sinh dãy số trang có rút gọn dạng: 1 … 4 5 [6] 7 8 … 20
 * Luôn hiển thị trang đầu / cuối + 1-2 trang xung quanh trang hiện tại.
 */
function buildPageItems(currentPage, totalPages, siblingCount = 1) {
  if (totalPages <= 1) return [1];

  const totalNumbers = siblingCount * 2 + 5; // first + last + current + 2*siblings + 2 dots
  if (totalPages <= totalNumbers) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(currentPage - siblingCount, 1);
  const rightSibling = Math.min(currentPage + siblingCount, totalPages);

  const showLeftDots = leftSibling > 2;
  const showRightDots = rightSibling < totalPages - 1;

  if (!showLeftDots && showRightDots) {
    const leftRange = Array.from({ length: 3 + siblingCount * 2 }, (_, i) => i + 1);
    return [...leftRange, 'dots-right', totalPages];
  }
  if (showLeftDots && !showRightDots) {
    const rightStart = totalPages - (3 + siblingCount * 2) + 1;
    const rightRange = Array.from({ length: 3 + siblingCount * 2 }, (_, i) => rightStart + i);
    return [1, 'dots-left', ...rightRange];
  }
  const middleRange = Array.from(
    { length: rightSibling - leftSibling + 1 },
    (_, i) => leftSibling + i,
  );
  return [1, 'dots-left', ...middleRange, 'dots-right', totalPages];
}

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  className = '',
  siblingCount = 1,
}) {
  if (!Number.isFinite(totalPages) || totalPages <= 1) return null;

  const page = Math.min(Math.max(1, currentPage), totalPages);
  const items = buildPageItems(page, totalPages, siblingCount);

  const go = (target) => {
    if (target < 1 || target > totalPages || target === page) return;
    onPageChange?.(target);
  };

  const baseBtn =
    'min-w-[2.5rem] h-10 px-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center';
  const idleBtn = 'border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600';
  const activeBtn = 'bg-blue-600 text-white border border-blue-600 shadow-sm';
  const disabledBtn = 'border border-gray-100 text-gray-300 cursor-not-allowed';

  return (
    <nav
      role="navigation"
      aria-label="Phân trang"
      className={`flex items-center justify-center gap-2 flex-wrap ${className}`}
    >
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page === 1}
        aria-label="Trang trước"
        className={`${baseBtn} ${page === 1 ? disabledBtn : idleBtn}`}
      >
        ‹
      </button>

      {items.map((it, idx) => {
        if (typeof it === 'string') {
          return (
            <span
              key={`${it}-${idx}`}
              className="min-w-[2.5rem] h-10 flex items-center justify-center text-gray-400 select-none"
            >
              …
            </span>
          );
        }
        const isActive = it === page;
        return (
          <button
            key={it}
            type="button"
            onClick={() => go(it)}
            aria-current={isActive ? 'page' : undefined}
            className={`${baseBtn} ${isActive ? activeBtn : idleBtn}`}
          >
            {it}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page === totalPages}
        aria-label="Trang sau"
        className={`${baseBtn} ${page === totalPages ? disabledBtn : idleBtn}`}
      >
        ›
      </button>
    </nav>
  );
}
