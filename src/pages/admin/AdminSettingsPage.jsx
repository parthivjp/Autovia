import { useEffect, useState } from 'react'
import { Building2, CircleHelp, Save } from 'lucide-react'
import { apiRequest } from '../../services/api'

const initialSettings = {
  businessName: '',
  contactEmail: '',
  contactPhone: '',
  businessAddress: '',
  gstPercent: '18',
  lateFeePerHour: '500',
  cancellationHours: '24',
}

export default function AdminSettingsPage() {
  const [form, setForm] = useState(initialSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    apiRequest('/api/v1/admin/resources')
      .then(({ settings }) => setForm({
        businessName: settings.businessName || '',
        contactEmail: settings.contactEmail || '',
        contactPhone: settings.contactPhone || '',
        businessAddress: settings.businessAddress || '',
        gstPercent: String((settings.gstRate ?? 0.18) * 100),
        lateFeePerHour: String(settings.lateFeePerHour ?? 500),
        cancellationHours: String(settings.cancellationHours ?? 24),
      }))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const { settings } = await apiRequest('/api/v1/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          businessName: form.businessName,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
          businessAddress: form.businessAddress,
          gstRate: Number(form.gstPercent) / 100,
          lateFeePerHour: Number(form.lateFeePerHour),
          cancellationHours: Number(form.cancellationHours),
        }),
      })
      setForm((current) => ({ ...current, gstPercent: String(settings.gstRate * 100) }))
      setNotice('Business settings saved. New price quotes will use the updated GST rate.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-settings-page">
      {error && <div className="admin-alert error" role="alert">{error}</div>}
      {notice && <div className="admin-alert success" role="status">{notice}</div>}
      {loading ? <div className="admin-panel admin-loading">Loading business settings…</div> : (
        <form className="admin-panel admin-settings-form" onSubmit={handleSubmit}>
          <div className="admin-section-heading">
            <div><span className="admin-settings-icon"><Building2 size={19} /></span><h2>Business profile</h2><p>These details help customers identify and contact your rental business.</p></div>
          </div>
          <div className="admin-settings-grid">
            <AdminField label="Business name"><input value={form.businessName} onChange={(event) => setForm({ ...form, businessName: event.target.value })} required /></AdminField>
            <AdminField label="Contact email"><input type="email" value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} /></AdminField>
            <AdminField label="Contact phone"><input type="tel" value={form.contactPhone} onChange={(event) => setForm({ ...form, contactPhone: event.target.value })} /></AdminField>
            <AdminField label="Business address"><textarea rows="3" value={form.businessAddress} onChange={(event) => setForm({ ...form, businessAddress: event.target.value })} /></AdminField>
          </div>

          <div className="admin-settings-divider" />
          <div className="admin-section-heading">
            <div><h2>Pricing & policies</h2><p>These settings are applied to new quotes and return charges.</p></div>
          </div>
          <div className="admin-settings-grid policy">
            <AdminField label="GST percentage"><div className="admin-input-suffix"><input type="number" min="0" max="100" step="0.01" value={form.gstPercent} onChange={(event) => setForm({ ...form, gstPercent: event.target.value })} required /><span>%</span></div></AdminField>
            <AdminField label="Late return charge per hour"><div className="admin-input-suffix"><span>₹</span><input type="number" min="0" step="1" value={form.lateFeePerHour} onChange={(event) => setForm({ ...form, lateFeePerHour: event.target.value })} required /></div></AdminField>
            <AdminField label="Cancellation cut-off"><div className="admin-input-suffix"><input type="number" min="0" step="1" value={form.cancellationHours} onChange={(event) => setForm({ ...form, cancellationHours: event.target.value })} required /><span>hours</span></div></AdminField>
          </div>

          <div className="admin-settings-note"><CircleHelp size={17} /><span>GST changes affect quotes generated after saving. Existing bookings keep their original price breakdown.</span></div>
          <div className="admin-form-actions"><button type="submit" className="admin-button primary" disabled={saving}><Save size={16} />{saving ? 'Saving settings…' : 'Save settings'}</button></div>
        </form>
      )}
    </div>
  )
}

function AdminField({ label, children }) {
  return <label className="admin-field"><span>{label}</span>{children}</label>
}
