// Fixed values of the eclipse maths, each with where it comes from

export const RAD = Math.PI / 180; // degrees to radians

// The Earth turns 1.002738 times per solar day, so 1.002738 × 15°/h =
// 0.00417807° per second. Meeus, Elements of Solar Eclipses 1951–2200.
export const EARTH_ROTATION_DEGREES_PER_SECOND = 0.00417807;

// The IAU 1976 ellipsoid, as used by Meeus and the eclipse elements: the equatorial radius, and
// the polar radius over it (b/a, from flattening 1/298.257). Meeus, Astronomical Algorithms,
// ch. 11.
export const EQUATORIAL_RADIUS_METERS = 6378140;
export const POLAR_TO_EQUATORIAL = 0.99664719;
