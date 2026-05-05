import React from 'react';
import ContactHero from '../components/contact/ContactHero';
import ContactInfoCards from '../components/contact/ContactInfoCards';
import ContactForm from '../components/contact/ContactForm';
import ContactFAQ from '../components/contact/ContactFAQ';

export default function ContactPage() {
  return (
    <main className="bg-slate-50">
      <ContactHero />
      <ContactInfoCards />
      <ContactForm />
      <ContactFAQ />
    </main>
  );
}
