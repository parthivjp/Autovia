import { useEffect, useState } from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { apiRequest } from '../../services/api'

const sections = [
  { id: 'car-types', label: 'Car types', name: 'Car type', fields: ['name', 'image', 'sortOrder', 'active'] },
  { id: 'locations', label: 'Locations', name: 'Pickup location', fields: ['name', 'city', 'address', 'active'] },
  { id: 'addons', label: 'Add-ons', name: 'Add-on', fields: ['name', 'description', 'price', 'active'] },
  { id: 'banners', label: 'Banners', name: 'Homepage banner', fields: ['eyebrow', 'title', 'subtitle', 'image', 'link', 'sortOrder', 'active'] },
  { id: 'festivals', label: 'Festival rates', name: 'Festival rate', fields: ['name', 'date', 'multiplier'] },
  { id: 'service-blocks', label: 'Service blocks', name: 'Service block' },
]
const emptyService = { carId: '', date: '', reason: '' }
const emptyFor = (section) => section.fields?.reduce((form, field) => ({ ...form, [field]: field === 'active' ? true : field === 'sortOrder' || field === 'price' ? 0 : field === 'multiplier' ? 1 : '' }), {}) || {}

export default function AdminContentPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = sections.some((section) => section.id === searchParams.get('tab')) ? searchParams.get('tab') : 'car-types'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [data, setData] = useState({})
  const [cars, setCars] = useState([])
  const [form, setForm] = useState(emptyFor(sections[0]))
  const [serviceForm, setServiceForm] = useState(emptyService)
  const [editingId, setEditingId] = useState('')
  const [editingServiceId, setEditingServiceId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const currentSection = sections.find((section) => section.id === activeTab) || sections[0]
  const entries = data[activeTab] || []
  const load = () => {
    setLoading(true)
    setError('')
    Promise.all([apiRequest('/api/v1/admin/resources'), apiRequest('/api/v1/admin/cars')])
      .then(([resources, carResult]) => {
        setData(resources)
        setCars(carResult.cars)
        if (!serviceForm.carId && carResult.cars.length) setServiceForm((current) => ({ ...current, carId: carResult.cars[0].id }))
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    let active = true
    Promise.all([apiRequest('/api/v1/admin/resources'), apiRequest('/api/v1/admin/cars')])
      .then(([resources, carResult]) => {
        if (!active) return
        setData(resources)
        setCars(carResult.cars)
        if (carResult.cars.length) setServiceForm((current) => ({ ...current, carId: carResult.cars[0].id }))
      })
      .catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const selectTab = (tab) => {
    setActiveTab(tab)
    setSearchParams({ tab }, { replace: true })
    setEditingId('')
    setForm(emptyFor(sections.find((section) => section.id === tab)))
    setNotice('')
    setError('')
  }

  const editItem = (item) => {
    setEditingId(item.id)
    setForm(Object.fromEntries(currentSection.fields.map((field) => [field, item[field] ?? (field === 'active' ? true : '')])))
    setNotice('')
  }

  const saveItem = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    const payload = { ...form }
    for (const field of ['sortOrder', 'price', 'multiplier']) {
      if (payload[field] !== undefined && payload[field] !== '') payload[field] = Number(payload[field])
    }
    try {
      const path = activeTab === 'locations'
        ? `/api/v1/admin/locations${editingId ? `/${editingId}` : ''}`
        : `/api/v1/admin/resources/${activeTab}${editingId ? `/${editingId}` : ''}`
      const response = await apiRequest(path, { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(payload) })
      const item = response.location || response.item
      setData((current) => ({
        ...current,
        [activeTab]: editingId
          ? current[activeTab].map((entry) => entry.id === item.id ? item : entry)
          : [...current[activeTab], item],
      }))
      setEditingId('')
      setForm(emptyFor(currentSection))
      setNotice(`${currentSection.name} ${editingId ? 'updated' : 'added'} successfully.`)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteItem = async (item) => {
    const label = item.name || item.title || item.carName || currentSection.name
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return
    setError('')
    try {
      const path = activeTab === 'locations'
        ? `/api/v1/admin/locations/${item.id}`
        : `/api/v1/admin/resources/${activeTab}/${item.id}`
      await apiRequest(path, { method: 'DELETE' })
      setData((current) => ({ ...current, [activeTab]: current[activeTab].filter((entry) => entry.id !== item.id) }))
      setNotice(`${currentSection.name} deleted.`)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const addServiceBlock = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const { item } = await apiRequest(`/api/v1/admin/service-blocks${editingServiceId ? `/${editingServiceId}` : ''}`, {
        method: editingServiceId ? 'PATCH' : 'POST',
        body: JSON.stringify(serviceForm),
      })
      setData((current) => ({
        ...current,
        serviceBlocks: (editingServiceId
          ? current.serviceBlocks.map((block) => block.id === item.id ? item : block)
          : [...(current.serviceBlocks || []), item]).sort((a, b) => a.date.localeCompare(b.date)),
      }))
      setNotice(editingServiceId ? 'Service block updated.' : `${item.carName} is marked under service on ${item.date}.`)
      setEditingServiceId('')
      setServiceForm((current) => ({ ...current, date: '', reason: '' }))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const editServiceBlock = (item) => {
    setEditingServiceId(item.id)
    setServiceForm({ carId: item.carId, date: item.date, reason: item.reason || '' })
    setNotice('')
    setError('')
  }

  const removeServiceBlock = async (item) => {
    setError('')
    try {
      await apiRequest(`/api/v1/admin/service-blocks/${item.id}`, { method: 'DELETE' })
      setData((current) => ({ ...current, serviceBlocks: current.serviceBlocks.filter((entry) => entry.id !== item.id) }))
      setNotice('Service block removed. The date is available to book again.')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const currentItems = entries

  return (
    <div className="admin-stack">
      {error && <div className="admin-alert error" role="alert">{error}<button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button></div>}
      {notice && <div className="admin-alert success" role="status">{notice}</div>}
      <section className="admin-panel">
        <div className="admin-content-tabs" role="tablist" aria-label="Website content categories">
          {sections.map((section) => <button type="button" role="tab" aria-selected={activeTab === section.id} className={activeTab === section.id ? 'active' : ''} key={section.id} onClick={() => selectTab(section.id)}>{section.label}</button>)}
        </div>
      </section>

      {activeTab === 'service-blocks' ? (
        <>
          <section className="admin-panel">
            <div className="admin-section-heading"><div><h2>Block dates for maintenance</h2><p>Blocked dates are immediately shown as unavailable to customers.</p></div></div>
            <form className="admin-form admin-content-form" onSubmit={addServiceBlock}>
              <AdminField label="Vehicle"><select value={serviceForm.carId} onChange={(event) => setServiceForm({ ...serviceForm, carId: event.target.value })} required><option value="">Select a car</option>{cars.map((car) => <option value={car.id} key={car.id}>{car.name}</option>)}</select></AdminField>
              <AdminField label="Service date"><input type="date" value={serviceForm.date} onChange={(event) => setServiceForm({ ...serviceForm, date: event.target.value })} required /></AdminField>
              <AdminField label="Reason"><input value={serviceForm.reason} onChange={(event) => setServiceForm({ ...serviceForm, reason: event.target.value })} placeholder="Scheduled maintenance" /></AdminField>
              <div className="admin-form-actions"><button className="admin-button primary" type="submit" disabled={saving || !cars.length}><Plus size={16} />{editingServiceId ? 'Save service block' : 'Add blocked date'}</button>{editingServiceId && <button className="admin-button secondary" type="button" onClick={() => { setEditingServiceId(''); setServiceForm(emptyService) }}>Cancel</button>}</div>
            </form>
          </section>
          <section className="admin-panel">
            <div className="admin-section-heading"><div><h2>Scheduled service blocks</h2><p>Remove a block when the vehicle is ready for rental.</p></div></div>
            {loading ? <div className="admin-empty">Loading service blocks…</div> : currentItems.length ? (
              <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Car</th><th>Date</th><th>Reason</th><th>Action</th></tr></thead><tbody>{currentItems.map((item) => <tr key={item.id}><td>{item.carName}</td><td>{item.date}</td><td>{item.reason || 'Under service'}</td><td><div className="admin-row-actions"><button className="admin-icon-button" type="button" aria-label={`Edit ${item.carName} service block`} onClick={() => editServiceBlock(item)}><Pencil size={15} /></button><button className="admin-icon-button danger" type="button" aria-label={`Remove ${item.carName} service block`} onClick={() => removeServiceBlock(item)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>
            ) : <div className="admin-empty">No service blocks scheduled.</div>}
          </section>
        </>
      ) : (
        <div className="admin-content-grid">
          <section className="admin-panel">
            <div className="admin-section-heading"><div><h2>{editingId ? `Edit ${currentSection.name.toLowerCase()}` : `Add ${currentSection.name.toLowerCase()}`}</h2><p>Changes are reflected on the customer website.</p></div></div>
            <form className="admin-form admin-content-form single" onSubmit={saveItem}>
              {currentSection.fields.map((field) => (
                field === 'active'
                  ? <label className="admin-checkbox" key={field}><input type="checkbox" checked={Boolean(form.active)} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Visible to customers</label>
                  : <AdminField key={field} label={fieldLabel(field)}>{field === 'subtitle' || field === 'description' || field === 'address'
                    ? <textarea rows="3" value={form[field] || ''} onChange={(event) => setForm({ ...form, [field]: event.target.value })} />
                    : <input type={field === 'date' ? 'date' : ['price', 'sortOrder', 'multiplier'].includes(field) ? 'number' : 'text'} min={['price', 'sortOrder'].includes(field) ? 0 : field === 'multiplier' ? 1 : undefined} step={field === 'multiplier' ? '0.01' : '1'} value={form[field] ?? ''} onChange={(event) => setForm({ ...form, [field]: event.target.value })} required={['name', 'title', 'date'].includes(field)} />}
                  </AdminField>
              ))}
              <div className="admin-form-actions"><button className="admin-button primary" type="submit" disabled={saving}><Plus size={16} />{saving ? 'Saving…' : editingId ? 'Save changes' : `Add ${currentSection.name.toLowerCase()}`}</button>{editingId && <button className="admin-button secondary" type="button" onClick={() => { setEditingId(''); setForm(emptyFor(currentSection)) }}>Cancel</button>}</div>
            </form>
          </section>

          <section className="admin-panel">
            <div className="admin-section-heading"><div><h2>{currentSection.label}</h2><p>{currentItems.length} record{currentItems.length === 1 ? '' : 's'}.</p></div><button className="admin-icon-button" type="button" onClick={load} aria-label="Refresh content"><Check size={16} /></button></div>
            {loading ? <div className="admin-empty">Loading content…</div> : currentItems.length ? (
              <div className="admin-managed-list">{currentItems.map((item) => {
                const title = item.name || item.title || item.carName || currentSection.name
                const subtext = activeTab === 'locations'
                  ? `${item.city || ''}${item.address ? ` · ${item.address}` : ''}`
                  : activeTab === 'festivals' ? `${item.date} · ${Math.round(item.multiplier * 100)}% rate`
                    : activeTab === 'addons' ? `${item.description || 'Add-on'} · ${currency(item.price)}`
                      : activeTab === 'banners' ? item.subtitle || item.image || item.link
                        : activeTab === 'car-types' ? item.slug : item.reason || 'Scheduled service'
                return (
                  <article className="admin-managed-item" key={item.id}>
                    <div>{item.image && activeTab === 'banners' && <img className="admin-banner-thumb" src={item.image} alt="" />}<strong>{title}</strong><small>{subtext}</small>{item.active !== undefined && <span className={`admin-status ${item.active ? 'confirmed' : 'cancelled'}`}>{item.active ? 'Active' : 'Hidden'}</span>}</div>
                    <div className="admin-row-actions"><button className="admin-icon-button" type="button" onClick={() => editItem(item)} aria-label={`Edit ${title}`}><Pencil size={15} /></button><button className="admin-icon-button danger" type="button" onClick={() => deleteItem(item)} aria-label={`Delete ${title}`}><Trash2 size={15} /></button></div>
                  </article>
                )
              })}</div>
            ) : <div className="admin-empty">No {currentSection.label.toLowerCase()} have been added yet.</div>}
          </section>
        </div>
      )}
    </div>
  )
}

function AdminField({ label, children }) {
  return <label className="admin-field"><span>{labelField(label)}</span>{children}</label>
}

function fieldLabel(field) {
  return ({
    name: 'Name', city: 'City', address: 'Address', image: 'Image URL', eyebrow: 'Eyebrow text',
    title: 'Banner title', subtitle: 'Subtitle', link: 'Link URL', sortOrder: 'Display order',
    description: 'Description', price: 'Price (₹)', multiplier: 'Festival rate multiplier',
    date: 'Festival date',
  })[field] || field
}

function labelField(label) {
  return fieldLabel(label)
}

function currency(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`
}
