import LeadForm from '../components/LeadForm.jsx';

const PHONE_DISPLAY = '(888) 555-1234';
const PHONE_HREF = 'tel:8885551234';

const SERVICES = [
  { icon: '💧', title: 'Water Damage', desc: 'Flood & leak cleanup, water extraction, drying.' },
  { icon: '🦠', title: 'Mold Removal', desc: 'Inspection, testing, and full remediation.' },
  { icon: '🔥', title: 'Fire & Smoke', desc: 'Soot removal, odor neutralization, rebuild.' },
  { icon: '⛈️', title: 'Storm Damage', desc: 'Wind, hail, and tree-impact repair.' },
  { icon: '☣️', title: 'Biohazard', desc: 'Trauma scene, sewage, and hazardous cleanup.' },
  { icon: '🏚️', title: 'Asbestos', desc: 'Licensed abatement and safe disposal.' },
  { icon: '🏗️', title: 'Foundation', desc: 'Crack repair, leveling, waterproofing.' },
  { icon: '🚿', title: 'Sewage Cleanup', desc: 'Sanitization and contaminant removal.' },
];

export default function LandingPage() {
  return (
    <>
      {/* Top bar */}
      <div className="topbar">
        <div className="container topbar-inner">
          <span>✓ Available 24/7</span>
          <span>✓ Free Estimates</span>
          <span>✓ Same-Day Service</span>
        </div>
      </div>

      {/* Header */}
      <header className="site-header">
        <div className="container header-inner">
          <a href="/" className="logo">
            <span className="logo-mark">🛠️</span>
            RestoreLink
          </a>
          <nav className="nav">
            <a href="#services">Services</a>
            <a href="#how">How It Works</a>
            <a href="#why">Why Us</a>
          </nav>
          <div className="header-cta">
            <span className="header-cta-label">24/7 Emergency</span>
            <a href={PHONE_HREF} className="header-cta-phone">📞 {PHONE_DISPLAY}</a>
          </div>
        </div>
      </header>

      {/* Hero with form */}
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

      {/* Services */}
      <section id="services">
        <div className="container">
          <h2 className="section-title">Restoration Services We Cover</h2>
          <p className="section-subtitle">
            Our network handles every category of property damage — from a leaky pipe to a full structural rebuild.
          </p>
          <div className="services-grid">
            {SERVICES.map((s) => (
              <a key={s.title} href="#top" className="service-card">
                <div className="service-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
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

      {/* Why us */}
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

      {/* CTA banner */}
      <section className="cta-banner">
        <div className="container">
          <h2>Need Help Right Now?</h2>
          <p>Our restoration specialists are standing by 24/7.</p>
          <a href={PHONE_HREF}>📞 {PHONE_DISPLAY}</a>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="container">
          <div className="footer-grid">
            <div>
              <h4>RestoreLink</h4>
              <p style={{ fontSize: '0.9rem', marginBottom: 8 }}>
                Connecting homeowners with trusted local restoration professionals nationwide.
              </p>
            </div>
            <div>
              <h4>Services</h4>
              <ul>
                <li><a href="#services">Water Damage</a></li>
                <li><a href="#services">Mold Removal</a></li>
                <li><a href="#services">Fire & Smoke</a></li>
                <li><a href="#services">Biohazard</a></li>
              </ul>
            </div>
            <div>
              <h4>Company</h4>
              <ul>
                <li><a href="#how">How It Works</a></li>
                <li><a href="#why">Why Choose Us</a></li>
                <li><a href="/admin/login">Contractor Login</a></li>
              </ul>
            </div>
            <div>
              <h4>24/7 Emergency</h4>
              <p style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>
                <a href={PHONE_HREF} style={{ color: '#fff' }}>{PHONE_DISPLAY}</a>
              </p>
            </div>
          </div>
          <div className="footer-bottom">
            <p className="disclaimer">
              RestoreLink is a referral service connecting property owners with independent restoration contractors.
              Providers in our network are independently licensed and insured. RestoreLink does not perform restoration
              work and does not warrant or guarantee any work performed by network providers.
            </p>
            <p>© {new Date().getFullYear()} RestoreLink. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
