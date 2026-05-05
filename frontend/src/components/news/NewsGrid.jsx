import React from 'react';
import { NEWS_CATEGORIES, NEWS_POSTS } from '../../data/newsData';

function NewsCard({ post }) {
  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <img src={post.image} alt={post.title} className="w-full h-48 object-cover" />
      <div className="p-5">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{post.category}</p>
        <h3 className="mt-2 text-lg font-semibold text-gray-900">{post.title}</h3>
        <p className="mt-3 text-sm text-gray-600 leading-relaxed">{post.excerpt}</p>
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
          <span>{post.author}</span>
          <span>•</span>
          <span>{post.publishedAt}</span>
          <span>•</span>
          <span>{post.readTime}</span>
        </div>
      </div>
    </article>
  );
}

export default function NewsGrid() {
  return (
    <section className="pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-2 mb-7">
          {NEWS_CATEGORIES.map((category) => (
            <button
              key={category}
              className="px-4 py-2 rounded-full text-sm bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700 transition-colors"
            >
              {category}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {NEWS_POSTS.map((post) => (
            <NewsCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}
