import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import SEO from '../components/SEO.jsx';
import SiteHeader from '../components/SiteHeader.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import { BLOG_LIST } from '../data/blog.js';

export default function BlogIndex() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const canonical = `${origin}/resources`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Local Restore & Clean Resources',
    description: 'Restoration guides and resources for Denver metro homeowners.',
    url: canonical,
  };

  return (
    <>
      <SEO
        title="Restoration Resources for Denver Homeowners | Local Restore & Clean"
        description="Practical guides for Denver homeowners: water damage steps, mold identification, hail damage inspection, and more from local restoration pros."
        canonical={canonical}
        jsonLd={jsonLd}
      />

      <SiteHeader />

      <section className="hero" style={{ paddingTop: 50, paddingBottom: 60 }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: 880 }}>
          <h1 style={{ fontSize: '2.4rem' }}>📚 Resources for Denver Homeowners</h1>
          <p className="lead" style={{ marginTop: 16 }}>
            Practical guides written by restoration pros who work Denver every day. No fluff, no upsells — just what
            you actually need to know.
          </p>
        </div>
      </section>

      <section style={{ background: '#fff' }}>
        <div className="container" style={{ maxWidth: 1000 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24, marginTop: 16 }}>
            {BLOG_LIST.map((post) => (
              <Link
                key={post.slug}
                to={`/resources/${post.slug}`}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 24,
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  display: 'block',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <div style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  {post.category} • {post.readTime}
                </div>
                <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginBottom: 10, lineHeight: 1.3 }}>
                  {post.title}
                </h2>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  {post.excerpt}
                </p>
                <div style={{ marginTop: 14, fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 600 }}>
                  Read more →
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
