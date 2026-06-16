# Nearby Places

The Nearby Places feature helps students find health clinics, grocery stores, restaurants, fun activities, and shopping within 1–25 miles of Tougaloo College.

## Privacy Model

- Every search is centered on the configured Tougaloo College campus coordinates.
- The browser is never asked for the student's live location.
- Searches are not attached to private student records.
- Listings are navigation information, not medical advice or institutional endorsements.

## Provider Behavior

When `GOOGLE_PLACES_API_KEY` is configured, the server uses Google Places Nearby Search and returns current listings inside The Nest. The API key remains server-side.

Without an approved API key, the endpoint returns a Google Maps search link so students can still view current external results.

## Configuration

```text
GOOGLE_PLACES_API_KEY=
TOUGALOO_CAMPUS_ADDRESS=500 West County Line Road, Tougaloo, MS 39174
TOUGALOO_CAMPUS_LATITUDE=32.4029
TOUGALOO_CAMPUS_LONGITUDE=-90.1608
```

Institutional IT should verify the campus address and coordinates, approve the provider, restrict the API key to the required Places API, set quotas, and review billing before production deployment.
