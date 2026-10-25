import { useEffect, useState } from 'react'
import { Building2, CircleHelp, KeyRound, Save, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
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

const initialProfile = { name: '', email: '', phone: '' }
const initialPassword = { currentPassword: '', newPassword: '', confirmPassword: '' }

export default function AdminSettingsPage() {
  const { updateUser } = useAuth()
  const [settings, setSettings] = useState(initialSettings)
  const [profile, setProfile] = useState(initialProfile)
  const [password, setPassword] = useState(initialPassword)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [settingsError, setSettingsError] = useState('')
  const [profileError, setProfileError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [settingsNotice, setSettingsNotice] = useState('')
  const [profileNotice, setProfileNotice] = useState('')
  const [passwordNotice, setPasswordNotice] = useState('')

  useEffect(() => {
    apiRequest('/api/v1/admin/profile')
      .then(({ user }) => setProfile({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      }))
      .catch((requestError) => setProfileError(requestError.message))
      .finally(() => setProfileLoading(false))

    apiRequest('/api/v1/admin/resources')
      .then(({ settings: businessSettings }) => setSettings({
        businessName: businessSettings.businessName || '',
        contactEmail: businessSettings.contactEmail || '',
        contactPhone: businessSettings.contactPhone || '',
        businessAddress: businessSettings.businessAddress || '',
        gstPercent: String((businessSettings.gstRate ?? 0.18) * 100),
        lateFeePerHour: String(businessSettings.lateFeePerHour ?? 500),
        cancellationHours: String(businessSettings.cancellationHours ?? 24),
      }))
      .catch((requestError) => setSettingsError(requestError.message))
      .finally(() => setSettingsLoading(false))
  }, [])

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    setProfileSaving(true)
    setProfileError('')
    setProfileNotice('')
    try {
      const { user } = await apiRequest('/api/v1/admin/profile', {
        method: 'PATCH',
        body: JSON.stringify(profile),
      })
      setProfile({ name: user.name, email: user.email, phone: user.phone || '' })
      updateUser(user)
      setProfileNotice('Administrator profile updated.')
    } catch (requestError) {
      setProfileError(requestError.message)
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    setPasswordError('')
    setPasswordNotice('')
    if (password.newPassword !== password.confirmPassword) {
      setPasswordError('The new password and confirmation do not match.')
      return
    }

    setPasswordSaving(true)
    try {
      const result = await apiRequest('/api/v1/admin/profile/password', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: password.currentPassword,
          newPassword: password.newPassword,
        }),
      })
      setPassword(initialPassword)
      setPasswordNotice(result.message)
    } catch (requestError) {
      setPasswordError(requestError.message)
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleSettingsSubmit = async (event) => {
    event.preventDefault()
    setSettingsSaving(true)
    setSettingsError('')
    setSettingsNotice('')
    try {
      const { settings: savedSettings } = await apiRequest('/api/v1/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          businessName: settings.businessName,
          contactEmail: settings.contactEmail,
          contactPhone: settings.contactPhone,
          businessAddress: settings.businessAddress,
          gstRate: Number(settings.gstPercent) / 100,
          lateFeePerHour: Number(settings.lateFeePerHour),
          cancellationHours: Number(settings.cancellationHours),
        }),
      })
      setSettings((current) => ({ ...current, gstPercent: String(savedSettings.gstRate * 100) }))
      setSettingsNotice('Business settings saved. New price quotes will use the updated GST rate.')
    } catch (requestError) {
      setSettingsError(requestError.message)
    } finally {
      setSettingsSaving(false)
    }
  }

  return (
    <div className="admin-settings-page admin-settings-stack">
      <section className="admin-panel admin-settings-form">
        <div className="admin-section-heading">
          <div>
            <span className="admin-settings-icon"><UserRound size={19} /></span>
            <h2>Administrator profile</h2>
            <p>Update the name and contact details associated with your admin account.</p>
          </div>
        </div>
        {profileError && <div className="admin-alert error" role="alert">{profileError}</div>}
        {profileNotice && <div className="admin-alert success" role="status">{profileNotice}</div>}
        {profileLoading ? <div className="admin-loading">Loading administrator profile…</div> : (
          <form className="admin-form" onSubmit={handleProfileSubmit}>
            <div className="admin-settings-grid">
              <AdminField label="Full name">
                <input autoComplete="name" maxLength="100" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required />
              </AdminField>
              <AdminField label="Email address">
                <input autoComplete="email" type="email" maxLength="254" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} required />
              </AdminField>
              <AdminField label="Phone number">
                <input autoComplete="tel" type="tel" maxLength="32" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} />
              </AdminField>
            </div>
            <div className="admin-form-actions">
              <button type="submit" className="admin-button primary" disabled={profileSaving || profileLoading}>
                <Save size={16} />{profileSaving ? 'Saving profile…' : 'Save profile'}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="admin-panel admin-settings-form">
        <div className="admin-section-heading">
          <div>
            <span className="admin-settings-icon"><ShieldCheck size={19} /></span>
            <h2>Password & security</h2>
            <p>Use your current password to verify your identity before setting a new one.</p>
          </div>
        </div>
        {passwordError && <div className="admin-alert error" role="alert">{passwordError}</div>}
        {passwordNotice && <div className="admin-alert success" role="status">{passwordNotice}</div>}
        <form className="admin-form" onSubmit={handlePasswordSubmit}>
          <div className="admin-settings-grid">
            <AdminField label="Current password">
              <input autoComplete="current-password" type="password" value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} required />
            </AdminField>
            <span className="admin-settings-password-spacer" aria-hidden="true" />
            <AdminField label="New password">
              <input autoComplete="new-password" type="password" minLength="8" value={password.newPassword} onChange={(event) => setPassword({ ...password, newPassword: event.target.value })} required />
            </AdminField>
            <AdminField label="Confirm new password">
              <input autoComplete="new-password" type="password" minLength="8" value={password.confirmPassword} onChange={(event) => setPassword({ ...password, confirmPassword: event.target.value })} required />
            </AdminField>
          </div>
          <div className="admin-settings-note"><KeyRound size={17} /><span>Choose a password with at least 8 characters. Your password is stored securely as a one-way hash.</span></div>
          <div className="admin-form-actions">
            <button type="submit" className="admin-button primary" disabled={passwordSaving}>
              <ShieldCheck size={16} />{passwordSaving ? 'Updating password…' : 'Update password'}
            </button>
          </div>
        </form>
      </section>

      {settingsError && <div className="admin-alert error" role="alert">{settingsError}</div>}
      {settingsNotice && <div className="admin-alert success" role="status">{settingsNotice}</div>}
      {settingsLoading ? <div className="admin-panel admin-loading">Loading business settings…</div> : (
        <form className="admin-panel admin-settings-form" onSubmit={handleSettingsSubmit}>
          <div className="admin-section-heading">
            <div><span className="admin-settings-icon"><Building2 size={19} /></span><h2>Business profile</h2><p>These details help customers identify and contact your rental business.</p></div>
          </div>
          <div className="admin-settings-grid">
            <AdminField label="Business name"><input value={settings.businessName} onChange={(event) => setSettings({ ...settings, businessName: event.target.value })} required /></AdminField>
            <AdminField label="Contact email"><input type="email" value={settings.contactEmail} onChange={(event) => setSettings({ ...settings, contactEmail: event.target.value })} /></AdminField>
            <AdminField label="Contact phone"><input type="tel" value={settings.contactPhone} onChange={(event) => setSettings({ ...settings, contactPhone: event.target.value })} /></AdminField>
            <AdminField label="Business address"><textarea rows="3" value={settings.businessAddress} onChange={(event) => setSettings({ ...settings, businessAddress: event.target.value })} /></AdminField>
          </div>

          <div className="admin-settings-divider" />
          <div className="admin-section-heading">
            <div><h2>Pricing & policies</h2><p>These settings are applied to new quotes and return charges.</p></div>
          </div>
          <div className="admin-settings-grid policy">
            <AdminField label="GST percentage"><div className="admin-input-suffix"><input type="number" min="0" max="100" step="0.01" value={settings.gstPercent} onChange={(event) => setSettings({ ...settings, gstPercent: event.target.value })} required /><span>%</span></div></AdminField>
            <AdminField label="Late return charge per hour"><div className="admin-input-suffix"><span>₹</span><input type="number" min="0" step="1" value={settings.lateFeePerHour} onChange={(event) => setSettings({ ...settings, lateFeePerHour: event.target.value })} required /></div></AdminField>
            <AdminField label="Cancellation cut-off"><div className="admin-input-suffix"><input type="number" min="0" step="1" value={settings.cancellationHours} onChange={(event) => setSettings({ ...settings, cancellationHours: event.target.value })} required /><span>hours</span></div></AdminField>
          </div>

          <div className="admin-settings-note"><CircleHelp size={17} /><span>GST changes affect quotes generated after saving. Existing bookings keep their original price breakdown.</span></div>
          <div className="admin-form-actions"><button type="submit" className="admin-button primary" disabled={settingsSaving || settingsLoading}><Save size={16} />{settingsSaving ? 'Saving settings…' : 'Save settings'}</button></div>
        </form>
      )}
    </div>
  )
}

function AdminField({ label, children }) {
  return <label className="admin-field"><span>{label}</span>{children}</label>
}
