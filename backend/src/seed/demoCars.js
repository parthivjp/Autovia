const carImages = {
  'swift-dzire': '/assets/cars/swift-dzire.webp',
  'hyundai-creta': '/assets/cars/hyundai-creta.webp',
  'mahindra-bolero': '/assets/cars/mahindra-bolero.webp',
  'renault-kwid': '/assets/cars/renault-kwid.webp',
  'tata-nexon': '/assets/cars/tata-nexon.webp',
  'maruti-wagonr-cng': '/assets/cars/maruti-wagonr-cng.webp',
  'mg-zs-ev': '/assets/cars/mg-zs-ev.webp',
}

const extraKmPackages = [
  { label: 'No extra kilometres', km: 0, price: 0 },
  { label: '100 extra km', km: 100, price: 500 },
  { label: '250 extra km', km: 250, price: 1000 },
]

export const demoCars = [
  { slug: 'swift-dzire', name: 'Maruti Swift Dzire', type: 'sedan', fuel: 'petrol', transmission: 'manual', seats: 5, modelYear: 2023, dailyRate: 2200, weekendRate: 2900, extraKmCharge: 18, securityDeposit: 5000, extraKmPackages, freeKm: 250, status: 'available', featured: true, pickupLocations: ['Bengaluru Airport', 'Delhi Connaught Place'] },
  { slug: 'hyundai-creta', name: 'Hyundai Creta', type: 'suv', fuel: 'diesel', transmission: 'automatic', seats: 5, modelYear: 2024, dailyRate: 3200, weekendRate: 4200, extraKmCharge: 25, securityDeposit: 7000, extraKmPackages, freeKm: 300, status: 'available', featured: true, pickupLocations: ['Bengaluru Airport', 'Mumbai Central'] },
  { slug: 'mahindra-bolero', name: 'Mahindra Bolero', type: 'muv', fuel: 'diesel', transmission: 'manual', seats: 7, modelYear: 2021, dailyRate: 3900, weekendRate: 4900, extraKmCharge: 28, securityDeposit: 8000, extraKmPackages, freeKm: 320, status: 'available', featured: true, pickupLocations: ['Delhi Connaught Place', 'Goa Panaji'] },
  { slug: 'renault-kwid', name: 'Renault Kwid', type: 'hatchback', fuel: 'petrol', transmission: 'manual', seats: 5, modelYear: 2024, dailyRate: 1750, weekendRate: 2300, extraKmCharge: 15, securityDeposit: 4000, extraKmPackages, freeKm: 200, status: 'available', featured: false, pickupLocations: ['Bengaluru Airport', 'Goa Panaji'] },
  { slug: 'tata-nexon', name: 'Tata Nexon', type: 'suv', fuel: 'diesel', transmission: 'manual', seats: 5, modelYear: 2022, dailyRate: 2600, weekendRate: 3400, extraKmCharge: 20, securityDeposit: 6000, extraKmPackages, freeKm: 250, status: 'available', featured: false, pickupLocations: ['Mumbai Central', 'Goa Panaji'] },
  { slug: 'maruti-wagonr-cng', name: 'Maruti WagonR CNG', type: 'hatchback', fuel: 'cng', transmission: 'manual', seats: 5, modelYear: 2023, dailyRate: 1650, weekendRate: 2150, extraKmCharge: 14, securityDeposit: 3500, extraKmPackages, freeKm: 220, status: 'available', featured: false, pickupLocations: ['Bengaluru Airport', 'Delhi Connaught Place'] },
  { slug: 'mg-zs-ev', name: 'MG ZS EV', type: 'suv', fuel: 'electric', transmission: 'automatic', seats: 5, modelYear: 2024, dailyRate: 4200, weekendRate: 5200, extraKmCharge: 30, securityDeposit: 9000, extraKmPackages, freeKm: 280, status: 'available', featured: false, pickupLocations: ['Bengaluru Airport', 'Mumbai Central'] },
].map((car) => ({
  ...car,
  description: `${car.name} is a ${car.type.toUpperCase()} car available for self-drive rental. Choose your dates and pickup location to see live availability and pricing.`,
  images: [carImages[car.slug]],
}))
