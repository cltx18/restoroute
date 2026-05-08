import { useParams, Navigate, Link } from 'react-router-dom';
import { useEffect } from 'react';
import LeadForm from '../components/LeadForm.jsx';
import SEO from '../components/SEO.jsx';
import SiteHeader, { PHONE_DISPLAY, PHONE_HREF } from '../components/SiteHeader.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import { SERVICES, SERVICE_LIST } from '../data/services.js';
import { CITY_LIST } from '../data/cities.js';

export default function ServicePage() {
  const { slug } = useParams();
  const service = SERVICES[slug];

  useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  if (!service) return <Navigate to="/" replace />;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const canonical = `${origin}/services/${service.slug}`;

  // Combined Service + FAQPage JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: service.title,
        description: service.metaDescription,
        provider: {
          '@type': 'LocalBusiness',
          name: 'Local Restore & Clean',
          telephone: '+18556981510',
        },
        areaServed: 'Denver Metro Area, Colorado',
        url: canonical,
      },
      {
        '@type': 'FAQPage',
        mainEntity: service.faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: origin + '/' },
          { '@type': 'ListItem', position: 2, name: 'Services', item: origin + '/#services' },
          { '@type': 'ListItem', position: 3, name: service.title, item: canonical },
        ],
      },
    ],
  };

  // Related services (everything except current)
  const related = SERVICE_LIST.filter((s) => s.slug !== service.slug).slice(0, 4);

  return (
    <>
      <SEO
        title={service.metaTitle}
        description={service.metaDescription}
        canonical={canonical}
        jsonLd={jsonLd}
      />

      <SiteHeader />

      {/* Hero with form */}
      <section className="hero" style={{ paddingTop: 50, paddingBottom: 60 }}>
        <div className="container hero-inner">
          <div>
            <nav style={{ fontSize: '0.85rem', color: '#9ec5dd', marginBottom: 14 }}>
              <Link to="/" style={{ color: '#9ec5dd' }}>Home</Link>
              {' › '}
              <span>{service.title}</span>
            </nav>
            <h1 style={{ fontSize: '2.4rem' }}>
              <span style={{ marginRight: 12 }}>{service.icon}</span>
              {service.h1}
            </h1>
            <p className="lead" style={{ marginTop: 16 }}>{service.intro}</p>
            <div className="hero-badges">
              <span className="hero-badge">⏱ 24/7 emergency response</span>
              <span className="hero-badge">✓ Licensed & insured</span>
              <span className="hero-badge">💯 Free quotes</span>
            </div>
          </div>
          <LeadForm initialService={service.title} />
        </div>
      </section>

      {/* Article body */}
      <section style={{ background: '#fff', paddingTop: 50, paddingBottom: 50 }}>
        <div className="container" style={{ maxWidth: 880 }}>
          <article className="service-article">
            {service.sections.map((sec) => (
              <div key={sec.heading} style={{ marginBottom: 32 }}>
                <h2 style={{ color: 'var(--primary)', fontSize: '1.6rem', marginBottom: 12 }}>
                  {sec.heading}
                </h2>
                <p style={{ fontSize: '1.05rem', color: 'var(--text)', lineHeight: 1.7 }}>
                  {sec.body}
                </p>
              </div>
            ))}
          </article>
        </div>
      </section>

      {/* CTA between content and FAQ */}
      <section style={{ background: 'var(--bg)', padding: '40px 0' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: 720 }}>
          <h2 style={{ color: 'var(--primary)', fontSize: '1.6rem', marginBottom: 12 }}>
            Need {service.title} right now?
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 18 }}>
            Get connected with a local specialist in your area within minutes.
          </p>
          <a href={PHONE_HREF} className="btn btn-primary" style={{ display: 'inline-flex', maxWidth: 320, margin: '0 auto' }}>
            📞 Call {PHONE_DISPLAY}
          </a>
        </div>
      </section>

      {/* FAQs */}
      <section style={{ background: '#fff' }}>
        <div className="container" style={{ maxWidth: 880 }}>
          <h2 className="section-title" style={{ textAlign: 'left' }}>Frequently Asked Questions</h2>
          <div style={{ marginTop: 24 }}>
            {service.faqs.map((f, i) => (
              <details
                key={i}
                style={{
                  borderBottom: '1px solid var(--border)',
                  padding: '16px 0',
                }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    fontWeight: 600,
                    color: 'var(--primary)',
                    fontSize: '1.05rem',
                    listStyle: 'none',
                  }}
                >
                  {f.q}
                </summary>
                <p style={{ marginTop: 10, color: 'var(--text)', lineHeight: 1.7 }}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Service area cities for this service */}
      <section style={{ background: '#fff' }}>
        <div className="container">
          <h2 className="section-title">{service.title} Across Denver Metro</h2>
          <p className="section-subtitle">
            We connect homeowners with {service.title.toLowerCase()} specialists across the Denver area.
          </p>
          <div className="city-link-grid">
            {CITY_LIST.map((c) => (
              <Link key={c.slug} to={`/services/${service.slug}/${c.slug}`} className="city-link">
                {service.title} in {c.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Related services */}
      <section style={{ background: 'var(--bg)' }}>
        <div className="container">
          <h2 className="section-title">Related Restoration Services</h2>
          <div className="services-grid">
            {related.map((s) => (
              <Link key={s.slug} to={`/services/${s.slug}`} className="service-card">
                <div className="service-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.intro.slice(0, 80)}…</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
