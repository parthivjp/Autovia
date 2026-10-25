import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import CarCard from '../components/CarCard'
import { useSiteContent } from '../hooks/useSiteContent'
import { apiRequest } from '../services/api'
import './CarsPage.css'

const PAGE_SIZE = 8
export default function CarsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [fuel, setFuel] = useState('all')
  const [transmission, setTransmission] = useState('all')
  const [seats, setSeats] = useState('all')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState('recommended')
  const [page, setPage] = useState(1)
  const [cars, setCars] = useState([])
  const [pagination, setPagination] = useState({ total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { data: siteData, version: siteVersion, error: siteError } = useSiteContent()
  const category = (searchParams.get('category') || 'all').toLowerCase()
  const vehicleTypes = ['all', ...siteData.carTypes.map((carType) => carType.slug)]
  const type = vehicleTypes.includes(category) ? category : 'all'

  useEffect(() => {
    let active = true
    const query = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      sort,
    })
    if (search.trim()) query.set('search', search.trim())
    if (type !== 'all') query.set('type', type)
    if (fuel !== 'all') query.set('fuel', fuel)
    if (transmission !== 'all') query.set('transmission', transmission)
    if (seats !== 'all') query.set('seats', seats)
    if (maxPrice) query.set('maxPrice', maxPrice)

    apiRequest(`/api/v1/cars?${query}`)
      .then((result) => {
        if (!active) return
        setCars(result.cars)
        setPagination(result.pagination)
        setError('')
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [page, search, type, fuel, transmission, seats, maxPrice, sort, siteVersion])

  const updateFilter = (setter) => (event) => {
    setter(event.target.value)
    setPage(1)
    setLoading(true)
    setError('')
  }

  const handleTypeChange = (event) => {
    const nextType = event.target.value
    setPage(1)
    setLoading(true)
    setError('')
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (nextType === 'all') next.delete('category')
      else next.set('category', nextType)
      return next
    })
  }

  return (
    <div className="page-shell">
      <div className="page-heading-row">
        <div>
          <span className="eyebrow">Fleet</span>
          <h1 className="page-title">{type === 'all' ? 'Find your perfect drive' : `${type[0].toUpperCase()}${type.slice(1)} cars`}</h1>
        </div>
        <div className="results-pill">{pagination.total} vehicles</div>
      </div>

      <div className="filters-panel">
        <input
          className="filter-search"
          value={search}
          onChange={updateFilter(setSearch)}
          placeholder="Search by model or category"
          aria-label="Search cars"
        />
        <select value={type} onChange={handleTypeChange} aria-label="Filter car type">
          {vehicleTypes.map((value) => (
            <option key={value} value={value}>{value === 'all' ? 'All types' : value}</option>
          ))}
        </select>
        <select value={fuel} onChange={updateFilter(setFuel)} aria-label="Filter fuel type">
          <option value="all">All fuel</option>
          <option value="petrol">Petrol</option>
          <option value="diesel">Diesel</option>
          <option value="cng">CNG</option>
          <option value="electric">Electric</option>
        </select>
        <select value={transmission} onChange={updateFilter(setTransmission)} aria-label="Filter transmission">
          <option value="all">Any transmission</option>
          <option value="manual">Manual</option>
          <option value="automatic">Automatic</option>
        </select>
        <select value={seats} onChange={updateFilter(setSeats)} aria-label="Filter minimum seats">
          <option value="all">Any seats</option>
          <option value="5">5+ seats</option>
          <option value="7">7+ seats</option>
        </select>
        <input
          type="number"
          min="0"
          value={maxPrice}
          onChange={updateFilter(setMaxPrice)}
          placeholder="Max price / day"
          aria-label="Maximum daily price"
        />
        <select value={sort} onChange={updateFilter(setSort)} aria-label="Sort cars">
          <option value="recommended">Recommended</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="name">Name</option>
        </select>
      </div>

      <div className="cars-grid">
        {loading ? (
          <div className="empty-state">Loading cars…</div>
        ) : error || siteError ? (
          <div className="empty-state" role="alert">Unable to load current fleet or filters: {error || siteError}</div>
        ) : cars.length > 0 ? (
          cars.map((car) => <CarCard key={car.id} car={car} />)
        ) : (
          <div className="empty-state">No cars match your filters. Try a wider search.</div>
        )}
      </div>
      {pagination.pages > 1 && (
        <nav className="pagination" aria-label="Car listing pages">
          <button type="button" onClick={() => { setLoading(true); setPage((current) => current - 1) }} disabled={page === 1}>Previous</button>
          <span>Page {page} of {pagination.pages}</span>
          <button type="button" onClick={() => { setLoading(true); setPage((current) => current + 1) }} disabled={page === pagination.pages}>Next</button>
        </nav>
      )}
    </div>
  )
}
