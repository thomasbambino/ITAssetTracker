import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'wouter';

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const [location] = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(location);

  useEffect(() => {
    // When location changes, fade out first
    setIsVisible(false);
    
    // After fade out completes, update content and fade in
    const timer = setTimeout(() => {
      setCurrentLocation(location);
      setIsVisible(true);
    }, 150); // Half of the transition duration

    return () => clearTimeout(timer);
  }, [location]);

  // Initial fade in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={`transition-all duration-300 ease-in-out ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-2'
      }`}
    >
      {children}
    </div>
  );
}