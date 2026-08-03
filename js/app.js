import { MAPBOX_TOKEN, START_VIEW, BASEMAPS } from "./config.js";
import {
  addPortalLayers,
  applyLayerVisibility,
  enableTerrain,
  disableTerrain,
  layerState
} from "./layers.js";
import { enableMiddleMousePan } from "./utils.js";
import { initUrbanExplorer } from "./urban-explorer.js";
import { UrbanTour } from "./urban-tour.js";
import { CompareEngine } from "./compare.js";

mapboxgl.accessToken = MAPBOX_TOKEN;

const map = new mapboxgl.Map({
  container: "map",
  style: BASEMAPS.standard,
  center: START_VIEW.center,
  zoom: START_VIEW.zoom,
  pitch: START_VIEW.pitch,
  bearing: 0,
  antialias: true
});

map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
map.addControl(new mapboxgl.ScaleControl({ unit: "metric" }), "bottom-right");
enableMiddleMousePan(map);

const compare = new CompareEngine(map);
let viewMode = "3d";
let nightMode = false;
let activeMarker = null;
let cityLookup = new Map();

map.on("style.load", async () => {
  await addPortalLayers(map);

  if (viewMode === "3d" && layerState.terrain) {
    enableTerrain(map);
  }

  document.getElementById("loadingScreen").classList.add("hidden");
});

map.on("mousemove", (event) => {
  document.getElementById("coordinateStatus").textContent =
    `Lat: ${event.lngLat.lat.toFixed(5)}, Lng: ${event.lngLat.lng.toFixed(5)}`;
});

map.on("zoom", () => {
  document.getElementById("zoomStatus").textContent =
    `Zoom: ${map.getZoom().toFixed(1)}`;
});

map.on("click", (event) => {
  const layerIds = ["health-symbol", "city-circle"]
    .filter((id) => map.getLayer(id));

  const features = map.queryRenderedFeatures(event.point, {
    layers: layerIds
  });

  if (!features.length) return;

  const feature = features[0];
  const properties = feature.properties || {};

  const html = feature.layer.id === "health-symbol"
    ? `<strong>${properties.web_name || "Kemudahan Kesihatan"}</strong><br>
       Kategori: ${properties.web_category || "-"}<br>
       Daerah: ${properties.web_district || "-"}<br>
       Operator: ${properties.web_operator || "-"}`
    : `<strong>${properties.nama_bandar || "Bandar"}</strong><br>
       Hierarki: ${properties.hierarki || "-"}<br>
       Daerah: ${properties.daerah || "-"}`;

  new mapboxgl.Popup()
    .setLngLat(feature.geometry.coordinates)
    .setHTML(html)
    .addTo(map);

  document.getElementById("featureInfo").innerHTML = html;
});

function flyToCity(city, duration = 1800) {
  map.flyTo({
    center: city.center,
    zoom: city.zoom ?? 14.2,
    pitch: viewMode === "3d" ? 64 : 0,
    bearing: 0,
    duration,
    essential: true
  });
}

const cities = await initUrbanExplorer((city) => flyToCity(city));

for (const city of cities) {
  cityLookup.set(city.name.toLowerCase(), city);

  for (const alias of city.aliases || []) {
    cityLookup.set(alias.toLowerCase(), city);
  }
}

const urbanTour = new UrbanTour(map, cities, flyToCity);

document.getElementById("tourBtn").addEventListener("click", () => {
  urbanTour.start();
});

function setViewMode(mode) {
  viewMode = mode;
  const is3D = mode === "3d";

  map.easeTo({
    pitch: is3D ? 60 : 0,
    bearing: 0,
    duration: 800
  });

  if (is3D && layerState.terrain) {
    enableTerrain(map);
  } else {
    disableTerrain(map);
  }

  try {
    map.setConfigProperty(
      "basemap",
      "show3dObjects",
      is3D && layerState.buildings
    );
  } catch (_) {}

  document.getElementById("view2DBtn").classList.toggle("active", !is3D);
  document.getElementById("view3DBtn").classList.toggle("active", is3D);
  document.getElementById("left2DBtn").classList.toggle("active", !is3D);
  document.getElementById("left3DBtn").classList.toggle("active", is3D);
}

document.getElementById("view2DBtn")
  .addEventListener("click", () => setViewMode("2d"));

document.getElementById("view3DBtn")
  .addEventListener("click", () => setViewMode("3d"));

document.getElementById("left2DBtn")
  .addEventListener("click", () => setViewMode("2d"));

document.getElementById("left3DBtn")
  .addEventListener("click", () => setViewMode("3d"));

document.getElementById("basemapSelect").addEventListener("change", (event) => {
  map.setStyle(BASEMAPS[event.target.value]);
});

document.getElementById("cityHierarchyToggle").addEventListener("change", (event) => {
  layerState.cityHierarchy = event.target.checked;
  applyLayerVisibility(map);
  compare.refreshLayers();
  updateLayerCount();
});

document.getElementById("healthFacilityToggle").addEventListener("change", (event) => {
  layerState.healthFacilities = event.target.checked;
  applyLayerVisibility(map);
  compare.refreshLayers();
  updateLayerCount();
});

document.getElementById("trafficToggle").addEventListener("change", (event) => {
  layerState.liveTraffic = event.target.checked;
  applyLayerVisibility(map);
  compare.refreshLayers();
  updateLayerCount();
});

document.getElementById("terrainToggle").addEventListener("change", (event) => {
  layerState.terrain = event.target.checked;

  if (event.target.checked && viewMode === "3d") {
    enableTerrain(map);
  } else {
    disableTerrain(map);
  }

  updateLayerCount();
});

