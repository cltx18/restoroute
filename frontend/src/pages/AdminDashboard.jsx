import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api.js';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('vendors');
  const [vendors, setVendors] = useState([]);
  const [nextInRotation, setNextInRotation] = useState(null);
  const [activeCount, setActiveCount] = useState(0);
  const [leads, setLeads] = useState([]);
  const [calls, setCalls] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [newCredentials, setNewCredentials] = useState(null);

  useEffect(() => {
    if (!localStorage.getItem('admin_token')) {
      navigate('/admin/login');
      return;
    }
    refresh();
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const [v, l, c] = await Promise.all([api.listVendors(), api.listLeads(), api.listCalls()]);
      setVendors(v.vendors || []);
      setNextInRotation(v.next_in_rotation);
      setActiveCount(v.active_count || 0);
      setLeads(l.leads || []);
      setCalls(c.calls || []);
    } catch (err) {
      if (err.status === 401) {
        setToken(null);
        navigate('/admin/login');
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    navigate('/admin/login');
  };

  return (
    <div className="admin-shell">
      <div className="admin-header">
        <div className="container admin-header-inner">
          <h1>🛠️ RestoreLink Admin</h1>
          <button className="btn btn-outline" onClick={logout} style={{ background: '#fff' }}>
            Sign Out
          </button>
        </div>
      </div>

      <div className="container">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* KPIs */}
        <div className="kpi-grid">
          <div className="kpi">
            <div className="label">Total Vendors</div>
            <div className="value">{vendors.length}</div>
          </div>
          <div className="kpi">
            <div className="label">Active in Rotation</div>
            <div className="value">{activeCount}</div>
          </div>
          <div className="kpi">
            <div className="label">Total Leads</div>
            <div className="value">{leads.length}</div>
          </div>
          <div className="kpi">
            <div className="label">Total Calls Routed</div>
            <div className="value">{calls.length}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          <button className={`admin-tab ${tab === 'vendors' ? 'active' : ''}`} onClick={() => setTab('vendors')}>
            Vendors
          </button>
          <button className={`admin-tab ${tab === 'leads' ? 'active' : ''}`} onClick={() => setTab('leads')}>
            Leads
          </button>
          <button className={`admin-tab ${tab === 'calls' ? 'active' : ''}`} onClick={() => setTab('calls')}>
            Call Log
          </button>
        </div>

        {tab === 'vendors' && (
          <VendorsTab
            vendors={vendors}
            nextInRotation={nextInRotation}
            onRefresh={refresh}
            onError={setError}
            onSuccess={setSuccess}
            newCredentials={newCredentials}
            setNewCredentials={setNewCredentials}
          />
        )}
        {tab === 'leads' && <LeadsTab leads={leads} loading={loading} />}
        {tab === 'calls' && <CallsTab calls={calls} loading={loading} />}
      </div>
    </div>
  );
}

/* ---------------- Vendors Tab ---------------- */

