import React, { useEffect } from 'react';

interface PageSeoProps {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article';
}

const DEFAULT_ORIGIN = 'https://jamboost.sanelowmusiclabel.co.za';

export const PageSeo: React.FC<PageSeoProps> = ({
  title,
  description,
  path = '',
  image = '/og-image.jpg',
  type = 'website',
}) => {
  useEffect(() => {
    // 1. Update Title
    document.title = title;

    const origin = typeof window !== 'undefined' ? window.location.origin : DEFAULT_ORIGIN;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const canonicalUrl = `${origin}${cleanPath === '/' ? '' : cleanPath}`;
    const fullImageUrl = image.startsWith('http') ? image : `${origin}${image.startsWith('/') ? image : `/${image}`}`;

    // Helper to set or create meta tag
    const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
      let tag = document.querySelector(`meta[${attr}="${key}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    // Standard Meta
    setMeta('name', 'description', description);

    // OpenGraph
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:site_name', 'JamBoost');
    setMeta('property', 'og:image', fullImageUrl);
    setMeta('property', 'og:image:width', '1200');
    setMeta('property', 'og:image:height', '630');

    // Twitter
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', fullImageUrl);

    // Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);
  }, [title, description, path, image, type]);

  return null;
};
