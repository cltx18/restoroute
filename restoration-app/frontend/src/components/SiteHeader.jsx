// src/components/SiteHeader.jsx
import { Link } from 'react-router-dom';

const PHONE_DISPLAY = '(855) 698-1510';
const PHONE_HREF = 'tel:8556981510';

export default function SiteHeader() {
  return (
    <>
      <div className="topbar">
        <div className="container topbar-inner">
          <span>✓ Available 24/7</span>
          <span>✓ Free Estimates</span>
          <span>✓ Same-Day Service</span>
        </div>
      </div>
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="logo">
            <span className="logo-mark">🛠️</span>
            Local Restore & Clean
          </Link>
          <nav className="nav">
            <Link to="/services/water-damage-restoration">Water Damage</Link>
            <Link to="/services/mold-removal">Mold</Link>
            <Link to="/services/fire-smoke-damage-restoration">Fire</Link>
            <Link to="/#services">All Services</Link>
          </nav>
          <div className="header-cta">
            <span className="header-cta-label">24/7 Emergency</span>
            <a href={PHONE_HREF} className="header-cta-phone">📞 {PHONE_DISPLAY}</a>
          </div>
        </div>
      </header>
    </>
  );
}

export { PHONE_DISPLAY, PHONE_HREF };
