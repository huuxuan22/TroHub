import React from 'react';
import HomeMapExplorer from '../components/home/HomeMapExplorer';

export default function HomePage() {
  return (
    <main className="pt-16">
      <section className="h-[calc(100vh-4rem)]">
        <HomeMapExplorer />
      </section>
    </main>
  );
}
