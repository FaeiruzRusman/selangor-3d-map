import { DATA_URLS } from "./config.js";
import { loadSvgSdf } from "./utils.js";

export const layerState = {
  cityHierarchy: true,
  healthFacilities: true,
  liveTraffic: true,
  police: true,
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



  const policeSource = `${prefix}police`;
  const policeSymbol = `${prefix}police-symbol`;
  const policeLabel = `${prefix}police-label`;

  await loadSvgSdf(map, "police-building", DATA_URLS.policeIcon);

  if (!map.getSource(policeSource)) {
    map.addSource(policeSource, {
      type: "geojson",
      data: DATA_URLS.police
    });
  }

  if (!map.getLayer(policeSymbol)) {
    map.addLayer({
      id: policeSymbol,
      type: "symbol",
      source: policeSource,
      slot: "top",
      layout: {
        "icon-image": "police-building",
        "icon-size": [
          "match",
          ["get", "web_hierarchy"],
          "IPK", 0.56,
          "IPD", 0.46,
          0.42
        ],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true
      },
      paint: {
        "icon-color": [
          "match",
          ["get", "web_hierarchy"],
          "IPK", "#0F172A",
          "IPD", "#2563EB",
          "#64748B"
        ],
        "icon-halo-color": "#FFFFFF",
        "icon-halo-width": 1.5
      }
    });
  }

  if (!map.getLayer(policeLabel)) {
    map.addLayer({
      id: policeLabel,
      type: "symbol",
      source: policeSource,
      slot: "top",
      minzoom: 10,
      layout: {
        "text-field": ["get", "web_name"],
        "text-size": 10,
        "text-offset": [0, 1.35],
        "text-anchor": "top",
        "text-allow-overlap": false
      },
      paint: {
        "text-color": "#FFFFFF",
        "text-halo-color": "rgba(7,17,31,0.95)",
        "text-halo-width": 1.4
      }
    });
  }

  const trafficSource = `${prefix}traffic-source`;
  const trafficCasing = `${prefix}traffic-casing`;
  const trafficLine = `${prefix}traffic-line`;

  if (!map.getSource(trafficSource)) {
    map.addSource(trafficSource, {
      type: "vector",
      url: "mapbox://mapbox.mapbox-traffic-v1"
    });
  }

  if (!map.getLayer(trafficCasing)) {
    map.addLayer({
      id: trafficCasing,
      type: "line",
      source: trafficSource,
      "source-layer": "traffic",
      slot: "top",
      minzoom: 7,
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": "rgba(15,23,42,0.86)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 7, 1.8, 12, 4.5, 16, 9],
        "line-opacity": 0.78
      }
    });
  }

  if (!map.getLayer(trafficLine)) {
    map.addLayer({
      id: trafficLine,
      type: "line",
      source: trafficSource,
      "source-layer": "traffic",
      slot: "top",
      minzoom: 7,
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": [
          "match",
          ["get", "congestion"],
          "low", "#22C55E",
          "moderate", "#FACC15",
          "heavy", "#F97316",
          "severe", "#DC2626",
          "#94A3B8"
        ],
        "line-width": ["interpolate", ["linear"], ["zoom"], 7, 1.1, 12, 3, 16, 6.4],
        "line-opacity": 0.96
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
    [`${prefix}health-label`, layerState.healthFacilities],
    [`${prefix}traffic-casing`, layerState.liveTraffic],
    [`${prefix}traffic-line`, layerState.liveTraffic],
    [`${prefix}police-symbol`, layerState.police],
    [`${prefix}police-label`, layerState.police]
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
