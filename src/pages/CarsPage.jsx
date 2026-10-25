import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import CarCard from '../components/CarCard'
import { useCars } from '../context/useCars'
import './CarsPage.css'

const PAGE_SIZE = 4
const vehicleTypes = ['all', 'hatchback', 'sedan', 'suv', 'muv']

export default function CarsPage() {
  const { cars, loading, error } = useCars()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [fuel, setFuel] = useState('all')
  const [transmission, setTransmission] = useState('all')
  const [seats, setSeats] = useState('all')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState('recommended')
  const [page, setPage] = useState(1)
  const category = (searchParams.get('category') || 'all').toLowerCase()
  const type = vehicleTypes.includes(category) ? category : 'all'

  const updateFilter = (setter) => (event) => {
    setter(event.target.value)
    setPage(1)
  }

  const handleTypeChange = (event) => {
    const nextType = event.target.value
    setPage(1)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (nextType === 'all') next.delete('category')
      else next.set('category', nextType)
      return next
    })
  }

  const visibleCars = useMemo(() => {
    const filtered = cars.filter((car) => {
      const matchesSearch = !search || `${car.name} ${car.category} ${car.fuel} ${car.transmission}`.toLowerCase().includes(search.trim().toLowerCase())
      const matchesType = type === 'all' || car.type.toLowerCase() === type
      const matchesFuel = fuel === 'all' || car.fuel.toLowerCase() === fuel
      const matchesTransmission = transmission === 'all' || car.transmission.toLowerCase() === transmission
      const matchesSeats = seats === 'all' || car.seats >= Number(seats)
      const matchesPrice = !maxPrice || car.pricePerDay <= Number(maxPrice)
      return matchesSearch && matchesType && matchesFuel && matchesTransmission && matchesSeats && matchesPrice
    })

    if (sort === 'price-asc') return filtered.sort((a, b) => a.pricePerDay - b.pricePerDay)
    if (sort === 'price-desc') return filtered.sort((a, b) => b.pricePerDay - a.pricePerDay)
    if (sort === 'name') return filtered.sort((a, b) => a.name.localeCompare(b.name))
    return filtered
  }, [cars, search, type, fuel, transmission, seats, maxPrice, sort])

  const pageCount = Math.ceil(visibleCars.length / PAGE_SIZE)
  const currentPage = Math.min(page, Math.max(pageCount, 1))
  const pageCars = visibleCars.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div className="page-shell">
      <div className="page-heading-row">
        <div>
          <span className="eyebrow">Fleet</span>
          <h1 className="page-title">{type === 'all' ? 'Find your perfect drive' : `${type[0].toUpperCase()}${type.slice(1)} cars`}</h1>
        </div>
        <div className="results-pill">{visibleCars.length} vehicles</div>
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
        <label className="price-filter">
          <input
            type="number"
            min="0"
            value={maxPrice}
            onChange={updateFilter(setMaxPrice)}
            placeholder="Max price / day"
            aria-label="Maximum daily price"
          />
        </label>
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
        ) : error ? (
          <div className="empty-state" role="alert">Unable to load cars: {error}</div>
        ) : pageCars.length > 0 ? (
          pageCars.map((car) => <CarCard key={car.id} car={car} />)
        ) : (
          <div className="empty-state">No cars match your filters. Try a wider search.</div>
        )}
      </div>
      {pageCount > 1 && (
        <nav className="pagination" aria-label="Car listing pages">
          <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1}>Previous</button>
          <span>Page {currentPage} of {pageCount}</span>
          <button type="button" onClick={() => setPage((current) => current + 1)} disabled={currentPage === pageCount}>Next</button>
        </nav>
      )}
    </div>
  )
}
