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
import { ComparePanelUI } from "./compare-panel-ui.js";
import {
  SpatialTools,
  isSpatialToolActive
} from "./spatial-tools.js";
import {
  NetworkIntelligence,
  isNetworkIntelligenceActive
} from "./network-intelligence.js";
import {
  applyRightPanelRegistry,
  validateRightPanelRegistry
} from "./component-registry.js";
import {
  ExecutiveLanduseIntelligence
} from "./executive-landuse.js";
import { WeatherIntelligence } from "./weather.js";
import { FloodIntelligence } from "./flood.js";
import { SpatialAssistant } from "./ai-assistant.js";
import { SmartSearch } from "./smart-search.js";
import {
  addCadastralLayer,
  cadastralPopupHtml,
  getCadastralConfig
} from "./cadastral.js";

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
const comparePanelUI = new ComparePanelUI();
const spatialTools = new SpatialTools(map);
const networkIntelligence = new NetworkIntelligence(
  map,
  spatialTools
);

const rightSidebar = document.getElementById("rightSidebar");

try {
  applyRightPanelRegistry(rightSidebar);

  const registryStatus = validateRightPanelRegistry(rightSidebar);
  if (!registryStatus.valid) {
    console.warn(
      "Right Panel Component Registry tidak lengkap:",
      registryStatus.missing
    );
  }
} catch (error) {
  console.error("Component Registry gagal dimulakan:", error);
}

try {
  new ExecutiveLanduseIntelligence();
} catch (error) {
  console.error("Executive Landuse gagal dimulakan:", error);
}

let weather = null;
let flood = null;

try {
  weather = new WeatherIntelligence(map);
} catch (error) {
  console.error("Weather Intelligence gagal dimulakan:", error);
}

try {
  flood = new FloodIntelligence(map);
} catch (error) {
  console.error("Flood Intelligence gagal dimulakan:", error);
}
let viewMode = "3d";
let nightMode = false;
let activeMarker = null;
let cityLookup = new Map();

function hideLoadingScreen() {
  const loadingScreen = document.getElementById("loadingScreen");
  if (loadingScreen) {
    loadingScreen.classList.add("hidden");
  }
}

function showStartupWarning(message) {
  console.warn(message);

  let notice = document.getElementById("startupWarning");
  if (!notice) {
    notice = document.createElement("div");
    notice.id = "startupWarning";
    notice.className = "startup-warning";
    document.body.appendChild(notice);
  }

  notice.textContent = message;
  notice.hidden = false;

  window.setTimeout(() => {
    notice.hidden = true;
  }, 9000);
}

map.on("style.load", async () => {
  try {
    await addPortalLayers(map);

    if (viewMode === "3d" && layerState.terrain) {
      enableTerrain(map);
    }
  } catch (error) {
    console.error("Sebahagian layer portal gagal dimuatkan:", error);
    showStartupWarning(
      "Portal dibuka, tetapi sebahagian layer gagal dimuatkan. Semak Console untuk butiran."
    );
  } finally {
    hideLoadingScreen();
  }
});

map.on("error", (event) => {
  console.error("Mapbox map error:", event?.error || event);
});

// Startup failsafe: loading overlay tidak boleh mengunci portal.
window.setTimeout(() => {
  const loadingScreen = document.getElementById("loadingScreen");
  if (loadingScreen && !loadingScreen.classList.contains("hidden")) {
    hideLoadingScreen();
    showStartupWarning(
      "Portal dibuka dalam mod pemulihan kerana proses startup mengambil masa terlalu lama."
    );
  }
}, 12000);

map.on("mousemove", (event) => {
  document.getElementById("coordinateStatus").textContent =
    `Lat: ${event.lngLat.lat.toFixed(5)}, Lng: ${event.lngLat.lng.toFixed(5)}`;
});

map.on("zoom", () => {
  document.getElementById("zoomStatus").textContent =
    `Zoom: ${map.getZoom().toFixed(1)}`;
});

