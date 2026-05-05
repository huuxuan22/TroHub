import React from 'react';
import HeroBanner from '../components/home/HeroBanner';
import CategorySection from '../components/home/CategorySection';
import FeaturedRooms from '../components/home/FeaturedRooms';
import HowItWorks from '../components/home/HowItWorks';
import StatsSection from '../components/home/StatsSection';
import Testimonials from '../components/home/Testimonials';
import AIAssistantBanner from '../components/home/AIAssistantBanner';

export default function HomePage() {
  return (
    <main>
      <HeroBanner />
      <CategorySection />
      <FeaturedRooms />
      <StatsSection />
      <HowItWorks />
      <AIAssistantBanner />
      <Testimonials />
    </main>
  );
}
