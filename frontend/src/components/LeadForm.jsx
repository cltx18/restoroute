import { useState } from 'react';
import { api } from '../api.js';
import { trackLeadSubmit, trackFormStep } from '../lib/tracking.js';

const SERVICES = [
  'Water Damage',
  'Mold Removal',
  'Fire & Smoke Damage',
  'Storm Damage',
  'Biohazard Cleanup',
  'Asbestos Removal',
  'Foundation Repair',
  'Sewage Cleanup',
  'Other',
];

export default function LeadForm({ initialService = '' }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    service: initialService,
    zip_code: '',
    name: '',
    phone: '',
    email: '',
    notes: '',
  });

  const update = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: null }));
  };

  const validateStep1 = () => {
    const e = {};
    if (!form.service) e.service = 'Please select a service.';
    if (!/^\d{5}$/.test(form.zip_code.trim())) e.zip_code = 'Please enter a valid 5-digit ZIP.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) e.phone = 'Please enter a valid phone number.';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Please enter a valid email.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = (event) => {
    event.preventDefault();
    if (validateStep1()) {
      trackFormStep('step1_to_step2', { service: form.service, zip: form.zip_code });
      setStep(2);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateStep2()) return;
    setSubmitting(true);
    try {
      const result = await api.submitLead(form);
      trackLeadSubmit({
        service: form.service,
        zip_code: form.zip_code,
        lead_id: result?.lead_id,
      });
      setDone(true);
    } catch (err) {
      setErrors({ _global: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="form-card">
        <div className="form-success">
          <h3>✓ Request Received</h3>
          <p>A local restoration specialist will reach out shortly. For urgent help, call our 24/7 line.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="form-card">
      <h2>Get a Free Quote</h2>
      <p className="sub">Connect with a vetted local restoration pro in minutes.</p>

      <div className="step-indicator">
        <div className={`step-dot ${step >= 1 ? 'active' : ''}`} />
        <div className={`step-dot ${step >= 2 ? 'active' : ''}`} />
      </div>

      {errors._global && <div className="alert alert-error">{errors._global}</div>}

      {step === 1 && (
        <form onSubmit={handleNext} noValidate>
          <div className="form-row">
            <label htmlFor="service">What service do you need?</label>
            <select
              id="service"
              value={form.service}
              onChange={(e) => update('service', e.target.value)}
            >
              <option value="">— Select service —</option>
              {SERVICES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {errors.service && <div className="form-error">{errors.service}</div>}
          </div>

          <div className="form-row">
            <label htmlFor="zip_code">Your ZIP code</label>
            <input
              id="zip_code"
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="e.g. 80202"
              value={form.zip_code}
              onChange={(e) => update('zip_code', e.target.value.replace(/\D/g, '').slice(0, 5))}
            />
            {errors.zip_code && <div className="form-error">{errors.zip_code}</div>}
          </div>

          <button type="submit" className="btn btn-primary">
            NEXT →
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <label htmlFor="name">Your name</label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
            />
            {errors.name && <div className="form-error">{errors.name}</div>}
          </div>

          <div className="form-row">
            <label htmlFor="phone">Phone number</label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="(555) 123-4567"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
            />
            {errors.phone && <div className="form-error">{errors.phone}</div>}
          </div>

          <div className="form-row">
            <label htmlFor="email">Email <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
            />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>

          <div className="form-row">
            <label htmlFor="notes">Brief description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <textarea
              id="notes"
              rows={3}
              placeholder="Tell us about the damage…"
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
            />
          </div>

          <div className="btn-row">
            <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>
              ← Back
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flex: 1 }}>
              {submitting ? 'Sending…' : 'GET MY FREE QUOTE'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
