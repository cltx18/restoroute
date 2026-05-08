import { useParams, Navigate, Link } from 'react-router-dom';
import { useEffect } from 'react';
import LeadForm from '../components/LeadForm.jsx';
import SEO from '../components/SEO.jsx';
import SiteHeader, { PHONE_DISPLAY, PHONE_HREF } from '../components/SiteHeader.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import { SERVICES, SERVICE_LIST } from '../data/services.js';
import { CITIES } from '../data/cities.js';

export default function LocalServicePage() {
  const { slug, city } = useParams();
  const service = SERVICES[slug];
  const cityData = CITIES[city];

  useEffect(() => { window.scrollTo(0, 0); }, [slug, city]);

  if (!service || !cityData) return <Navigate to="/" replace />;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const canonical = `${origin}/services/${service.slug}/${cityData.slug}`;
  const businessName = `Local Restore & Clean of ${cityData.name}`;

  // Local-flavored title and description
  const metaTitle = `${service.title} in ${cityData.name}, ${cityData.stateAbbr} | 24/7 Local Pros`;
  const metaDescription = `${service.title.toLowerCase().includes('restoration') ? service.title : service.title + ' services'} in ${cityData.fullName}. Vetted local specialists, 24/7 emergency response, free quotes. Same-day service in ${cityData.name} and surrounding areas.`;
  const h1 = `${service.title} in ${cityData.name}, ${cityData.stateAbbr}`;

  // Schema with per-city LocalBusiness
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LocalBusiness',
        name: businessName,
        description: metaDescription,
        telephone: '+18556981510',
        url: canonical,
        areaServed: {
          '@type': 'City',
          name: cityData.fullName,
        },
        address: {
          '@type': 'PostalAddress',
          addressLocality: cityData.name,
          addressRegion: cityData.stateAbbr,
          postalCode: cityData.zip,
          addressCountry: 'US',
        },
      },
      {
        '@type': 'Service',
        name: `${service.title} in ${cityData.name}`,
        description: service.metaDescription,
        provider: { '@type': 'LocalBusiness', name: businessName, telephone: '+18556981510' },
        areaServed: cityData.fullName,
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
          { '@type': 'ListItem', position: 2, name: service.title, item: `${origin}/services/${service.slug}` },
          { '@type': 'ListItem', position: 3, name: `${cityData.name}, ${cityData.stateAbbr}`, item: canonical },
        ],
      },
    ],
  };

  // Other cities for cross-linking
  const otherCities = Object.values(CITIES).filter((c) => c.slug !== cityData.slug).slice(0, 8);
  // Other services in this city for cross-linking
  const otherServices = SERVICE_LIST.filter((s) => s.slug !== service.slug).slice(0, 6);

  return (
    <>
      <SEO
        title={metaTitle}
        description={metaDescription}
        canonical={canonical}
        jsonLd={jsonLd}
      />

      <SiteHeader />

      {/* Hero */}
      <section className="hero" style={{ paddingTop: 50, paddingBottom: 60 }}>
        <div className="container hero-inner">
          <div>
            <nav style={{ fontSize: '0.85rem', color: '#9ec5dd', marginBottom: 14 }}>
              <Link to="/" style={{ color: '#9ec5dd' }}>Home</Link>
              {' › '}
              <Link to={`/services/${service.slug}`} style={{ color: '#9ec5dd' }}>{service.title}</Link>
              {' › '}
              <span>{cityData.name}, {cityData.stateAbbr}</span>
            </nav>
            <h1 style={{ fontSize: '2.2rem' }}>
              <span style={{ marginRight: 12 }}>{service.icon}</span>
              {h1}
            </h1>
            <p className="lead" style={{ marginTop: 16 }}>
              Local Restore & Clean of {cityData.name} connects {cityData.name} homeowners with vetted, licensed
              restoration pros for {service.title.toLowerCase()} — 24/7 emergency response and free quotes.
            </p>
            <div className="hero-badges">
              <span className="hero-badge">📍 Serving {cityData.name} & nearby</span>
              <span className="hero-badge">⏱ Same-day response</span>
              <span className="hero-badge">✓ Licensed & insured</span>
            </div>
          </div>
          <LeadForm initialService={service.title} />
        </div>
      </section>

      {/* Local intro */}
      <section style={{ background: '#fff', paddingTop: 50, paddingBottom: 30 }}>
        <div className="container" style={{ maxWidth: 880 }}>
          <h2 style={{ color: 'var(--primary)', fontSize: '1.6rem', marginBottom: 12 }}>
            {service.title} for {cityData.name} Homeowners
          </h2>
          <p style={{ fontSize: '1.05rem', lineHeight: 1.7, color: 'var(--text)' }}>
            {cityData.blurb} When {service.title.toLowerCase()} is needed in {cityData.name}, response time
            and local know-how matter — our network includes restoration specialists who serve {cityData.name}{' '}
            and the surrounding area regularly, so they understand the housing stock, the common issues, and the
            local insurance carriers.
          </p>
          {cityData.neighborhoods?.length > 0 && (
            <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--text-muted)', marginTop: 14 }}>
              Service available throughout {cityData.name}, including{' '}
              {cityData.neighborhoods.join(', ')}, plus surrounding communities like{' '}
              {cityData.nearby.join(', ')}.
            </p>
          )}
        </div>
      </section>

      {/* Article body (shared service content) */}
      <section style={{ background: '#fff', paddingTop: 20, paddingBottom: 50 }}>
        <div className="container" style={{ maxWidth: 880 }}>
          <article className="service-article">
            {service.sections.map((sec) => (
              <div key={sec.heading} style={{ marginBottom: 32 }}>
                <h2 style={{ color: 'var(--primary)', fontSize: '1.5rem', marginBottom: 12 }}>
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

      {/* CTA */}
      <section style={{ background: 'var(--bg)', padding: '40px 0' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: 720 }}>
          <h2 style={{ color: 'var(--primary)', fontSize: '1.6rem', marginBottom: 12 }}>
            Need {service.title} in {cityData.name}?
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 18 }}>
            Get connected with a local {cityData.name} specialist within minutes.
          </p>
          <a href={PHONE_HREF} className="btn btn-primary" style={{ display: 'inline-flex', maxWidth: 320, margin: '0 auto' }}>
            📞 Call {PHONE_DISPLAY}
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background: '#fff' }}>
        <div className="container" style={{ maxWidth: 880 }}>
          <h2 className="section-title" style={{ textAlign: 'left' }}>Frequently Asked Questions</h2>
          <div style={{ marginTop: 24 }}>
            {service.faqs.map((f, i) => (
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

      {/* Cross-links: other cities for this service */}
      <section style={{ background: 'var(--bg)' }}>
        <div className="container">
          <h2 className="section-title">{service.title} in Other Denver Metro Cities</h2>
          <div className="city-link-grid">
            {otherCities.map((c) => (
              <Link key={c.slug} to={`/services/${service.slug}/${c.slug}`} className="city-link">
                {service.title} in {c.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Cross-links: other services in this city */}
      <section style={{ background: '#fff' }}>
        <div className="container">
          <h2 className="section-title">Other Restoration Services in {cityData.name}</h2>
          <div className="services-grid">
            {otherServices.map((s) => (
              <Link key={s.slug} to={`/services/${s.slug}/${cityData.slug}`} className="service-card">
                <div className="service-icon">{s.icon}</div>
                <h3>{s.title} in {cityData.name}</h3>
                <p>{s.intro.slice(0, 70)}…</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
