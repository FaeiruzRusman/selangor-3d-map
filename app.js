const DEFAULT_TOKEN = "PASTE_YOUR_MAPBOX_PUBLIC_TOKEN_HERE";
const START_VIEW = { center: [101.5183, 3.0738], zoom: 12.5, pitch: 62, bearing: -20 };

const locations = {
  "shah-alam": { center: [101.5183, 3.0738], zoom: 13.2 },
  "klang": { center: [101.4496, 3.0449], zoom: 13 },
  "petaling-jaya": { center: [101.6444, 3.1073], zoom: 13 },
  "kajang": { center: [101.7882, 2.9935], zoom: 13 }
};

let map;
let terrainEnabled = true;
let buildingsEnabled = true;

const tokenModal = document.getElementById("tokenModal");
const tokenInput = document.getElementById("tokenInput");
const storedToken = localStorage.getItem("mapboxPublicToken");
const initialToken = storedToken || (DEFAULT_TOKEN.startsWith("pk.") ? DEFAULT_TOKEN : "");

if (initialToken) {
  tokenModal.classList.remove("visible");
  initialiseMap(initialToken);
}

document.getElementById("saveToken").addEventListener("click", () => {
  const token = tokenInput.value.trim();
  if (!token.startsWith("pk.")) {
    alert("Sila masukkan Mapbox public token yang bermula dengan 'pk.'.");
    return;
  }
  localStorage.setItem("mapboxPublicToken", token);
  tokenModal.classList.remove("visible");
  initialiseMap(token);
});

function initialiseMap(token) {
  mapboxgl.accessToken = token;
  map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/standard",
    center: START_VIEW.center,
    zoom: START_VIEW.zoom,
    pitch: START_VIEW.pitch,
    bearing: START_VIEW.bearing,
    antialias: true
  });

  map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
  map.addControl(new mapboxgl.FullscreenControl(), "top-right");
  map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), "top-right");
  map.addControl(new mapboxgl.ScaleControl({ unit: "metric" }), "bottom-right");

  map.on("style.load", () => {
    configureStandardStyle("day");
    enableTerrain();
    addBoundaryLayer();
  });

  map.on("click", (event) => {
    const { lng, lat } = event.lngLat;
    document.getElementById("coordinates").textContent = `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
    new mapboxgl.Popup()
      .setLngLat([lng, lat])
      .setHTML(`<strong>Koordinat</strong><br>Lat: ${lat.toFixed(5)}<br>Lng: ${lng.toFixed(5)}`)
      .addTo(map);
  });
}

function configureStandardStyle(lightPreset) {
  if (!map) return;
  try {
    map.setConfigProperty("basemap", "lightPreset", lightPreset);
    map.setConfigProperty("basemap", "show3dObjects", buildingsEnabled);
  } catch (error) {
    console.warn("Konfigurasi Standard Style belum tersedia:", error);
  }
}

function enableTerrain() {
  if (!map || map.getSource("mapbox-dem")) return;
  map.addSource("mapbox-dem", {
    type: "raster-dem",
    url: "mapbox://mapbox.mapbox-terrain-dem-v1",
    tileSize: 512,
    maxzoom: 14
  });
  map.setTerrain({ source: "mapbox-dem", exaggeration: 1.35 });
}

function disableTerrain() {
  if (!map) return;
  map.setTerrain(null);
}

function addBoundaryLayer() {
  const geojson = {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { name: "Kawasan Contoh Shah Alam" },
      geometry: {
        type: "Polygon",
        coordinates: [[[101.491,3.094],[101.548,3.094],[101.548,3.047],[101.491,3.047],[101.491,3.094]]]
      }
    }]
  };

  map.addSource("sample-area", { type: "geojson", data: geojson });
  map.addLayer({
    id: "sample-area-fill",
    type: "fill",
    source: "sample-area",
    slot: "middle",
    paint: { "fill-color": "#f59e0b", "fill-opacity": 0.12 }
  });
  map.addLayer({
    id: "sample-area-line",
    type: "line",
    source: "sample-area",
    slot: "top",
    paint: { "line-color": "#f59e0b", "line-width": 3 }
  });
}

document.getElementById("terrainToggle").addEventListener("change", (event) => {
  terrainEnabled = event.target.checked;
  terrainEnabled ? enableTerrain() : disableTerrain();
});

document.getElementById("buildingsToggle").addEventListener("change", (event) => {
  buildingsEnabled = event.target.checked;
  configureStandardStyle(document.getElementById("nightToggle").checked ? "night" : "day");
});

document.getElementById("nightToggle").addEventListener("change", (event) => {
  configureStandardStyle(event.target.checked ? "night" : "day");
});

document.getElementById("resetView").addEventListener("click", () => {
  map?.flyTo({ ...START_VIEW, duration: 1800 });
});

document.querySelectorAll("[data-location]").forEach((button) => {
  button.addEventListener("click", () => {
    const place = locations[button.dataset.location];
    map?.flyTo({ center: place.center, zoom: place.zoom, pitch: 60, bearing: -18, duration: 1800 });
  });
});

document.getElementById("menuBtn").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
});

document.getElementById("searchForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!mapboxgl.accessToken) return;
  const query = document.getElementById("searchInput").value.trim();
  const resultsEl = document.getElementById("searchResults");
  if (!query) return;

  resultsEl.textContent = "Mencari...";
  try {
    const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
    url.searchParams.set("q", query);
    url.searchParams.set("access_token", mapboxgl.accessToken);
    url.searchParams.set("limit", "5");
    url.searchParams.set("country", "MY");
    url.searchParams.set("language", "ms,en");

    const response = await fetch(url);
    if (!response.ok) throw new Error("Carian gagal");
    const data = await response.json();
    resultsEl.innerHTML = "";

    if (!data.features?.length) {
      resultsEl.textContent = "Tiada lokasi ditemui.";
      return;
    }

    data.features.forEach((feature) => {
      const button = document.createElement("button");
      button.className = "result-item";
      button.textContent = feature.properties?.full_address || feature.properties?.name || "Lokasi";
      button.addEventListener("click", () => {
        const coordinates = feature.geometry.coordinates;
        map.flyTo({ center: coordinates, zoom: 16, pitch: 65, duration: 1800 });
        new mapboxgl.Marker().setLngLat(coordinates).addTo(map);
        resultsEl.innerHTML = "";
      });
      resultsEl.appendChild(button);
    });
  } catch (error) {
    resultsEl.textContent = "Carian tidak berjaya. Semak token dan sambungan internet.";
    console.error(error);
  }
});
