interface GeoRequest {
  type: 'geocode'
  id: string
  location: string
}

interface GeoResponse {
  type: 'geocoded'
  id: string
  location: string
  coords: { lat: number; lng: number } | null
  source: 'nominatim' | 'static' | 'failed'
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
let requestQueue: GeoRequest[] = []
let processing = false

self.onmessage = (event: MessageEvent<GeoRequest>) => {
  requestQueue.push(event.data)
  if (!processing) {
    processQueue()
  }
}

async function processQueue() {
  processing = true

  while (requestQueue.length > 0) {
    const request = requestQueue.shift()!

    try {
      const coords = await geocodeNominatim(request.location)
      const response: GeoResponse = {
        type: 'geocoded',
        id: request.id,
        location: request.location,
        coords,
        source: coords ? 'nominatim' : 'failed'
      }
      self.postMessage(response)
    } catch {
      const coords = geocodeStatic(request.location)
      const response: GeoResponse = {
        type: 'geocoded',
        id: request.id,
        location: request.location,
        coords,
        source: coords ? 'static' : 'failed'
      }
      self.postMessage(response)
    }

    // Rate limit: 1 request per second for Nominatim
    await new Promise(resolve => setTimeout(resolve, 1100))
  }

  processing = false
}

async function geocodeNominatim(location: string): Promise<{ lat: number; lng: number } | null> {
  const params = new URLSearchParams({
    q: location,
    format: 'json',
    limit: '1'
  })

  const response = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { 'User-Agent': 'RecruiterAutomation/1.0' }
  })

  if (!response.ok) throw new Error(`Nominatim error: ${response.status}`)

  const results = await response.json()
  if (results.length === 0) return null

  return {
    lat: parseFloat(results[0].lat),
    lng: parseFloat(results[0].lon)
  }
}

function geocodeStatic(location: string): { lat: number; lng: number } | null {
  // Fallback: common cities lookup
  const cities: Record<string, { lat: number; lng: number }> = {
    'bangalore': { lat: 12.9716, lng: 77.5946 },
    'bengaluru': { lat: 12.9716, lng: 77.5946 },
    'mumbai': { lat: 19.0760, lng: 72.8777 },
    'delhi': { lat: 28.6139, lng: 77.2090 },
    'new delhi': { lat: 28.6139, lng: 77.2090 },
    'hyderabad': { lat: 17.3850, lng: 78.4867 },
    'chennai': { lat: 13.0827, lng: 80.2707 },
    'pune': { lat: 18.5204, lng: 73.8567 },
    'kolkata': { lat: 22.5726, lng: 88.3639 },
    'ahmedabad': { lat: 23.0225, lng: 72.5714 },
    'gurgaon': { lat: 28.4595, lng: 77.0266 },
    'gurugram': { lat: 28.4595, lng: 77.0266 },
    'noida': { lat: 28.5355, lng: 77.3910 },
    'san francisco': { lat: 37.7749, lng: -122.4194 },
    'new york': { lat: 40.7128, lng: -74.0060 },
    'london': { lat: 51.5074, lng: -0.1278 },
    'singapore': { lat: 1.3521, lng: 103.8198 },
    'dubai': { lat: 25.2048, lng: 55.2708 },
    'toronto': { lat: 43.6532, lng: -79.3832 },
    'seattle': { lat: 47.6062, lng: -122.3321 },
    'austin': { lat: 30.2672, lng: -97.7431 },
    'berlin': { lat: 52.5200, lng: 13.4050 },
    'tokyo': { lat: 35.6762, lng: 139.6503 },
    'sydney': { lat: -33.8688, lng: 151.2093 },
    'remote': { lat: 0, lng: 0 },
  }

  const normalized = location.toLowerCase().trim()

  for (const [city, coords] of Object.entries(cities)) {
    if (normalized.includes(city)) {
      return coords
    }
  }

  return null
}

export {}
