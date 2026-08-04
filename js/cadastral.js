import { addLayerCompat } from "./utils.js";

const CONFIG_URL = "config/cadastral-layer.json";

let configCache = null;

async function loadConfig() {
  if (configCache) return configCache;

  const response = await fetch(CONFIG_URL, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Gagal memuatkan konfigurasi Lot Kadaster.");
  }

  configCache = await response.json();
  return configCache;
}

function createSourceDefinition(config) {
  if (config.sourceType === "mapboxTileset" && config.url) {
    return {
      type: "vector",
      url: config.url,
      minzoom: config.minzoom ?? 11,
      maxzoom: config.maxzoom ?? 22
    };
  }

  if (
    config.sourceType === "vectorTiles" &&
    Array.isArray(config.tiles) &&
    config.tiles.length
  ) {
    return {
      type: "vector",
      tiles: config.tiles,
      minzoom: config.minzoom ?? 11,
      maxzoom: config.maxzoom ?? 22
    };
  }

  if (config.sourceType === "geojson" && config.url) {
    return {
      type: "geojson",
      data: config.url
    };
  }

  return null;
}

export async function addCadastralLayer(map, prefix = "") {
  const config = await loadConfig();
  const sourceId = `${prefix}cadastral-source`;
  const fillId = `${prefix}cadastral-fill`;
  const lineId = `${prefix}cadastral-line`;
  const labelId = `${prefix}cadastral-label`;

  const sourceDefinition = createSourceDefinition(config);

  if (!config.enabled || !sourceDefinition) {
    return {
      configured: false,
      config
    };
  }

  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, sourceDefinition);
  }

  const sourceLayer =
    sourceDefinition.type === "vector"
      ? config.sourceLayer
      : undefined;

  if (!map.getLayer(fillId)) {
    addLayerCompat(map, {
      id: fillId,
      type: "fill",
      source: sourceId,
      ...(sourceLayer
        ? { "source-layer": sourceLayer }
        : {}),
      minzoom: config.minzoom ?? 11,
      slot: "middle",
      paint: {
        "fill-color": "#EAB308",
        "fill-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          11, 0.01,
          14, 0.055,
          17, 0.10
        ]
      }
    });
  }

  if (!map.getLayer(lineId)) {
    addLayerCompat(map, {
      id: lineId,
      type: "line",
      source: sourceId,
      ...(sourceLayer
        ? { "source-layer": sourceLayer }
        : {}),
      minzoom: config.minzoom ?? 11,
      slot: "top",
      paint: {
        "line-color": "#FACC15",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          11, 0.15,
          14, 0.45,
          17, 1.15,
          20, 2
        ],
        "line-opacity": 0.92
      }
    });
  }

  if (!map.getLayer(labelId)) {
    addLayerCompat(map, {
      id: labelId,
      type: "symbol",
      source: sourceId,
      ...(sourceLayer
        ? { "source-layer": sourceLayer }
        : {}),
      minzoom: 16,
      slot: "top",
      layout: {
        "text-field": [
          "coalesce",
          ["get", config.fields?.lot || "LOT"],
          ["get", config.fields?.upi || "UPI"],
          ""
        ],
        "text-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          16, 8,
          20, 11
        ],
        "text-font": [
          "DIN Pro Medium",
          "Arial Unicode MS Regular"
        ],
        "text-allow-overlap": false
      },
      paint: {
        "text-color": "#FEF3C7",
        "text-halo-color": "rgba(15,23,42,0.96)",
        "text-halo-width": 1.3
      }
    });
  }

  return {
    configured: true,
    config
  };
}

export function setCadastralVisibility(
  map,
  visible,
  prefix = ""
) {
  [
    `${prefix}cadastral-fill`,
    `${prefix}cadastral-line`,
    `${prefix}cadastral-label`
  ].forEach((id) => {
    if (map.getLayer(id)) {
      map.setLayoutProperty(
        id,
        "visibility",
        visible ? "visible" : "none"
      );
    }
  });
}

export function cadastralPopupHtml(properties, config) {
  const fields = config.fields || {};
  const value = (key, fallback = "-") =>
    properties?.[fields[key]] ?? fallback;

  const area = Number(value("area", NaN));
  const areaText = Number.isFinite(area)
    ? area.toLocaleString("ms-MY", {
        maximumFractionDigits: 2
      })
    : "-";

  return `
    <strong>Lot ${value("lot")}</strong><br>
    UPI: ${value("upi")}<br>
    Daerah: ${value("district")}<br>
    Mukim: ${value("mukim")}<br>
    Seksyen: ${value("section")}<br>
    Keluasan: ${areaText}<br>
    Kod Kegunaan: ${value("landUseCode")}<br>
    Status: ${value("status")}<br>
    Fail Ukur: ${value("surveyFile")}<br>
    Tarikh Kemas Kini: ${value("updated")}
  `;
}

export async function getCadastralConfig() {
  return loadConfig();
}
