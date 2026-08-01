import { DATA_URLS } from "./config.js";
import { loadSvgSdf } from "./utils.js";

export const layerState = {
  cityHierarchy: true,
  healthFacilities: true,
  terrain: true,
  buildings: true
};

export async function addPortalLayers(map, prefix = "") {
  const citySource = `${prefix}cities`;
  const healthSource = `${prefix}health`;

  if (!map.getSource(citySource)) {
    map.addSource(citySource, { type: "geojson", data: DATA_URLS.cities });
  }

  if (!map.getLayer(`${prefix}city-circle`)) {
    map.addLayer({
      id: `${prefix}city-circle`,
      type: "circle",
      source: citySource,
      slot: "top",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 5, 14, 10],
        "circle-color": [
          "match", ["get", "hierarki"],
          "Bandar Negeri", "#E31A1C",
          "Bandar Utama", "#FD8D3C",
          "Bandar Tempatan", "#3182BD",
          "#7F8C8D"
        ],
        "circle-stroke-color": "#FFFFFF",
        "circle-stroke-width": 1.8
      }
    });
  }

  if (!map.getLayer(`${prefix}city-label`)) {
    map.addLayer({
      id: `${prefix}city-label`,
      type: "symbol",
      source: citySource,
      slot: "top",
      minzoom: 9,
      layout: {
        "text-field": ["coalesce", ["get", "label"], ["get", "nama_bandar"]],
        "text-size": ["interpolate", ["linear"], ["zoom"], 9, 10, 14, 14],
        "text-offset": [0, 1.3],
        "text-anchor": "top"
      },
      paint: {
        "text-color": "#FFFFFF",
        "text-halo-color": "rgba(7,17,31,0.92)",
        "text-halo-width": 1.5
      }
    });
  }

  await loadSvgSdf(map, "hospital-building", DATA_URLS.hospitalIcon);

  if (!map.getSource(healthSource)) {
    map.addSource(healthSource, { type: "geojson", data: DATA_URLS.health });
  }

  if (!map.getLayer(`${prefix}health-symbol`)) {
    map.addLayer({
      id: `${prefix}health-symbol`,
      type: "symbol",
      source: healthSource,
      slot: "top",
      layout: {
        "icon-image": "hospital-building",
        "icon-size": ["interpolate", ["linear"], ["zoom"], 7, 0.27, 15, 0.48],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true
      },
      paint: {
        "icon-color": [
          "match", ["get", "web_category"],
          "Hospital", "#E63946",
          "Klinik Kesihatan", "#1D4ED8",
          "Klinik Ibu dan Anak", "#EC4899",
          "Klinik Desa", "#16A34A",
          "#6B7280"
        ],
        "icon-halo-color": "#FFFFFF",
        "icon-halo-width": 1.4
      }
    });
  }

  if (!map.getLayer(`${prefix}health-label`)) {
    map.addLayer({
      id: `${prefix}health-label`,
      type: "symbol",
      source: healthSource,
      slot: "top",
      minzoom: 11,
      layout: {
        "text-field": ["get", "web_name"],
        "text-size": 10,
        "text-offset": [0, 1.25],
        "text-anchor": "top"
      },
      paint: {
        "text-color": "#FFFFFF",
        "text-halo-color": "rgba(7,17,31,0.94)",
        "text-halo-width": 1.4
      }
    });
  }

  applyLayerVisibility(map, prefix);
}

export function applyLayerVisibility(map, prefix = "") {
  const items = [
    [`${prefix}city-circle`, layerState.cityHierarchy],
    [`${prefix}city-label`, layerState.cityHierarchy],
    [`${prefix}health-symbol`, layerState.healthFacilities],
    [`${prefix}health-label`, layerState.healthFacilities]
  ];

  for (const [id, visible] of items) {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
    }
  }

  try {
    map.setConfigProperty("basemap", "show3dObjects", layerState.buildings);
  } catch (_) {}
}

export function enableTerrain(map, sourceId = "terrain-dem") {
  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: "raster-dem",
      url: "mapbox://mapbox.mapbox-terrain-dem-v1",
      tileSize: 512,
      maxzoom: 14
    });
  }
  map.setTerrain({ source: sourceId, exaggeration: 1.35 });
}

export function disableTerrain(map) {
  map.setTerrain(null);
}
