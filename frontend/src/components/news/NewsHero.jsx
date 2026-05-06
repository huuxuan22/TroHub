import React from 'react';
import { FEATURED_POST } from '../../data/newsData';

export default function NewsHero() {
  return (
    <section className="pt-24 pb-10 bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="inline-flex px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
          Bài viết nổi bật
        </p>
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <span className="text-sm text-blue-600 font-semibold">{FEATURED_POST.category}</span>
            <h1 className="mt-3 text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              {FEATURED_POST.title}
            </h1>
            <p className="mt-4 text-gray-600 leading-relaxed">{FEATURED_POST.excerpt}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span>{FEATURED_POST.author}</span>
              <span>•</span>
              <span>{FEATURED_POST.publishedAt}</span>
              <span>•</span>
              <span>{FEATURED_POST.readTime}</span>
            </div>
            <button className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors">
              Đọc bài viết
            </button>
          </div>
          <img
            src={FEATURED_POST.image}
            alt={FEATURED_POST.title}
            className="w-full h-72 md:h-96 object-cover rounded-2xl shadow-lg"
          />
        </div>
      </div>
    </section>
  );
}
