// src/components/SiteFooter.jsx
import { Link } from 'react-router-dom';
import { PHONE_DISPLAY, PHONE_HREF } from './SiteHeader.jsx';
import { trackPhoneClick } from '../lib/tracking.js';

const FOOTER_CITIES = [
  { slug: 'denver-co', name: 'Denver' },
  { slug: 'aurora-co', name: 'Aurora' },
  { slug: 'lakewood-co', name: 'Lakewood' },
  { slug: 'thornton-co', name: 'Thornton' },
  { slug: 'arvada-co', name: 'Arvada' },
  { slug: 'westminster-co', name: 'Westminster' },
  { slug: 'centennial-co', name: 'Centennial' },
  { slug: 'boulder-co', name: 'Boulder' },
  { slug: 'highlands-ranch-co', name: 'Highlands Ranch' },
  { slug: 'parker-co', name: 'Parker' },
];

export default function SiteFooter() {
  return (
    <footer>
      <div className="container">
        <div className="footer-grid">
          <div>
            <h4>Local Restore & Clean</h4>
            <p style={{ fontSize: '0.9rem', marginBottom: 8 }}>
              Connecting Denver metro homeowners with trusted local restoration professionals 24/7.
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
            <h4>Service Areas</h4>
            <ul>
              {FOOTER_CITIES.map((c) => (
                <li key={c.slug}>
                  <Link to={`/services/water-damage-restoration/${c.slug}`}>{c.name}, CO</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>24/7 Emergency</h4>
            <p style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>
              <a href={PHONE_HREF} style={{ color: '#fff' }} onClick={() => trackPhoneClick('footer')}>{PHONE_DISPLAY}</a>
            </p>
            <ul style={{ marginTop: 14 }}>
              <li><Link to="/#how">How It Works</Link></li>
              <li><Link to="/#why">Why Choose Us</Link></li>
              <li><Link to="/vendor/login">Contractor Login</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p className="disclaimer">
            Local Restore & Clean is a referral service connecting property owners with independent restoration contractors.
            Providers in our network are independently licensed and insured. Local Restore & Clean does not perform restoration
            work and does not warrant or guarantee any work performed by network providers.
          </p>
          <p>© {new Date().getFullYear()} Local Restore & Clean. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
