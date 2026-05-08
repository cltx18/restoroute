// src/components/SEO.jsx
// Lightweight SEO head manager - sets document title, meta tags, and JSON-LD.
import { useEffect } from 'react';

function setMeta(name, content, isProperty = false) {
  if (!content) return;
  const attr = isProperty ? 'property' : 'name';
  let tag = document.querySelector(`meta[${attr}="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function setCanonical(url) {
  if (!url) return;
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

function setJsonLd(id, data) {
  let script = document.getElementById(id);
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

export default function SEO({ title, description, canonical, jsonLd, ogImage }) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      setMeta('description', description);
      setMeta('og:description', description, true);
      setMeta('twitter:description', description);
    }
    if (title) {
      setMeta('og:title', title, true);
      setMeta('twitter:title', title);
    }
    setMeta('og:type', 'website', true);
    setMeta('twitter:card', 'summary_large_image');
    if (ogImage) setMeta('og:image', ogImage, true);
    if (canonical) {
      setCanonical(canonical);
      setMeta('og:url', canonical, true);
    }
    if (jsonLd) setJsonLd('seo-jsonld', jsonLd);
  }, [title, description, canonical, ogImage, JSON.stringify(jsonLd)]);

  return null;
}
