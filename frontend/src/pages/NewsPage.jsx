import React from 'react';
import NewsHero from '../components/news/NewsHero';
import NewsGrid from '../components/news/NewsGrid';

export default function NewsPage() {
  return (
    <main className="bg-slate-50">
      <NewsHero />
      <NewsGrid />
    </main>
  );
}
