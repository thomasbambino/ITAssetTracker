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
    
    // Set page title based on branding and custom siteTitle if available
    const titleSuffix = brandingSettings.siteTitle || 'IT Asset Manager';
    document.title = `${brandingSettings.companyName} - ${titleSuffix}`;
    
    // Update meta description if available
    let metaDescription = document.querySelector("meta[name='description']") as HTMLMetaElement;
    
    // If no meta description tag exists, create one
    if (!metaDescription) {
      metaDescription = document.createElement('meta') as HTMLMetaElement;
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    
    // Set custom description or default
    const defaultDescription = 'A comprehensive IT asset management system for tracking hardware, software, and maintenance.';
    metaDescription.content = brandingSettings.siteDescription || defaultDescription;
    
    // Update Open Graph meta tags for better social sharing
    updateOpenGraphMetaTags(brandingSettings);
    
  }, [brandingSettings]);
  
  /**
   * Helper function to update or create Open Graph meta tags
   */
  function updateOpenGraphMetaTags(branding: any) {
    const tags = [
      { property: 'og:title', content: `${branding.companyName} - ${branding.siteTitle || 'IT Asset Manager'}` },
      { property: 'og:description', content: branding.siteDescription || 'A comprehensive IT asset management system for tracking hardware, software, and maintenance.' },
      { property: 'og:type', content: 'website' }
    ];
    
    // Add or update each tag
    tags.forEach(tag => {
      let metaTag = document.querySelector(`meta[property='${tag.property}']`) as HTMLMetaElement;
      
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute('property', tag.property);
        document.head.appendChild(metaTag);
      }
      
      metaTag.setAttribute('content', tag.content);
    });
  }
  
  // This is a UI-less component that just manages document head
  return null;
}