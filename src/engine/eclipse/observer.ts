// The observer's position as the eclipse maths needs it: ρ·sinφ′ and ρ·cosφ′, from latitude,
// longitude and altitude. Explained in ../README.md

export type GeographicPosition = {
  latitude: number; // north positive, degrees
  longitude: number; // east positive, degrees
  altitudeMeters: number; // height above sea level, meters
};

export type GeocentricObserver = {
  rhoSinPhi: number; // height above the equatorial plane, equatorial Earth radii
  rhoCosPhi: number; // distance from the Earth's axis, equatorial Earth radii
  longitude: number; // east positive, radians
};

// IAU 1976 ellipsoid, as used by Meeus and the eclipse elements
const EQUATORIAL_RADIUS_METERS = 6378140;
const POLAR_TO_EQUATORIAL = 0.99664719; // b/a, from flattening 1/298.257

const RAD = Math.PI / 180;

export function geocentricObserver({
  latitude,
  longitude,
  altitudeMeters,
}: GeographicPosition): GeocentricObserver {
  if (!(Math.abs(latitude) <= 90)) {
    throw new RangeError(`Latitude must be within ±90°, got ${latitude}`);
  }
  if (!(Math.abs(longitude) <= 180)) {
    throw new RangeError(`Longitude must be within ±180°, got ${longitude}`);
  }
  if (!Number.isFinite(altitudeMeters)) {
    throw new RangeError(`Altitude must be a finite number of meters, got ${altitudeMeters}`);
  }

  const phi = latitude * RAD;
  // Reduced latitude: the angle that places the sea-level point on the ellipse. atan2 rather
  // than atan(b/a · tan φ) keeps the poles exact
  const reducedLatitude = Math.atan2(POLAR_TO_EQUATORIAL * Math.sin(phi), Math.cos(phi));
  // Altitude pushes the observer outwards along the local vertical, which points along φ
  const altitude = altitudeMeters / EQUATORIAL_RADIUS_METERS;

  return {
    rhoSinPhi: POLAR_TO_EQUATORIAL * Math.sin(reducedLatitude) + altitude * Math.sin(phi),
    rhoCosPhi: Math.cos(reducedLatitude) + altitude * Math.cos(phi),
    longitude: longitude * RAD,
  };
}
