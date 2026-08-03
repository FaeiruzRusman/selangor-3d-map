import { DATA_URLS } from "./config.js";

const dataCache = new Map();

export async function loadGeoJSON(key, url) {
  if (dataCache.has(key)) return dataCache.get(key);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Gagal memuatkan data ${key}.`);
  }

  const data = await response.json();
  dataCache.set(key, data);
  return data;
}

function equalText(a, b) {
  return String(a ?? "").trim().toLowerCase() ===
    String(b ?? "").trim().toLowerCase();
}

function pointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    const intersects =
      ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi);

    if (intersects) inside = !inside;
  }

  return inside;
}

function pointInPolygonCoordinates(point, polygonCoordinates) {
  if (!polygonCoordinates?.length) return false;
  if (!pointInRing(point, polygonCoordinates[0])) return false;

  for (let i = 1; i < polygonCoordinates.length; i += 1) {
    if (pointInRing(point, polygonCoordinates[i])) return false;
  }

  return true;
}

export function pointInFeature(point, feature) {
  const geometry = feature?.geometry;

  if (!geometry) return false;

  if (geometry.type === "Polygon") {
    return pointInPolygonCoordinates(point, geometry.coordinates);
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) =>
      pointInPolygonCoordinates(point, polygon)
    );
  }

  return false;
}

export async function queryHealth({
  category = null,
  district = null,
  pbtName = null,
  sector = null
} = {}) {
  const health = await loadGeoJSON("health", DATA_URLS.health);
  let features = health.features || [];

  if (category) {
    features = features.filter((feature) =>
      equalText(feature.properties?.web_category, category)
    );
  }

  if (district) {
    features = features.filter((feature) =>
      equalText(feature.properties?.web_district, district)
    );
  }

  if (sector) {
    features = features.filter((feature) =>
      equalText(feature.properties?.web_sector, sector)
    );
  }

  if (pbtName) {
    const pbt = await findPbtByName(pbtName);

    if (!pbt) return [];

    features = features.filter((feature) => {
      if (feature.geometry?.type !== "Point") return false;
      return pointInFeature(feature.geometry.coordinates, pbt);
    });
  }

  return features;
}

export async function queryPolice({
  hierarchy = null,
  district = null
} = {}) {
  const police = await loadGeoJSON("police", DATA_URLS.police);
  let features = police.features || [];

  if (hierarchy) {
    features = features.filter((feature) =>
      equalText(feature.properties?.web_hierarchy, hierarchy)
    );
  }

  if (district) {
    const text = String(district).toLowerCase();
    features = features.filter((feature) => {
      const props = feature.properties || {};
      return [
        props.web_district,
        props.web_name,
        props.web_address,
        props.IPD_INDUK
      ].some((value) =>
        String(value ?? "").toLowerCase().includes(text)
      );
    });
  }

  return features;
}

export async function getPbtFeatures() {
  const pbt = await loadGeoJSON("pbt", DATA_URLS.pbt);
  return pbt.features || [];
}

export async function findPbtByName(name) {
  const features = await getPbtFeatures();
  const target = String(name).trim().toLowerCase();

  return features.find((feature) =>
    String(feature.properties?.web_name ?? "")
      .trim()
      .toLowerCase() === target
  ) || null;
}

export async function getCities() {
  const cities = await loadGeoJSON("cities", DATA_URLS.cities);
  return cities.features || [];
}

export async function findFeaturesByName(layer, name) {
  const target = String(name).toLowerCase();

  if (layer === "health") {
    const data = await loadGeoJSON("health", DATA_URLS.health);
    return (data.features || []).filter((feature) =>
      String(feature.properties?.web_name ?? "")
        .toLowerCase()
        .includes(target)
    );
  }

  if (layer === "police") {
    const data = await loadGeoJSON("police", DATA_URLS.police);
    return (data.features || []).filter((feature) =>
      String(feature.properties?.web_name ?? "")
        .toLowerCase()
        .includes(target)
    );
  }

  return [];
}
