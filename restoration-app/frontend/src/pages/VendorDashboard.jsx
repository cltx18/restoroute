import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { vendorApi, setVendorToken, getVendorToken } from '../api.js';

export default function VendorDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [vendor, setVendor] = useState(null);
  const [stats, setStats] = useState(null);
  const [calls, setCalls] = useState([]);
  const [leads, setLeads] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getVendorToken()) {
      navigate('/vendor/login');
      return;
    }
    refresh();
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const [me, s, c, l] = await Promise.all([
        vendorApi.me(),
        vendorApi.stats(),
        vendorApi.calls(),
        vendorApi.leads(),
      ]);
      setVendor(me.vendor);
      setStats(s);
      setCalls(c.calls || []);
      setLeads(l.leads || []);
    } catch (err) {
      if (err.status === 401) {
        setVendorToken(null);
        navigate('/vendor/login');
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setVendorToken(null);
    navigate('/vendor/login');
  };

  const togglePause = async () => {
    try {
      const res = await vendorApi.togglePause(!vendor.is_active);
      setVendor(res.vendor);
      setSuccess(res.vendor.is_active ? 'You are now active in the rotation.' : 'You are paused. New calls will skip you.');
    } catch (err) {
      setError(err.message);
    }
  };

  if (!vendor) return <div className="admin-shell"><div className="container" style={{ padding: 40 }}>Loading…</div></div>;

  return (
    <div className="admin-shell">
      <div className="admin-header">
        <div className="container admin-header-inner">
          <h1>🛠️ {vendor.business_name}</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className={`badge ${vendor.is_active ? 'badge-active' : 'badge-inactive'}`}>
              {vendor.is_active ? 'Active in rotation' : 'Paused'}
            </span>
            <button className="btn btn-outline" onClick={togglePause} style={{ background: '#fff' }}>
              {vendor.is_active ? 'Pause Me' : 'Resume'}
            </button>
            <button className="btn btn-outline" onClick={logout} style={{ background: '#fff' }}>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        {error && <div className="alert alert-error" onClick={() => setError('')}>{error}</div>}
        {success && <div className="alert alert-success" onClick={() => setSuccess('')}>{success}</div>}

        {stats && (
          <div className="kpi-grid">
            <div className="kpi"><div className="label">Calls Routed to You</div><div className="value">{stats.total_calls}</div></div>
            <div className="kpi"><div className="label">Connected Calls</div><div className="value">{stats.completed_calls}</div></div>
            <div className="kpi"><div className="label">Leads Routed to You</div><div className="value">{stats.total_leads}</div></div>
            <div className="kpi"><div className="label">New Leads</div><div className="value">{stats.new_leads}</div></div>
            <div className="kpi"><div className="label">Won</div><div className="value">{stats.won_leads}</div></div>
          </div>
        )}

        <div className="admin-tabs">
          <button className={`admin-tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Overview</button>
          <button className={`admin-tab ${tab === 'calls' ? 'active' : ''}`} onClick={() => setTab('calls')}>Calls</button>
          <button className={`admin-tab ${tab === 'leads' ? 'active' : ''}`} onClick={() => setTab('leads')}>Leads</button>
          <button className={`admin-tab ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>Profile</button>
        </div>

        {tab === 'overview' && <OverviewTab calls={calls} leads={leads} />}
        {tab === 'calls' && <VendorCallsTab calls={calls} onRefresh={refresh} onError={setError} onSuccess={setSuccess} />}
        {tab === 'leads' && <VendorLeadsTab leads={leads} onRefresh={refresh} onError={setError} onSuccess={setSuccess} />}
        {tab === 'profile' && <ProfileTab vendor={vendor} setVendor={setVendor} onError={setError} onSuccess={setSuccess} />}
      </div>
    </div>
  );
}

/* ----- Overview ----- */
function OverviewTab({ calls, leads }) {
  const recentCalls = calls.slice(0, 5);
  const recentLeads = leads.slice(0, 5);

  return (
    <>
      <div className="admin-card">
        <h2>Recent Calls</h2>
        {recentCalls.length === 0 ? (
          <div className="empty-state">No calls yet. Calls forwarded to you will appear here.</div>
        ) : (
          <ul style={{ listStyle: 'none' }}>
            {recentCalls.map((c) => (
              <li key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <strong>{formatPhone(c.caller_number)}</strong> — {c.status} ({c.duration || 0}s)
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginLeft: 8 }}>
                  {new Date(c.created_at + 'Z').toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="admin-card">
        <h2>Recent Leads</h2>
        {recentLeads.length === 0 ? (
          <div className="empty-state">No leads yet. Form submissions routed to you will appear here.</div>
        ) : (
          <ul style={{ listStyle: 'none' }}>
            {recentLeads.map((l) => (
              <li key={l.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <strong>{l.name || 'Anonymous'}</strong> — {l.service} ({l.zip_code})
                <span className={`badge badge-${l.status === 'won' ? 'active' : l.status === 'lost' ? 'inactive' : 'next'}`} style={{ marginLeft: 8 }}>
                  {l.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

/* ----- Calls Tab ----- */
function VendorCallsTab({ calls, onRefresh, onError, onSuccess }) {
  const token = getVendorToken();

  const updateNotes = async (id, notes) => {
    try {
      await vendorApi.updateCallNotes(id, notes);
      onSuccess('Notes saved.');
    } catch (err) {
      onError(err.message);
    }
  };

  return (
    <div className="admin-card">
      <h2>Your Call History</h2>
      <p className="sub">Every call routed to you, with recording and transcript when available.</p>
      {calls.length === 0 ? (
        <div className="empty-state">No calls yet.</div>
      ) : (
        <table className="vendors-table">
          <thead>
            <tr>
              <th>When</th>
              <th>From</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Recording</th>
              <th>Transcript</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((c) => (
              <tr key={c.id}>
                <td data-label="When">{new Date(c.created_at + 'Z').toLocaleString()}</td>
                <td data-label="From">{formatPhone(c.caller_number)}</td>
                <td data-label="Status">
                  <span className={`badge ${c.status === 'completed' ? 'badge-active' : 'badge-inactive'}`}>
                    {c.status}
                  </span>
                </td>
                <td data-label="Duration">{c.duration || 0}s</td>
                <td data-label="Recording">
                  {c.recording_sid ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <audio
                        controls
                        preload="none"
                        src={`/api/recordings/${c.id}.mp3?token=${encodeURIComponent(token)}`}
                        style={{ height: 32, width: 200 }}
                      />
                      <a
                        href={`/api/recordings/${c.id}.mp3?download=1&token=${encodeURIComponent(token)}`}
                        style={{ fontSize: '0.82rem' }}
                      >
                        ⬇ Download MP3
                      </a>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                  )}
                </td>
                <td data-label="Transcript">
                  {c.transcription_text ? (
                    <details>
                      <summary style={{ cursor: 'pointer', fontSize: '0.85rem' }}>View / Download</summary>
                      <p style={{ marginTop: 6, fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 320 }}>
                        {c.transcription_text}
                      </p>
                      <a
                        href={`/api/recordings/${c.id}/transcript.txt?download=1&token=${encodeURIComponent(token)}`}
                        style={{ fontSize: '0.82rem' }}
                      >
                        ⬇ Download .txt
                      </a>
                    </details>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {c.transcription_status === 'in-progress' ? 'Processing…' : '—'}
                    </span>
                  )}
                </td>
                <td data-label="Notes">
                  <NotesEditor
                    initial={c.notes || ''}
                    onSave={(v) => updateNotes(c.id, v)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ----- Leads Tab ----- */
function VendorLeadsTab({ leads, onRefresh, onError, onSuccess }) {
  const updateLead = async (id, payload) => {
    try {
      await vendorApi.updateLead(id, payload);
      onSuccess('Lead updated.');
      await onRefresh();
    } catch (err) {
      onError(err.message);
    }
  };

  return (
    <div className="admin-card">
      <h2>Your Leads</h2>
      <p className="sub">Form submissions routed to you. Update status as you work them.</p>
      {leads.length === 0 ? (
        <div className="empty-state">No leads yet.</div>
      ) : (
        <table className="vendors-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Service</th>
              <th>Customer</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id}>
                <td data-label="When">{new Date(l.created_at + 'Z').toLocaleString()}</td>
                <td data-label="Service">
                  {l.service}
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>ZIP {l.zip_code}</div>
                </td>
                <td data-label="Customer">{l.name || '—'}</td>
                <td data-label="Contact">
                  {l.phone && <div>{formatPhone(l.phone)}</div>}
                  {l.email && <div style={{ fontSize: '0.85rem' }}>{l.email}</div>}
                  {l.notes && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>"{l.notes}"</div>}
                </td>
                <td data-label="Status">
                  <select
                    value={l.status}
                    onChange={(e) => updateLead(l.id, { status: e.target.value })}
                    style={{ fontSize: '0.85rem', padding: '4px 8px' }}
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="quoted">Quoted</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                </td>
                <td data-label="Notes">
                  <NotesEditor
                    initial={l.vendor_notes || ''}
                    onSave={(v) => updateLead(l.id, { vendor_notes: v })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ----- Profile Tab ----- */
function ProfileTab({ vendor, setVendor, onError, onSuccess }) {
  const [form, setForm] = useState({
    contact_name: vendor.contact_name || '',
    phone_number: vendor.phone_number || '',
    service_area: vendor.service_area || '',
  });
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [submitting, setSubmitting] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await vendorApi.updateProfile(form);
      setVendor(res.vendor);
      onSuccess('Profile updated.');
    } catch (err) {
      onError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.next.length < 8) return onError('New password must be at least 8 characters.');
    if (pwForm.next !== pwForm.confirm) return onError('Passwords do not match.');
    try {
      await vendorApi.changePassword(pwForm.current, pwForm.next);
      onSuccess('Password changed.');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      onError(err.message);
    }
  };

  return (
    <>
      <div className="admin-card">
        <h2>Business Profile</h2>
        <p className="sub">Update your contact info and service area. Email and business name can only be changed by the admin.</p>
        <form onSubmit={saveProfile}>
          <div className="vendor-form-grid">
            <div>
              <label>Business name</label>
              <input type="text" value={vendor.business_name} disabled />
            </div>
            <div>
              <label>Email (login)</label>
              <input type="email" value={vendor.email} disabled />
            </div>
            <div>
              <label>Contact name</label>
              <input
                type="text"
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              />
            </div>
            <div>
              <label>Phone number (calls forwarded here)</label>
              <input
                type="tel"
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
              />
            </div>
            <div>
              <label>Service area</label>
              <input
                type="text"
                value={form.service_area}
                onChange={(e) => setForm({ ...form, service_area: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-secondary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div className="admin-card">
        <h2>Change Password</h2>
        <form onSubmit={changePassword}>
          <div className="vendor-form-grid">
            <div>
              <label>Current password</label>
              <input type="password" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} required />
            </div>
            <div>
              <label>New password</label>
              <input type="password" value={pwForm.next} onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })} required minLength={8} />
            </div>
            <div>
              <label>Confirm new password</label>
              <input type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} required />
            </div>
          </div>
          <button type="submit" className="btn btn-secondary">Change Password</button>
        </form>
      </div>
    </>
  );
}

/* ----- Helpers ----- */
function NotesEditor({ initial, onSave }) {
  const [value, setValue] = useState(initial);
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div onClick={() => setEditing(true)} style={{ cursor: 'pointer', minWidth: 120, fontSize: '0.85rem' }}>
        {value || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Click to add note…</span>}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={2}
        style={{ fontSize: '0.85rem', padding: 6, minWidth: 160 }}
        autoFocus
      />
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          className="btn btn-secondary"
          style={{ padding: '4px 8px', fontSize: '0.78rem' }}
          onClick={() => { onSave(value); setEditing(false); }}
        >
          Save
        </button>
        <button
          className="btn btn-outline"
          style={{ padding: '4px 8px', fontSize: '0.78rem' }}
          onClick={() => { setValue(initial); setEditing(false); }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function formatPhone(num) {
  if (!num) return '—';
  const digits = String(num).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return num;
}
