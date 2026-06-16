const campus = {
  name: "Tougaloo College",
  address: process.env.TOUGALOO_CAMPUS_ADDRESS || "500 West County Line Road, Tougaloo, MS 39174",
  latitude: Number(process.env.TOUGALOO_CAMPUS_LATITUDE || 32.4029),
  longitude: Number(process.env.TOUGALOO_CAMPUS_LONGITUDE || -90.1608)
};

const categories = {
  clinics: { label: "Health clinics", types: ["medical_clinic", "urgent_care", "hospital"] },
  groceries: { label: "Grocery stores", types: ["grocery_store", "supermarket"] },
  restaurants: { label: "Restaurants", types: ["restaurant", "cafe"] },
  activities: { label: "Fun activities", types: ["museum", "movie_theater", "bowling_alley", "park", "tourist_attraction"] },
  shopping: { label: "Shopping", types: ["shopping_mall", "department_store", "clothing_store"] }
};

function validatePlacesQuery(category, radiusMiles) {
  if (!categories[category]) throw new Error("Unsupported places category.");
  const radius = Number(radiusMiles);
  if (!Number.isFinite(radius) || radius < 1 || radius > 25) throw new Error("Radius must be between 1 and 25 miles.");
  return radius;
}

function mapsSearchUrl(category, radiusMiles) {
  const query = `${categories[category].label} within ${radiusMiles} miles of ${campus.address}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

async function findNearbyPlaces(category, radiusMiles, fetchImpl = fetch) {
  const radius = validatePlacesQuery(category, radiusMiles);
  const mapUrl = mapsSearchUrl(category, radius);
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return { provider: "google_maps_link", places: [], mapsSearchUrl: mapUrl, campus, category, radiusMiles: radius };
  }

  const response = await fetchImpl("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": process.env.GOOGLE_PLACES_API_KEY,
      "x-goog-fieldmask": "places.id,places.displayName,places.formattedAddress,places.rating,places.googleMapsUri,places.primaryTypeDisplayName"
    },
    body: JSON.stringify({
      includedTypes: categories[category].types,
      maxResultCount: 12,
      locationRestriction: {
        circle: {
          center: { latitude: campus.latitude, longitude: campus.longitude },
          radius: Math.round(radius * 1609.344)
        }
      },
      rankPreference: "DISTANCE"
    })
  });
  if (!response.ok) throw new Error("Places provider request failed.");
  const result = await response.json();
  return {
    provider: "google_places",
    mapsSearchUrl: mapUrl,
    campus,
    category,
    radiusMiles: radius,
    places: (result.places || []).map((place) => ({
      id: place.id,
      name: place.displayName?.text || "Nearby place",
      type: place.primaryTypeDisplayName?.text || categories[category].label,
      address: place.formattedAddress || "",
      rating: place.rating || null,
      url: place.googleMapsUri
    }))
  };
}

module.exports = { campus, categories, findNearbyPlaces, mapsSearchUrl, validatePlacesQuery };