function VendorsTab({ vendors, nextInRotation, onRefresh, onError, onSuccess, newCredentials, setNewCredentials }) {
  const [form, setForm] = useState({
    business_name: '',
    contact_name: '',
    email: '',
    phone_number: '',
    service_area: '',
    services: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleAdd = async (e) => {
    e.preventDefault();
    onError('');
    onSuccess('');
    setSubmitting(true);
    try {
      const res = await api.createVendor(form);
      setNewCredentials(res.credentials);
      onSuccess(`Vendor "${res.vendor.business_name}" added to round-robin.`);
      setForm({
        business_name: '',
        contact_name: '',
        email: '',
        phone_number: '',
        service_area: '',
        services: '',
      });
      await onRefresh();
    } catch (err) {
      onError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (vendor) => {
    try {
      await api.updateVendor(vendor.id, { is_active: !vendor.is_active });
      await onRefresh();
    } catch (err) {
      onError(err.message);
    }
  };

  const handleDelete = async (vendor) => {
    if (!confirm(`Delete "${vendor.business_name}"? This removes them from the rotation.`)) return;
    try {
      await api.deleteVendor(vendor.id);
      onSuccess(`Deleted "${vendor.business_name}".`);
      await onRefresh();
    } catch (err) {
      onError(err.message);
    }
  };

  const handleMove = async (vendor, direction) => {
    const sorted = [...vendors].sort((a, b) => a.rotation_order - b.rotation_order);
    const idx = sorted.findIndex((v) => v.id === vendor.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const newOrder = [...sorted];
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    try {
      await api.reorderVendors(newOrder.map((v) => v.id));
      await onRefresh();
    } catch (err) {
      onError(err.message);
    }
  };

  const handleRegenPwd = async (vendor) => {
    if (!confirm(`Generate a new password for ${vendor.business_name}? The old one will stop working.`)) return;
    try {
      const res = await api.regeneratePassword(vendor.id);
      setNewCredentials(res.credentials);
      onSuccess('New password generated.');
      await onRefresh();
    } catch (err) {
      onError(err.message);
    }
  };

  const startEdit = (v) => {
    setEditingId(v.id);
    setEditForm({
      business_name: v.business_name,
      contact_name: v.contact_name || '',
      email: v.email,
      phone_number: v.phone_number,
      service_area: v.service_area || '',
      services: v.services || '',
    });
  };

  const saveEdit = async (id) => {
    try {
      await api.updateVendor(id, editForm);
      setEditingId(null);
      onSuccess('Vendor updated.');
      await onRefresh();
    } catch (err) {
      onError(err.message);
    }
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback: select-all-able fields are already in the DOM
    }
  };

  return (
    <>
      {newCredentials && (
        <div className="credentials-banner">
          <strong>✓ Vendor account credentials</strong> — share these with the vendor (shown once):
          <div style={{ marginTop: 8 }}>
            Email: <code>{newCredentials.email}</code>{' '}
            <button className="copy-btn" onClick={() => copyText(newCredentials.email)}>Copy</button>
          </div>
          <div style={{ marginTop: 4 }}>
            Password: <code>{newCredentials.password}</code>{' '}
            <button className="copy-btn" onClick={() => copyText(newCredentials.password)}>Copy</button>
          </div>
          <button
            className="btn btn-outline"
            style={{ marginTop: 10, padding: '4px 10px', fontSize: '0.85rem' }}
            onClick={() => setNewCredentials(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="admin-card">
        <h2>Add Vendor to Round-Robin</h2>
        <p className="sub">
          Each new vendor automatically gets a login. They go to the bottom of the rotation.
        </p>
        <form onSubmit={handleAdd}>
          <div className="vendor-form-grid">
            <div>
              <label>Business name *</label>
              <input
                type="text"
                value={form.business_name}
                onChange={(e) => update('business_name', e.target.value)}
                required
              />
            </div>
            <div>
              <label>Contact name</label>
              <input
                type="text"
                value={form.contact_name}
                onChange={(e) => update('contact_name', e.target.value)}
              />
            </div>
            <div>
              <label>Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                required
              />
            </div>
            <div>
              <label>Phone (forwarded to) *</label>
              <input
                type="tel"
                placeholder="(555) 123-4567"
                value={form.phone_number}
                onChange={(e) => update('phone_number', e.target.value)}
                required
              />
            </div>
            <div>
              <label>Service area</label>
              <input
                type="text"
                placeholder="Denver Metro, CO"
                value={form.service_area}
                onChange={(e) => update('service_area', e.target.value)}
              />
            </div>
            <div>
              <label>Services (comma-separated)</label>
              <input
                type="text"
                placeholder="Water, Mold, Fire"
                value={form.services}
                onChange={(e) => update('services', e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-secondary" disabled={submitting}>
            {submitting ? 'Adding…' : '+ Add Vendor'}
          </button>
        </form>
      </div>

      <div className="admin-card">
        <h2>Round-Robin Rotation</h2>
        <p className="sub">
          Inbound calls to your 888 number are forwarded to the next active vendor in the list.
          Use the arrows to reorder. Highlighted row is next up.
        </p>

        {vendors.length === 0 ? (
          <div className="empty-state">
            No vendors yet. Add your first vendor above to start receiving routed calls.
          </div>
        ) : (
          <table className="vendors-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Business</th>
                <th>Contact</th>
                <th>Phone</th>
                <th>Calls</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...vendors]
                .sort((a, b) => a.rotation_order - b.rotation_order)
                .map((v, i) => (
                  <tr
                    key={v.id}
                    className={`${v.id === nextInRotation ? 'next-up' : ''} ${!v.is_active ? 'inactive' : ''}`}
                  >
                    <td data-label="#">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>{i + 1}</span>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                          onClick={() => handleMove(v, 'up')}
                          disabled={i === 0}
                          title="Move up"
                        >
                          ▲
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                          onClick={() => handleMove(v, 'down')}
                          disabled={i === vendors.length - 1}
                          title="Move down"
                        >
                          ▼
                        </button>
                      </div>
                    </td>
                    {editingId === v.id ? (
                      <>
                        <td data-label="Business">
                          <input
                            type="text"
                            value={editForm.business_name}
                            onChange={(e) => setEditForm({ ...editForm, business_name: e.target.value })}
                          />
                        </td>
                        <td data-label="Contact">
                          <input
                            type="text"
                            value={editForm.contact_name}
                            onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })}
                            placeholder="Contact"
                          />
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            style={{ marginTop: 4 }}
                          />
                        </td>
                        <td data-label="Phone">
                          <input
                            type="tel"
                            value={editForm.phone_number}
                            onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                          />
                        </td>
                        <td data-label="Calls">{v.total_calls}</td>
                        <td data-label="Status">
                          <span className={`badge ${v.is_active ? 'badge-active' : 'badge-inactive'}`}>
                            {v.is_active ? 'Active' : 'Paused'}
                          </span>
                        </td>
                        <td data-label="Actions">
                          <div className="row-actions">
                            <button className="btn btn-secondary" onClick={() => saveEdit(v.id)}>
                              Save
                            </button>
                            <button className="btn btn-outline" onClick={() => setEditingId(null)}>
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td data-label="Business">
                          <strong>{v.business_name}</strong>
                          {v.id === nextInRotation && v.is_active && (
                            <span className="badge badge-next" style={{ marginLeft: 8 }}>NEXT UP</span>
                          )}
                          {v.service_area && (
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{v.service_area}</div>
                          )}
                        </td>
                        <td data-label="Contact">
                          {v.contact_name || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{v.email}</div>
                        </td>
                        <td data-label="Phone">{formatPhone(v.phone_number)}</td>
                        <td data-label="Calls">{v.total_calls}</td>
                        <td data-label="Status">
                          <span className={`badge ${v.is_active ? 'badge-active' : 'badge-inactive'}`}>
                            {v.is_active ? 'Active' : 'Paused'}
                          </span>
                        </td>
                        <td data-label="Actions">
                          <div className="row-actions">
                            <button className="btn btn-outline" onClick={() => startEdit(v)}>
                              Edit
                            </button>
                            <button className="btn btn-outline" onClick={() => handleToggleActive(v)}>
                              {v.is_active ? 'Pause' : 'Resume'}
                            </button>
                            <button className="btn btn-outline" onClick={() => handleRegenPwd(v)}>
                              New PW
                            </button>
                            <button className="btn btn-danger" onClick={() => handleDelete(v)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

/* ---------------- Leads Tab ---------------- */

function LeadsTab({ leads, loading }) {
  if (loading) return <div className="admin-card">Loading…</div>;
  return (
    <div className="admin-card">
      <h2>Website Leads</h2>
      <p className="sub">Form submissions from the public website.</p>
      {leads.length === 0 ? (
        <div className="empty-state">No leads yet.</div>
      ) : (
        <table className="vendors-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Service</th>
              <th>ZIP</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Routed To</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id}>
                <td data-label="When">{new Date(l.created_at + 'Z').toLocaleString()}</td>
                <td data-label="Service">{l.service}</td>
                <td data-label="ZIP">{l.zip_code}</td>
                <td data-label="Name">{l.name || '—'}</td>
                <td data-label="Phone">{l.phone ? formatPhone(l.phone) : '—'}</td>
                <td data-label="Email">{l.email || '—'}</td>
                <td data-label="Routed To">{l.routed_business_name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ---------------- Calls Tab ---------------- */

function CallsTab({ calls, loading }) {
  if (loading) return <div className="admin-card">Loading…</div>;
  return (
    <div className="admin-card">
      <h2>Inbound Call Log</h2>
      <p className="sub">Every call routed through your 888 number. Status comes from Twilio after the dial completes.</p>
      {calls.length === 0 ? (
        <div className="empty-state">
          No calls routed yet. Calls will appear here once your Twilio webhook is wired up.
        </div>
      ) : (
        <table className="vendors-table">
          <thead>
            <tr>
              <th>When</th>
              <th>From</th>
              <th>Routed To</th>
              <th>Vendor Phone</th>
              <th>Status</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((c) => (
              <tr key={c.id}>
                <td data-label="When">{new Date(c.created_at + 'Z').toLocaleString()}</td>
                <td data-label="From">{c.caller_number ? formatPhone(c.caller_number) : '—'}</td>
                <td data-label="Routed To">{c.routed_business_name || '—'}</td>
                <td data-label="Vendor Phone">{c.routed_to_phone ? formatPhone(c.routed_to_phone) : '—'}</td>
                <td data-label="Status">
                  <span className={`badge ${c.status === 'completed' ? 'badge-active' : 'badge-inactive'}`}>
                    {c.status || '—'}
                  </span>
                </td>
                <td data-label="Duration">{c.duration ? `${c.duration}s` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ---------------- helpers ---------------- */

function formatPhone(num) {
  if (!num) return '';
  const digits = String(num).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return num;
}
