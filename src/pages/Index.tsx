
import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import PricingPlans from '@/components/PricingPlans';
import AppShowcase from '@/components/AppShowcase';
import Footer from '@/components/Footer';
import { useQueryClient } from '@tanstack/react-query';
import { fetchPlans } from '@/services/planService';

const Index = () => {
  // Add debug logging
  console.log('Index page rendering');
  
  // Prefetch plans when Index loads to ensure data is available
  const queryClient = useQueryClient();
  
  useEffect(() => {
    // Force a fresh fetch of plans data on every mount
    const fetchPlansData = async () => {
      console.log('Explicitly fetching plans data on Index mount');
      try {
        const plansData = await fetchPlans();
        queryClient.setQueryData(['plans'], plansData);
        console.log('Plans data fetched and set in cache:', plansData.length);
      } catch (error) {
        console.error('Failed to fetch plans on Index mount:', error);
      }
    };
    
    fetchPlansData();
    
    window.scrollTo(0, 0);
    
    // Implement scroll reveal animation
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, [queryClient]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <Hero />
        <Features />
        <PricingPlans />
        <AppShowcase />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
