import React from 'react';

export default function StarRating({ rating, max = 5, size = 'sm' }) {
  const sizes = { sm: 'text-sm', md: 'text-base', lg: 'text-lg' };
  return (
    <div className={`flex items-center gap-0.5 ${sizes[size]}`}>
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}
        >
          ★
        </span>
      ))}
    </div>
  );
}
