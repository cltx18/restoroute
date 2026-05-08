import { Link } from 'react-router-dom';
import LeadForm from '../components/LeadForm.jsx';
import SEO from '../components/SEO.jsx';
import SiteHeader, { PHONE_DISPLAY, PHONE_HREF } from '../components/SiteHeader.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import { SERVICE_LIST } from '../data/services.js';

export default function LandingPage() {
  const canonical = (typeof window !== 'undefined' ? window.location.origin : '') + '/';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'RestoreLink',
    description:
      'Restoration contractor referral service. Connecting homeowners with vetted local water damage, mold, fire, and biohazard restoration professionals.',
    telephone: '+18885551234',
    url: canonical,
    areaServed: 'United States',
    priceRange: 'Free quotes',
  };

  return (
    <>
      <SEO
        title="RestoreLink — Connect With Local Restoration Pros 24/7"
        description="Get connected with vetted local restoration professionals for water damage, mold removal, fire restoration, biohazard cleanup, and more. Free quotes. 24/7 service."
        canonical={canonical}
        jsonLd={jsonLd}
      />

      <SiteHeader />

      <section className="hero" style={{ paddingTop: 60 }}>
        <div className="container hero-inner">
          <div>
            <h1>Connect With Trusted Local Restoration Pros — Fast.</h1>
            <p className="lead">
              Water damage, mold, fire, biohazard, and more. We match you with vetted, licensed restoration
              specialists in your area. Free quotes. Zero obligation.
            </p>
            <div className="hero-badges">
              <span className="hero-badge">⏱ Same-day appointments</span>
              <span className="hero-badge">✓ Licensed & insured pros</span>
              <span className="hero-badge">💯 100% free service</span>
            </div>
          </div>
          <LeadForm />
        </div>
      </section>

      <section id="services">
        <div className="container">
          <h2 className="section-title">Restoration Services We Cover</h2>
          <p className="section-subtitle">
            Our network handles every category of property damage — from a leaky pipe to a full structural rebuild.
          </p>
          <div className="services-grid">
            {SERVICE_LIST.map((s) => (
              <Link key={s.slug} to={`/services/${s.slug}`} className="service-card">
                <div className="service-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.intro.slice(0, 90)}…</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="how" style={{ background: '#fff' }}>
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">
            Three simple steps to get connected with a local restoration professional.
          </p>
          <div className="steps-grid">
            <div className="step">
              <div className="step-num">1</div>
              <h3>Tell Us What You Need</h3>
              <p>Fill out the quick form or call our 24/7 line. Share your service type and ZIP code.</p>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <h3>Get Matched Locally</h3>
              <p>We instantly route you to a vetted restoration pro who serves your area and can respond fast.</p>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <h3>Get Your Free Quote</h3>
              <p>Your local specialist will assess the damage, walk you through options, and quote the work.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="why" className="why-section">
        <div className="container">
          <h2 className="section-title">Why Homeowners Choose Us</h2>
          <p className="section-subtitle">
            We've connected thousands of homeowners with local restoration pros — here's what sets us apart.
          </p>
          <div className="why-grid">
            <div className="why-card">
              <h3>Vetted Local Pros</h3>
              <p>Every contractor in our network is licensed, insured, and reviewed before joining.</p>
            </div>
            <div className="why-card">
              <h3>Completely Free</h3>
              <p>Our matching service is 100% free. No financial info required — ever.</p>
            </div>
            <div className="why-card">
              <h3>No Obligation</h3>
              <p>Compare quotes side-by-side. If a match isn't right, you owe nothing.</p>
            </div>
            <div className="why-card">
              <h3>Any Project Size</h3>
              <p>From a small leak to a full rebuild — we'll find the right pro for the job.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-banner">
        <div className="container">
          <h2>Need Help Right Now?</h2>
          <p>Our restoration specialists are standing by 24/7.</p>
          <a href={PHONE_HREF}>📞 {PHONE_DISPLAY}</a>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
