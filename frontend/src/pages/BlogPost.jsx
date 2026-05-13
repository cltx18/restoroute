import { useParams, Navigate, Link } from 'react-router-dom';
import { useEffect } from 'react';
import LeadForm from '../components/LeadForm.jsx';
import SEO from '../components/SEO.jsx';
import SiteHeader, { PHONE_DISPLAY, PHONE_HREF } from '../components/SiteHeader.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import { BLOG_POSTS, BLOG_LIST } from '../data/blog.js';
import { trackPhoneClick } from '../lib/tracking.js';

export default function BlogPost() {
  const { slug } = useParams();
  const post = BLOG_POSTS[slug];

  useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  if (!post) return <Navigate to="/resources" replace />;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const canonical = `${origin}/resources/${post.slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: post.title,
        description: post.metaDescription,
        author: { '@type': 'Organization', name: post.author },
        publisher: {
          '@type': 'Organization',
          name: 'Local Restore & Clean',
          telephone: '+18556981510',
        },
        datePublished: post.date,
        url: canonical,
      },
      {
        '@type': 'FAQPage',
        mainEntity: post.faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: origin + '/' },
          { '@type': 'ListItem', position: 2, name: 'Resources', item: origin + '/resources' },
          { '@type': 'ListItem', position: 3, name: post.title, item: canonical },
        ],
      },
    ],
  };

  const related = BLOG_LIST.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <>
      <SEO
        title={post.metaTitle}
        description={post.metaDescription}
        canonical={canonical}
        jsonLd={jsonLd}
      />

      <SiteHeader />

      <section className="hero" style={{ paddingTop: 50, paddingBottom: 50 }}>
        <div className="container" style={{ maxWidth: 880 }}>
          <nav style={{ fontSize: '0.85rem', color: '#9ec5dd', marginBottom: 14 }}>
            <Link to="/" style={{ color: '#9ec5dd' }}>Home</Link>
            {' › '}
            <Link to="/resources" style={{ color: '#9ec5dd' }}>Resources</Link>
            {' › '}
            <span>{post.category}</span>
          </nav>
          <div style={{ fontSize: '0.85rem', color: '#9ec5dd', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
            {post.category} • {post.readTime}
          </div>
          <h1 style={{ fontSize: '2.3rem', lineHeight: 1.2 }}>{post.title}</h1>
          <p className="lead" style={{ marginTop: 18 }}>{post.excerpt}</p>
        </div>
      </section>

      <section style={{ background: '#fff', paddingTop: 50, paddingBottom: 50 }}>
        <div className="container" style={{ maxWidth: 880 }}>
          <article>
            {post.sections.map((sec, i) => (
              <div key={i} style={{ marginBottom: 32 }}>
                <h2 style={{ color: 'var(--primary)', fontSize: '1.5rem', marginBottom: 12 }}>
                  {sec.heading}
                </h2>
                {sec.body.split('\n\n').map((para, j) => (
                  <p key={j} style={{ fontSize: '1.05rem', color: 'var(--text)', lineHeight: 1.75, marginBottom: 12, whiteSpace: 'pre-line' }}>
                    {para}
                  </p>
                ))}
              </div>
            ))}
          </article>
        </div>
      </section>

      <section style={{ background: 'var(--bg)', padding: '40px 0' }}>
        <div className="container hero-inner" style={{ maxWidth: 1100 }}>
          <div>
            <h2 style={{ color: 'var(--primary)', fontSize: '1.6rem', marginBottom: 12 }}>
              Need a restoration pro right now?
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 18 }}>
              Get connected with a vetted Denver-metro specialist within minutes.
            </p>
            <a href={PHONE_HREF} className="btn btn-primary" style={{ display: 'inline-flex', maxWidth: 320 }} onClick={() => trackPhoneClick('blog_cta')}>
              📞 Call {PHONE_DISPLAY}
            </a>
          </div>
          <LeadForm initialService={post.category === 'Water Damage' ? 'Water Damage' : post.category === 'Mold' ? 'Mold Removal' : post.category === 'Storm Damage' ? 'Storm Damage' : ''} />
        </div>
      </section>

      <section style={{ background: '#fff' }}>
        <div className="container" style={{ maxWidth: 880 }}>
          <h2 className="section-title" style={{ textAlign: 'left' }}>Frequently Asked Questions</h2>
          <div style={{ marginTop: 24 }}>
            {post.faqs.map((f, i) => (
              <details key={i} style={{ borderBottom: '1px solid var(--border)', padding: '16px 0' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--primary)', fontSize: '1.05rem', listStyle: 'none' }}>
                  {f.q}
                </summary>
                <p style={{ marginTop: 10, color: 'var(--text)', lineHeight: 1.7 }}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: 'var(--bg)' }}>
        <div className="container">
          <h2 className="section-title">More Guides for Denver Homeowners</h2>
          <div className="services-grid">
            {related.map((p) => (
              <Link key={p.slug} to={`/resources/${p.slug}`} className="service-card">
                <div style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
                  {p.category}
                </div>
                <h3 style={{ fontSize: '1.1rem' }}>{p.title}</h3>
                <p>{p.excerpt.slice(0, 100)}…</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
