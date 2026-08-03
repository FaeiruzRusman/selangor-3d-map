const RESULT_SOURCE_ID = "ai-query-result";
const RESULT_POINT_ID = "ai-query-result-point";
const RESULT_FILL_ID = "ai-query-result-fill";
const RESULT_LINE_ID = "ai-query-result-line";

function featureCollection(features = []) {
  return {
    type: "FeatureCollection",
    features
  };
}

function ensureResultLayers(map) {
  if (!map.getSource(RESULT_SOURCE_ID)) {
    map.addSource(RESULT_SOURCE_ID, {
      type: "geojson",
      data: featureCollection()
    });
  }

  if (!map.getLayer(RESULT_FILL_ID)) {
    map.addLayer({
      id: RESULT_FILL_ID,
      type: "fill",
      source: RESULT_SOURCE_ID,
      slot: "top",
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "fill-color": "#FACC15",
        "fill-opacity": 0.18
      }
    });
  }

  if (!map.getLayer(RESULT_LINE_ID)) {
    map.addLayer({
      id: RESULT_LINE_ID,
      type: "line",
      source: RESULT_SOURCE_ID,
      slot: "top",
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "line-color": "#FACC15",
        "line-width": 4,
        "line-opacity": 0.95
      }
    });
  }

  if (!map.getLayer(RESULT_POINT_ID)) {
    map.addLayer({
      id: RESULT_POINT_ID,
      type: "circle",
      source: RESULT_SOURCE_ID,
      slot: "top",
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          7, 8,
          15, 14
        ],
        "circle-color": "#FACC15",
        "circle-stroke-color": "#FFFFFF",
        "circle-stroke-width": 3,
        "circle-opacity": 0.92
      }
    });
  }
}

export function highlightFeatures(map, features) {
  if (!map.isStyleLoaded()) {
    map.once("style.load", () => highlightFeatures(map, features));
    return;
  }

  ensureResultLayers(map);
  map.getSource(RESULT_SOURCE_ID).setData(featureCollection(features));
}

export function clearHighlight(map) {
  if (map.getSource(RESULT_SOURCE_ID)) {
    map.getSource(RESULT_SOURCE_ID).setData(featureCollection());
  }
}

function visitCoordinates(coordinates, callback) {
  if (!Array.isArray(coordinates)) return;

  if (
    coordinates.length >= 2 &&
    Number.isFinite(Number(coordinates[0])) &&
    Number.isFinite(Number(coordinates[1]))
  ) {
    callback([Number(coordinates[0]), Number(coordinates[1])]);
    return;
  }

  coordinates.forEach((item) => visitCoordinates(item, callback));
}

export function zoomToFeatures(map, features, options = {}) {
  if (!features?.length) return false;

  const bounds = new mapboxgl.LngLatBounds();

  features.forEach((feature) => {
    visitCoordinates(feature.geometry?.coordinates, (coordinate) => {
      bounds.extend(coordinate);
    });
  });

  if (bounds.isEmpty()) return false;

  map.fitBounds(bounds, {
    padding: options.padding ?? 90,
    maxZoom: options.maxZoom ?? 14.5,
    duration: options.duration ?? 1500,
    bearing: 0
  });

  return true;
}

export function showResultPopup(map, feature, html) {
  if (!feature?.geometry) return;

  let coordinate = null;

  if (feature.geometry.type === "Point") {
    coordinate = feature.geometry.coordinates;
  } else {
    const bounds = new mapboxgl.LngLatBounds();
    visitCoordinates(feature.geometry.coordinates, (item) => bounds.extend(item));
    coordinate = bounds.getCenter();
  }

  new mapboxgl.Popup()
    .setLngLat(coordinate)
    .setHTML(html)
    .addTo(map);
}
