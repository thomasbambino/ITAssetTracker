import { useEffect } from 'react';
import { useBranding } from './BrandingContext';

/**
 * Component that manages the favicon and other head elements based on branding settings
 */
export function FaviconManager() {
  const { brandingSettings } = useBranding();
  
  useEffect(() => {
    // Try to find existing favicon link
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    
    // If no favicon link exists, create one
    if (!link) {
      link = document.createElement('link') as HTMLLinkElement;
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    
    // Set or update favicon attributes
    link.type = 'image/png';
    
    // Use custom favicon if available, otherwise fallback to default
    if (brandingSettings.favicon) {
      link.href = brandingSettings.favicon;
    } else {
      link.href = '/generated-icon.png';
    }
    
    // Set page title based on branding
    document.title = `${brandingSettings.companyName} - IT Asset Manager`;
    
  }, [brandingSettings]);
  
  // This is a UI-less component that just manages document head
  return null;
}