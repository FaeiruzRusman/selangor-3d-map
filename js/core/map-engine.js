import {
  MAPBOX_TOKEN,
  START_VIEW,
  BASEMAPS
} from "../config.js";
import { enableMiddleMousePan } from "../utils.js";

export function createMainMap() {
  if (
    typeof window.mapboxgl === "undefined" ||
    typeof window.mapboxgl.Map !== "function"
  ) {
    throw new Error("Mapbox GL JS tidak tersedia.");
  }

  const container = document.getElementById("map");

  if (!container) {
    throw new Error('Container peta "#map" tidak ditemui.');
  }

  mapboxgl.accessToken = MAPBOX_TOKEN;

  const map = new mapboxgl.Map({
    container,
    style: BASEMAPS.standard,
    center: START_VIEW.center,
    zoom: START_VIEW.zoom,
    pitch: START_VIEW.pitch,
    bearing: 0,
    antialias: true
  });

  map.addControl(
    new mapboxgl.NavigationControl({
      visualizePitch: true
    }),
    "top-right"
  );

  map.addControl(
    new mapboxgl.ScaleControl({
      unit: "metric"
    }),
    "bottom-right"
  );

  enableMiddleMousePan(map);

  return map;
}
