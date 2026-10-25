import { useEffect, useState } from 'react'
import { ImagePlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { apiRequest } from '../../services/api'

const blankForm = {
  name: '', registrationNumber: '', description: '', type: '', fuel: 'petrol', transmission: 'manual',
  modelYear: new Date().getFullYear(), seats: 5, freeKm: 250, featured: false, status: 'available',
  dailyRate: 0, weekendRate: 0, extraKmCharge: 0, securityDeposit: 0,
  package100: 500, package250: 1000, images: [],
}
const currency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`
const readImage = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`))
  reader.readAsDataURL(file)
})

export default function AdminCarsPage() {
  const [cars, setCars] = useState([])
  const [types, setTypes] = useState([])
  const [form, setForm] = useState(blankForm)
  const [editingId, setEditingId] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    Promise.all([apiRequest('/api/v1/admin/cars'), apiRequest('/api/v1/admin/resources')])
      .then(([carResult, resourceResult]) => {
        setCars(carResult.cars)
        setTypes(resourceResult.carTypes.filter((type) => type.active))
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let active = true
    Promise.all([apiRequest('/api/v1/admin/cars'), apiRequest('/api/v1/admin/resources')])
      .then(([carResult, resourceResult]) => {
        if (!active) return
        setCars(carResult.cars)
        setTypes(resourceResult.carTypes.filter((type) => type.active))
      })
      .catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const resetForm = () => {
    setForm({ ...blankForm, type: types[0]?.slug || 'hatchback' })
    setEditingId('')
  }

  const startEdit = (car) => {
    setEditingId(car.id)
    setForm({
      ...blankForm,
      name: car.name,
      registrationNumber: car.registrationNumber || '',
      description: car.description || '',
      type: car.type,
      fuel: car.fuel.toLowerCase(),
      transmission: car.transmission.toLowerCase(),
      modelYear: car.modelYear || car.year,
      seats: car.seats,
      freeKm: car.freeKm,
      featured: car.featured,
      status: car.status.toLowerCase().replaceAll(' ', '-'),
      dailyRate: car.rate?.dailyRate ?? car.pricePerDay,
      weekendRate: car.rate?.weekendRate ?? car.weekendRate,
      extraKmCharge: car.rate?.extraKmCharge ?? car.extraKmCharge,
      securityDeposit: car.rate?.securityDeposit ?? car.securityDeposit,
      package100: car.rate?.extraKmPackages?.find((item) => item.km === 100)?.price ?? 500,
      package250: car.rate?.extraKmPackages?.find((item) => item.km === 250)?.price ?? 1000,
      images: car.images || [],
    })
    setNotice('')
    setError('')
    document.getElementById('admin-car-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleImages = async (event) => {
    const files = [...(event.target.files || [])]
    const existingBytes = form.images.filter((image) => image.startsWith('data:')).reduce((total, image) => total + image.length * 0.75, 0)
    const totalBytes = files.reduce((total, file) => total + file.size, existingBytes)
    if (files.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
      setError('Car photos must be JPEG, PNG, or WebP images.')
      event.target.value = ''
      return
    }
    if (totalBytes > 3_500_000) {
      setError('Total uploaded image size must stay under 3.5 MB.')
      event.target.value = ''
      return
    }
    try {
      const images = await Promise.all(files.map(readImage))
      setForm((current) => ({ ...current, images: [...current.images, ...images] }))
      setError('')
    } catch (imageError) {
      setError(imageError.message)
    }
    event.target.value = ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    const payload = {
      name: form.name,
      registrationNumber: form.registrationNumber,
      description: form.description,
      type: form.type,
      fuel: form.fuel,
      transmission: form.transmission,
      modelYear: Number(form.modelYear),
      seats: Number(form.seats),
      freeKm: Number(form.freeKm),
      featured: form.featured,
      status: form.status,
      images: form.images,
      rate: {
        dailyRate: Number(form.dailyRate),
        weekendRate: Number(form.weekendRate),
        extraKmCharge: Number(form.extraKmCharge),
        securityDeposit: Number(form.securityDeposit),
        extraKmPackages: [
          { label: 'No extra kilometres', km: 0, price: 0 },
          { label: '100 extra km', km: 100, price: Number(form.package100) },
          { label: '250 extra km', km: 250, price: Number(form.package250) },
        ],
      },
    }
    try {
      await apiRequest(editingId ? `/api/v1/cars/${editingId}` : '/api/v1/cars', {
        method: editingId ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      })
      setNotice(editingId ? 'Car and rental rates updated.' : 'Car added to your fleet.')
      resetForm()
      load()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteCar = async (car) => {
    if (!window.confirm(`Delete ${car.name}? This cannot be undone.`)) return
    setError('')
    try {
      await apiRequest(`/api/v1/cars/${car.id}`, { method: 'DELETE' })
      setCars((current) => current.filter((item) => item.id !== car.id))
      setNotice(`${car.name} was deleted.`)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const visibleCars = cars.filter((car) => `${car.name} ${car.registrationNumber}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="admin-stack">
      {error && <div className="admin-alert error" role="alert">{error}<button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button></div>}
      {notice && <div className="admin-alert success" role="status">{notice}</div>}

      <section className="admin-panel" id="admin-car-editor">
        <div className="admin-section-heading">
          <div><h2>{editingId ? 'Edit vehicle' : 'Add a vehicle'}</h2><p>Car details, photos and rates customers will see.</p></div>
          {editingId && <button className="admin-button secondary" type="button" onClick={resetForm}><X size={16} /> Cancel edit</button>}
        </div>
        {!types.length && !loading && <div className="admin-alert warning">Create an active car type under Website content before adding vehicles.</div>}
        <form className="admin-form admin-car-form" onSubmit={handleSubmit}>
          <FormField label="Car name"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></FormField>
          <FormField label="Registration number"><input value={form.registrationNumber} onChange={(event) => setForm({ ...form, registrationNumber: event.target.value.toUpperCase() })} placeholder="GJ 16 AB 1234" /></FormField>
          <FormField label="Car type"><select value={form.type || types[0]?.slug || ''} onChange={(event) => setForm({ ...form, type: event.target.value })} required>{types.map((type) => <option value={type.slug} key={type.id}>{type.name}</option>)}</select></FormField>
          <FormField label="Fuel"><select value={form.fuel} onChange={(event) => setForm({ ...form, fuel: event.target.value })}><option value="petrol">Petrol</option><option value="diesel">Diesel</option><option value="cng">CNG</option><option value="electric">Electric</option></select></FormField>
          <FormField label="Transmission"><select value={form.transmission} onChange={(event) => setForm({ ...form, transmission: event.target.value })}><option value="manual">Manual</option><option value="automatic">Automatic</option></select></FormField>
          <FormField label="Model year"><input type="number" min="1900" max="2100" value={form.modelYear} onChange={(event) => setForm({ ...form, modelYear: event.target.value })} required /></FormField>
          <FormField label="Seats"><input type="number" min="1" max="20" value={form.seats} onChange={(event) => setForm({ ...form, seats: event.target.value })} required /></FormField>
          <FormField label="Free kilometres / day"><input type="number" min="0" value={form.freeKm} onChange={(event) => setForm({ ...form, freeKm: event.target.value })} required /></FormField>
          <FormField label="Availability"><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="available">Available</option><option value="under-service">Under service</option></select></FormField>
          <FormField label="Daily rate (₹)"><input type="number" min="0" value={form.dailyRate} onChange={(event) => setForm({ ...form, dailyRate: event.target.value })} required /></FormField>
          <FormField label="Weekend rate (₹)"><input type="number" min="0" value={form.weekendRate} onChange={(event) => setForm({ ...form, weekendRate: event.target.value })} required /></FormField>
          <FormField label="Extra km charge (₹ / km)"><input type="number" min="0" value={form.extraKmCharge} onChange={(event) => setForm({ ...form, extraKmCharge: event.target.value })} required /></FormField>
          <FormField label="Security deposit (₹)"><input type="number" min="0" value={form.securityDeposit} onChange={(event) => setForm({ ...form, securityDeposit: event.target.value })} required /></FormField>
          <FormField label="100 km package (₹)"><input type="number" min="0" value={form.package100} onChange={(event) => setForm({ ...form, package100: event.target.value })} required /></FormField>
          <FormField label="250 km package (₹)"><input type="number" min="0" value={form.package250} onChange={(event) => setForm({ ...form, package250: event.target.value })} required /></FormField>
          <FormField label="Description" className="span-two"><textarea rows="2" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></FormField>
          <div className="admin-field span-two">
            <span>Vehicle images</span>
            <label className="admin-upload-control"><ImagePlus size={18} /><span>Choose JPEG, PNG or WebP photos</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImages} /></label>
            <small className="admin-muted">Up to 3.5 MB total. Uploaded images are stored with the car.</small>
            {!!form.images.length && <div className="admin-image-preview">{form.images.map((image, index) => <div key={`${image.slice(0, 40)}-${index}`}><img src={image} alt={`Car upload ${index + 1}`} /><button type="button" aria-label={`Remove image ${index + 1}`} onClick={() => setForm({ ...form, images: form.images.filter((_, imageIndex) => imageIndex !== index) })}><X size={14} /></button></div>)}</div>}
          </div>
          <label className="admin-checkbox span-two"><input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} /> Feature this car on the customer homepage</label>
          <div className="admin-form-actions span-two"><button className="admin-button primary" type="submit" disabled={saving || !types.length}><Plus size={17} />{saving ? 'Saving…' : editingId ? 'Save vehicle & rates' : 'Add vehicle'}</button></div>
        </form>
      </section>

      <section className="admin-panel">
        <div className="admin-section-heading">
          <div><h2>Your fleet</h2><p>{cars.length} vehicle{cars.length === 1 ? '' : 's'} in the database.</p></div>
          <label className="admin-search"><Search size={16} /><input aria-label="Search cars" placeholder="Search fleet…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        </div>
        {loading ? <div className="admin-empty">Loading cars…</div> : visibleCars.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Vehicle</th><th>Registration</th><th>Category</th><th>Daily / weekend</th><th>Free km</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{visibleCars.map((car) => (
                <tr key={car.id}>
                  <td><div className="admin-car-cell">{car.image && <img src={car.image} alt="" />}<strong>{car.name}</strong></div></td>
                  <td className="admin-mono">{car.registrationNumber || '—'}</td><td>{car.category}</td>
                  <td>{currency(car.pricePerDay)} / {currency(car.weekendRate)}</td><td>{car.freeKm} km/day</td>
                  <td><span className={`admin-status ${car.status.toLowerCase().replaceAll(' ', '').replaceAll('-', '')}`}>{car.status}</span></td>
                  <td><div className="admin-row-actions"><button className="admin-icon-button" type="button" onClick={() => startEdit(car)} aria-label={`Edit ${car.name}`}><Pencil size={16} /></button><button className="admin-icon-button danger" type="button" onClick={() => deleteCar(car)} aria-label={`Delete ${car.name}`}><Trash2 size={16} /></button></div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="admin-empty">No matching cars.</div>}
      </section>
    </div>
  )
}

function FormField({ label, children, className = '' }) {
  return <label className={`admin-field ${className}`}><span>{label}</span>{children}</label>
}
