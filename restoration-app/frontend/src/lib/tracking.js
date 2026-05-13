// src/lib/tracking.js
// Centralized tracking for GA4 + Google Ads conversions + Meta Pixel.
// Safe to call before scripts load - everything pushes to dataLayer first.

if (typeof window !== 'undefined') {
  window.dataLayer = window.dataLayer || [];
}

function gtag(...args) {
  if (typeof window === 'undefined') return;
  window.dataLayer.push(args);
}

/**
 * Fire when a lead form is successfully submitted.
 * @param {object} payload - { service, zip_code, lead_id }
 */
export function trackLeadSubmit(payload = {}) {
  if (typeof window === 'undefined') return;

  // GA4 / GTM
  window.dataLayer.push({
    event: 'lead_submit',
    lead_service: payload.service || 'unknown',
    lead_zip: payload.zip_code || '',
    lead_id: payload.lead_id || '',
    value: 50, // estimated lead value, override per service later
    currency: 'USD',
  });

  // Google Ads conversion - reads IDs from window so they can be set in index.html
  if (window.GOOGLE_ADS_CONVERSION_ID && window.GOOGLE_ADS_LEAD_LABEL) {
    gtag('event', 'conversion', {
      send_to: `${window.GOOGLE_ADS_CONVERSION_ID}/${window.GOOGLE_ADS_LEAD_LABEL}`,
      value: 50,
      currency: 'USD',
    });
  }

  // Meta Pixel (if loaded)
  if (window.fbq) {
    window.fbq('track', 'Lead', {
      content_name: payload.service || 'restoration',
      value: 50,
      currency: 'USD',
    });
  }
}

/**
 * Fire when someone clicks the phone CTA (header, footer, or in-page).
 * @param {string} location - "header" | "footer" | "service_page" etc.
 */
export function trackPhoneClick(location = 'unknown') {
  if (typeof window === 'undefined') return;

  window.dataLayer.push({
    event: 'phone_click',
    click_location: location,
    value: 80, // phone leads are higher intent than form fills
    currency: 'USD',
  });

  if (window.GOOGLE_ADS_CONVERSION_ID && window.GOOGLE_ADS_PHONE_LABEL) {
    gtag('event', 'conversion', {
      send_to: `${window.GOOGLE_ADS_CONVERSION_ID}/${window.GOOGLE_ADS_PHONE_LABEL}`,
      value: 80,
      currency: 'USD',
    });
  }

  if (window.fbq) {
    window.fbq('track', 'Contact', { value: 80, currency: 'USD' });
  }
}

/**
 * Track form-step progress so we can see drop-off in funnels.
 */
export function trackFormStep(step, payload = {}) {
  if (typeof window === 'undefined') return;
  window.dataLayer.push({
    event: 'form_step',
    form_step: step,
    ...payload,
  });
}

/**
 * Track when a service page is viewed.
 */
export function trackServiceView(slug, city = null) {
  if (typeof window === 'undefined') return;
  window.dataLayer.push({
    event: 'service_view',
    service_slug: slug,
    service_city: city || '',
  });
}