document.getElementById("buildingToggle").addEventListener("change", (event) => {
  layerState.buildings = event.target.checked;

  try {
    map.setConfigProperty(
      "basemap",
      "show3dObjects",
      event.target.checked && viewMode === "3d"
    );
  } catch (_) {}

  updateLayerCount();
});

document.getElementById("toggleAllLayers").addEventListener("click", () => {
  const allOn = !Object.values(layerState).every(Boolean);

  Object.keys(layerState).forEach((key) => {
    layerState[key] = allOn;
  });

  document.getElementById("cityHierarchyToggle").checked = allOn;
  document.getElementById("healthFacilityToggle").checked = allOn;
  document.getElementById("trafficToggle").checked = allOn;
  document.getElementById("terrainToggle").checked = allOn;
  document.getElementById("buildingToggle").checked = allOn;

  applyLayerVisibility(map);
  compare.refreshLayers();

  if (allOn && viewMode === "3d") {
    enableTerrain(map);
  } else if (!allOn) {
    disableTerrain(map);
  }

  updateLayerCount();
});

function updateLayerCount() {
  document.getElementById("activeLayerCount").textContent =
    String(Object.values(layerState).filter(Boolean).length);
}

document.getElementById("healthLegendBtn").addEventListener("click", () => {
  const button = document.getElementById("healthLegendBtn");
  const panel = document.getElementById("healthLegendPanel");
  const expanded = button.getAttribute("aria-expanded") === "true";

  button.setAttribute("aria-expanded", String(!expanded));
  button.classList.toggle("open", !expanded);
  panel.hidden = expanded;
});

document.getElementById("trafficLegendBtn").addEventListener("click", () => {
  const button = document.getElementById("trafficLegendBtn");
  const panel = document.getElementById("trafficLegendPanel");
  const expanded = button.getAttribute("aria-expanded") === "true";

  button.setAttribute("aria-expanded", String(!expanded));
  button.classList.toggle("open", !expanded);
  panel.hidden = expanded;
});

document.getElementById("resetBtn").addEventListener("click", () => {
  map.flyTo({
    ...START_VIEW,
    pitch: viewMode === "3d" ? START_VIEW.pitch : 0,
    bearing: 0,
    duration: 1600
  });
});

document.getElementById("fullscreenBtn").addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});

document.getElementById("nightBtn").addEventListener("click", () => {
  nightMode = !nightMode;

  try {
    map.setConfigProperty(
      "basemap",
      "lightPreset",
      nightMode ? "night" : "day"
    );
  } catch (_) {
    map.setStyle(nightMode ? BASEMAPS.dark : BASEMAPS.standard);
  }
});

document.getElementById("measureBtn").addEventListener("click", (event) => {
  event.currentTarget.classList.toggle("active");
});

document.getElementById("clearMeasureBtn").addEventListener("click", () => {
  document.getElementById("measureBtn").classList.remove("active");
});

document.getElementById("locateBtn").addEventListener("click", () => {
  navigator.geolocation?.getCurrentPosition((position) => {
    const center = [
      position.coords.longitude,
      position.coords.latitude
    ];

    map.flyTo({
      center,
      zoom: 16,
      pitch: viewMode === "3d" ? 55 : 0,
      bearing: 0
    });

    activeMarker?.remove();
    activeMarker = new mapboxgl.Marker({ color: "#2dd4bf" })
      .setLngLat(center)
      .addTo(map);
  });
});

document.getElementById("searchForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const query = document.getElementById("searchInput").value.trim();
  const results = document.getElementById("searchResults");

  if (!query) return;

  results.textContent = "Mencari...";

  const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
  url.searchParams.set("q", query);
  url.searchParams.set("access_token", MAPBOX_TOKEN);
  url.searchParams.set("limit", "5");
  url.searchParams.set("country", "MY");
  url.searchParams.set("language", "ms,en");

  try {
    const response = await fetch(url);
    const data = await response.json();
    results.innerHTML = "";

    for (const feature of data.features || []) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "result-item";
      button.textContent =
        feature.properties?.full_address ||
        feature.properties?.name ||
        "Lokasi";

      button.addEventListener("click", () => {
        map.flyTo({
          center: feature.geometry.coordinates,
          zoom: 16,
          pitch: viewMode === "3d" ? 60 : 0,
          bearing: 0
        });

        results.innerHTML = "";
      });

      results.appendChild(button);
    }
  } catch (_) {
    results.textContent = "Carian tidak berjaya.";
  }
});

document.getElementById("chatForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const input = document.getElementById("chatInput");
  const text = input.value.trim();

  if (!text) return;

  addChatBubble(text, "user");
  input.value = "";

  const normalized = text.toLowerCase();
  const match = [...cityLookup.entries()]
    .find(([name]) => normalized.includes(name));

  let reply = "Arahan belum dikenali.";

  if (match) {
    flyToCity(match[1]);
    reply = `Peta dizum ke ${match[1].name}.`;
  } else if (normalized.includes("2d")) {
    setViewMode("2d");
    reply = "Paparan 2D diaktifkan.";
  } else if (normalized.includes("3d")) {
    setViewMode("3d");
    reply = "Paparan 3D diaktifkan.";
  } else if (normalized.includes("malam")) {
    document.getElementById("nightBtn").click();
    reply = "Mod malam ditukar.";
  }

  setTimeout(() => addChatBubble(reply, "bot"), 250);
});

function addChatBubble(text, type) {
  const container = document.getElementById("chatMessages");
  const bubble = document.createElement("div");

  bubble.className = `chat-bubble ${type}`;
  bubble.textContent = text;

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

document.getElementById("mobileMenuBtn").addEventListener("click", () => {
  document.getElementById("leftSidebar").classList.toggle("open");
});

document.getElementById("rightPanelToggle").addEventListener("click", () => {
  document.getElementById("rightSidebar").classList.toggle("open");
});