map.on("click", async (event) => {
  if (
    isSpatialToolActive() ||
    isNetworkIntelligenceActive()
  ) return;
  const layerIds = ["cadastral-fill", "district-fill", "pbt-fill", "school-symbol", "police-symbol", "health-symbol", "city-circle"]
    .filter((id) => map.getLayer(id));

  const features = map.queryRenderedFeatures(event.point, {
    layers: layerIds
  });

  if (!features.length) return;

  const feature = features[0];
  const properties = feature.properties || {};

  let html;

  if (feature.layer.id === "cadastral-fill") {
    const config = await getCadastralConfig();
    html = cadastralPopupHtml(properties, config);
  } else if (feature.layer.id === "district-fill") {
    const area = Number(properties.web_area);
    const areaText = Number.isFinite(area)
      ? `${area.toLocaleString("ms-MY", { maximumFractionDigits: 2 })} hektar`
      : "-";

    html = `<strong>Daerah ${properties.web_name || "-"}</strong><br>
      Kod Daerah: ${properties.web_code || "-"}<br>
      Keluasan: ${areaText}<br>
      Tahun data: 2024`;
  } else if (feature.layer.id === "pbt-fill") {
    const area = Number(properties.web_area);
    const areaText = Number.isFinite(area)
      ? `${area.toLocaleString("ms-MY", { maximumFractionDigits: 2 })} hektar`
      : "-";

    html = `<strong>${properties.web_name || "PBT"}</strong><br>
      Kategori: ${properties.web_type || "-"}<br>
      Keluasan: ${areaText}<br>
      Tahun data: 2024`;
  } else if (feature.layer.id === "school-symbol") {
    html = `<strong>${properties.web_name || "Sekolah"}</strong><br>
      Tahap: ${properties.web_level || "-"}<br>
      PPD: ${properties.web_ppd || "-"}<br>
      Daerah: ${properties.web_district || "-"}<br>
      PBT: ${properties.web_pbt || "-"}<br>
      Jenis Warta: ${properties.web_type || "-"}`;
  } else if (feature.layer.id === "police-symbol") {
    html = `<strong>${properties.web_name || "PDRM"}</strong><br>
      Hierarki: ${properties.web_hierarchy || "-"}<br>
      Daerah: ${properties.web_district || "-"}<br>
      Alamat: ${properties.web_address || "-"}<br>
      Telefon: ${properties.web_phone || "-"}`;
  } else if (feature.layer.id === "health-symbol") {
    html = `<strong>${properties.web_name || "Kemudahan Kesihatan"}</strong><br>
      Kategori: ${properties.web_category || "-"}<br>
      Daerah: ${properties.web_district || "-"}<br>
      Operator: ${properties.web_operator || "-"}`;
  } else {
    html = `<strong>${properties.nama_bandar || "Bandar"}</strong><br>
      Hierarki: ${properties.hierarki || "-"}<br>
      Daerah: ${properties.daerah || "-"}`;
  }

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

  window.dispatchEvent(new CustomEvent("suo:location-change", {
    detail: {
      name: city.name,
      center: city.center
    }
  }));
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

document.getElementById("cadastralToggle").addEventListener("change", async (event) => {
  const status = document.getElementById("cadastralStatus");

  if (event.target.checked) {
    const result = await addCadastralLayer(map);

    if (!result.configured) {
      event.target.checked = false;
      layerState.cadastral = false;
      status.textContent =
        "Vector Tile belum dikonfigurasi. Isi URL dalam config/cadastral-layer.json.";
      status.classList.add("warning");
      updateLayerCount();
      return;
    }

    status.textContent = "Lot Kadaster aktif. Paparan bermula pada zoom 11.";
    status.classList.remove("warning");
  }

  layerState.cadastral = event.target.checked;
  applyLayerVisibility(map);
  compare.refreshLayers();
  updateLayerCount();
});

document.getElementById("pbtToggle").addEventListener("change", (event) => {
  layerState.pbt = event.target.checked;
  applyLayerVisibility(map);
  compare.refreshLayers();
  updateLayerCount();
});

document.getElementById("districtToggle").addEventListener("change", (event) => {
  layerState.districts = event.target.checked;
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

document.getElementById("policeToggle").addEventListener("change", (event) => {
  layerState.police = event.target.checked;
  applyLayerVisibility(map);
  compare.refreshLayers();
  updateLayerCount();
});

document.getElementById("schoolToggle").addEventListener("change", (event) => {
  layerState.schools = event.target.checked;
  applyLayerVisibility(map);
  compare.refreshLayers();
  updateLayerCount();
});

document.getElementById("floodRainToggle").addEventListener("change", (event) => {
  flood.setVisible(event.target.checked);
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
  document.getElementById("pbtToggle").checked = allOn;
  document.getElementById("districtToggle").checked = allOn;
  document.getElementById("healthFacilityToggle").checked = allOn;
  document.getElementById("trafficToggle").checked = allOn;
  document.getElementById("policeToggle").checked = allOn;
  document.getElementById("schoolToggle").checked = allOn;
  document.getElementById("floodRainToggle").checked = allOn;
  document.getElementById("terrainToggle").checked = allOn;
  document.getElementById("buildingToggle").checked = allOn;

  applyLayerVisibility(map);
  compare.refreshLayers();
  flood.setVisible(allOn);

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

document.getElementById("cadastralLegendBtn").addEventListener("click", () => {
  const button = document.getElementById("cadastralLegendBtn");
  const panel = document.getElementById("cadastralLegendPanel");
  const expanded = button.getAttribute("aria-expanded") === "true";

  button.setAttribute("aria-expanded", String(!expanded));
  button.classList.toggle("open", !expanded);
  panel.hidden = expanded;
});

document.getElementById("pbtLegendBtn").addEventListener("click", () => {
  const button = document.getElementById("pbtLegendBtn");
  const panel = document.getElementById("pbtLegendPanel");
  const expanded = button.getAttribute("aria-expanded") === "true";

  button.setAttribute("aria-expanded", String(!expanded));
  button.classList.toggle("open", !expanded);
  panel.hidden = expanded;
});

document.getElementById("districtLegendBtn").addEventListener("click", () => {
  const button = document.getElementById("districtLegendBtn");
  const panel = document.getElementById("districtLegendPanel");
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

document.getElementById("policeLegendBtn").addEventListener("click", () => {
  const button = document.getElementById("policeLegendBtn");
  const panel = document.getElementById("policeLegendPanel");
  const expanded = button.getAttribute("aria-expanded") === "true";

  button.setAttribute("aria-expanded", String(!expanded));
  button.classList.toggle("open", !expanded);
  panel.hidden = expanded;
});

document.getElementById("schoolLegendBtn").addEventListener("click", () => {
  const button = document.getElementById("schoolLegendBtn");
  const panel = document.getElementById("schoolLegendPanel");
  const expanded = button.getAttribute("aria-expanded") === "true";

  button.setAttribute("aria-expanded", String(!expanded));
  button.classList.toggle("open", !expanded);
  panel.hidden = expanded;
});

document.getElementById("floodLegendBtn").addEventListener("click", () => {
  const button = document.getElementById("floodLegendBtn");
  const panel = document.getElementById("floodLegendPanel");
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

function addChatBubble(text, type, options = {}) {
  const container = document.getElementById("chatMessages");
  const bubble = document.createElement("div");

  bubble.className = `chat-bubble ${type}`;
  if (options.loading) {
    bubble.classList.add("chat-loading");
  }

  bubble.textContent = text;

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
  return bubble;
}



document.querySelectorAll("[data-layer-category]").forEach((button) => {
  button.addEventListener("click", () => {
    const category = button.dataset.layerCategory;
    const content = document.querySelector(
      `[data-layer-category-content="${category}"]`
    );

    if (!content) return;

    const expanded = button.getAttribute("aria-expanded") === "true";

    button.setAttribute("aria-expanded", String(!expanded));
    button.classList.toggle("collapsed", expanded);
    content.hidden = expanded;
  });
});



const workspace = document.getElementById("workspace");
const leftSidebar = document.getElementById("leftSidebar");
const rightSidebar = document.getElementById("rightSidebar");
const openLeftPanelTab = document.getElementById("openLeftPanelTab");
const openRightPanelTab = document.getElementById("openRightPanelTab");
const focusMapBtn = document.getElementById("focusMapBtn");

const WORKSPACE_STORAGE_KEY = "suoWorkspacePanelStateV39";

let workspaceState = {
  leftOpen: true,
  rightOpen: true
};

let stateBeforeFocus = null;
let resizeWorkspaceTimer = null;

function readWorkspaceState() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(WORKSPACE_STORAGE_KEY) || "null"
    );

    if (
      saved &&
      typeof saved.leftOpen === "boolean" &&
      typeof saved.rightOpen === "boolean"
    ) {
      workspaceState = saved;
    }
  } catch (_) {
    workspaceState = {
      leftOpen: true,
      rightOpen: true
    };
  }
}

function saveWorkspaceState() {
  try {
    localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify(workspaceState)
    );
  } catch (_) {}
}

function resizeWorkspaceMaps() {
  if (resizeWorkspaceTimer) {
    clearTimeout(resizeWorkspaceTimer);
  }

  requestAnimationFrame(() => {
    map.resize();
    compare.compareMap?.resize();
  });

  resizeWorkspaceTimer = setTimeout(() => {
    map.resize();
    compare.compareMap?.resize();
  }, 260);
}

function renderWorkspaceState({ persist = true } = {}) {
  workspace.classList.toggle(
    "left-panel-collapsed",
    !workspaceState.leftOpen
  );

  workspace.classList.toggle(
    "right-panel-collapsed",
    !workspaceState.rightOpen
  );

  leftSidebar.setAttribute(
    "aria-hidden",
    String(!workspaceState.leftOpen)
  );

  rightSidebar.setAttribute(
    "aria-hidden",
    String(!workspaceState.rightOpen)
  );

  openLeftPanelTab.hidden = workspaceState.leftOpen;
  openRightPanelTab.hidden = workspaceState.rightOpen;

  const focusMode =
    !workspaceState.leftOpen &&
    !workspaceState.rightOpen;

  focusMapBtn.classList.toggle("active", focusMode);
  focusMapBtn.textContent = focusMode
    ? "▣ Restore Panels"
    : "▣ Focus Map";

  if (persist) {
    saveWorkspaceState();
  }

  resizeWorkspaceMaps();
}

function setLeftPanel(open) {
  workspaceState.leftOpen = Boolean(open);
  renderWorkspaceState();
}

function setRightPanel(open) {
  workspaceState.rightOpen = Boolean(open);
  renderWorkspaceState();
}

document.getElementById("closeLeftPanelBtn")
  .addEventListener("click", () => setLeftPanel(false));

document.getElementById("closeRightPanelBtn")
  .addEventListener("click", () => setRightPanel(false));

openLeftPanelTab.addEventListener("click", () => {
  setLeftPanel(true);
});

openRightPanelTab.addEventListener("click", () => {
  setRightPanel(true);
});

focusMapBtn.addEventListener("click", () => {
  const alreadyFocused =
    !workspaceState.leftOpen &&
    !workspaceState.rightOpen;

  if (alreadyFocused) {
    workspaceState = stateBeforeFocus || {
      leftOpen: true,
      rightOpen: true
    };

    stateBeforeFocus = null;
  } else {
    stateBeforeFocus = { ...workspaceState };
    workspaceState = {
      leftOpen: false,
      rightOpen: false
    };
  }

  renderWorkspaceState();
});

readWorkspaceState();
renderWorkspaceState({ persist: false });

window.addEventListener("resize", resizeWorkspaceMaps);

document.getElementById("mobileMenuBtn").addEventListener("click", () => {
  document.getElementById("leftSidebar").classList.toggle("open");
});

document.getElementById("rightPanelToggle").addEventListener("click", () => {
  document.getElementById("rightSidebar").classList.toggle("open");
});


const smartSearch = new SmartSearch({
  map,
  viewModeProvider: () => viewMode
});

const ASSISTANT_LAYER_LABELS = {
  traffic: "Live Traffic",
  floodRain: "Flood Intelligence Fasa 1",
  cadastral: "Lot Kadaster Selangor 2023",
  pbt: "Sempadan PBT",
  districts: "Sempadan Daerah",
  healthFacilities: "Kemudahan Kesihatan",
  police: "Keselamatan",
  schools: "Pendidikan",
  cityHierarchy: "Hierarki Bandar DPN2",
  terrain: "Terrain 3D",
  buildings: "Bangunan 3D"
};

function setAssistantLayerVisibility(layer, visible) {
  const toggleMap = {
    traffic: "trafficToggle",
    floodRain: "floodRainToggle",
    cadastral: "cadastralToggle",
    pbt: "pbtToggle",
    districts: "districtToggle",
    healthFacilities: "healthFacilityToggle",
    police: "policeToggle",
    schools: "schoolToggle",
    cityHierarchy: "cityHierarchyToggle",
    terrain: "terrainToggle",
    buildings: "buildingToggle"
  };

  const toggleId = toggleMap[layer];
  if (!toggleId) return false;

  const toggle = document.getElementById(toggleId);
  if (!toggle) return false;

  toggle.checked = visible;
  toggle.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

const spatialAssistant = new SpatialAssistant({
  map,
  addBubble: addChatBubble,
  cityLookup,
  actions: {
    setViewMode,
    flyToCity,
    openSplit: () => compare.open(),
    focusMap: () => focusMapBtn.click(),
    setLeftPanel,
    setRightPanel,
    setLayerVisibility: setAssistantLayerVisibility,
    getLayerLabel: (layer) => ASSISTANT_LAYER_LABELS[layer] || layer
  }
});

spatialAssistant.bindForm(
  document.getElementById("chatForm"),
  document.getElementById("chatInput")
);

document.querySelectorAll("[data-assistant-example]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.getElementById("chatInput");
    input.value = button.dataset.assistantExample || "";
    input.focus();
    document.getElementById("chatForm").requestSubmit();
  });
});

