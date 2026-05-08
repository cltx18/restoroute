// src/components/SiteFooter.jsx
import { Link } from 'react-router-dom';
import { PHONE_DISPLAY, PHONE_HREF } from './SiteHeader.jsx';

export default function SiteFooter() {
  return (
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
              <li><Link to="/services/water-damage-restoration">Water Damage</Link></li>
              <li><Link to="/services/mold-removal">Mold Removal</Link></li>
              <li><Link to="/services/fire-smoke-damage-restoration">Fire & Smoke</Link></li>
              <li><Link to="/services/storm-damage-restoration">Storm Damage</Link></li>
              <li><Link to="/services/biohazard-cleanup">Biohazard</Link></li>
              <li><Link to="/services/asbestos-removal">Asbestos</Link></li>
              <li><Link to="/services/foundation-repair">Foundation</Link></li>
              <li><Link to="/services/sewage-cleanup">Sewage Cleanup</Link></li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><Link to="/#how">How It Works</Link></li>
              <li><Link to="/#why">Why Choose Us</Link></li>
              <li><Link to="/vendor/login">Contractor Login</Link></li>
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
  );
}
