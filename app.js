const MAPBOX_PUBLIC_TOKEN = "pk.eyJ1IjoiYXBhaTE5ODkiLCJhIjoiY21zODZ2Nzc4MDAzODJ5czk5eDFhOXFpZSJ9.bZ4OwmZqVZKRs_CX3f0tVA";

const START_VIEW = {
  center: [101.5183, 3.0738],
  zoom: 12.6,
  pitch: 58,
  bearing: 0
};

let locations = {};
let cityCommands = {};

const basemapStyles = {
  standard: "mapbox://styles/mapbox/standard",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  streets: "mapbox://styles/mapbox/streets-v12",
  outdoors: "mapbox://styles/mapbox/outdoors-v12",
  dark: "mapbox://styles/mapbox/dark-v11"
};

let map;
let activeMarker = null;
let measureMode = false;
let measurePoints = [];
let measureMarkers = [];
let nightMode = false;
let toggleAllState = true;

const layerState = {
  urban: true,
  facility: true,
  mobility: true,
  terrain: true,
  buildings: true
};

loadUrbanHierarchy();
initialiseMap();


async function loadUrbanHierarchy() {
  const statusEl = document.getElementById("urbanPolicyStatus");
  const explorerEl = document.getElementById("urbanExplorer");
  const countEl = document.getElementById("urbanLocationCount");

  try {
    const response = await fetch("config/urban-hierarchy.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const config = await response.json();
    const groups = Array.isArray(config.groups) ? config.groups : [];

    locations = {};
    cityCommands = {};
    explorerEl.innerHTML = "";

    let total = 0;

    groups.forEach((group) => {
      const cities = Array.isArray(group.cities) ? group.cities : [];
      if (!cities.length) return;

      const section = document.createElement("section");
      section.className = "urban-group";

      const heading = document.createElement("h3");
      heading.textContent = group.name || "Hierarki Bandar";
      section.appendChild(heading);

      const grid = document.createElement("div");
      grid.className = "quick-grid";

      cities.forEach((city) => {
        if (!city?.key || !Array.isArray(city.center)) return;

        locations[city.key] = {
          center: city.center,
          zoom: city.zoom ?? 14,
          pitch: city.pitch ?? 62,
          bearing: 0
        };

        const aliases = [city.name, ...(city.aliases || [])]
          .filter(Boolean)
          .map((value) => value.toLowerCase());

        aliases.forEach((alias) => {
          cityCommands[alias] = [city.key, city.name];
        });

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = city.name;
        button.addEventListener("click", () => flyToLocation(city.key));
        grid.appendChild(button);
        total += 1;
      });

      section.appendChild(grid);
      explorerEl.appendChild(section);
    });

    countEl.textContent = String(total);

    if (total === 0) {
      statusEl.className = "policy-status warning";
      statusEl.textContent =
        "Senarai bandar rasmi DPN3 belum dimasukkan. Tiada bandar andaian dipaparkan.";
      explorerEl.innerHTML =
        '<p class="empty-state">Kemaskini <code>config/urban-hierarchy.json</code> selepas senarai rasmi DPN3 diterbitkan.</p>';
    } else {
      statusEl.className = "policy-status ready";
      statusEl.textContent = `${total} bandar rasmi DPN3 dimuatkan.`;
    }
  } catch (error) {
    console.error("Urban hierarchy config error:", error);
    statusEl.className = "policy-status error";
    statusEl.textContent = "Konfigurasi bandar DPN3 gagal dimuatkan.";
    explorerEl.innerHTML =
      '<p class="empty-state">Semak fail <code>config/urban-hierarchy.json</code>.</p>';
  }
}

function initialiseMap() {
  mapboxgl.accessToken = MAPBOX_PUBLIC_TOKEN;

  map = new mapboxgl.Map({
    container: "map",
    style: basemapStyles.standard,
    center: START_VIEW.center,
    zoom: START_VIEW.zoom,
    pitch: START_VIEW.pitch,
    bearing: 0,
    antialias: true,
    dragRotate: false,
    touchPitch: true,
    bearingSnap: 360
  });

  map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
  map.addControl(new mapboxgl.ScaleControl({ unit: "metric" }), "bottom-right");

  // Kunci orientasi peta supaya utara sentiasa di bahagian atas.
  map.touchZoomRotate.disableRotation();

  map.on("load", () => {
    addOperationalLayers();
    updateLayerCount();
    document.getElementById("loadingScreen").classList.add("hidden");
  });

  map.on("style.load", () => {
    configureCurrentStyle();
    addOperationalLayers();
  });

  map.on("mousemove", (event) => {
    document.getElementById("coordinateStatus").textContent =
      `Lat: ${event.lngLat.lat.toFixed(5)}, Lng: ${event.lngLat.lng.toFixed(5)}`;
  });

  map.on("zoom", () => {
    document.getElementById("zoomStatus").textContent = `Zoom: ${map.getZoom().toFixed(1)}`;
  });

  map.on("click", handleMapClick);

  map.on("mouseenter", "facility-points", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", "facility-points", () => {
    map.getCanvas().style.cursor = "";
  });

  map.on("rotate", () => {
    if (Math.abs(map.getBearing()) > 0.01) map.setBearing(0);
  });

  map.on("error", (event) => {
    console.error("Mapbox error:", event.error);
  });
}

function configureCurrentStyle() {
  if (!map) return;

  try {
    if (map.getStyle()?.sprite?.includes("standard")) {
      map.setConfigProperty("basemap", "lightPreset", nightMode ? "night" : "day");
      map.setConfigProperty("basemap", "show3dObjects", layerState.buildings);
    }
  } catch (error) {
    console.warn("Standard style configuration unavailable:", error);
  }

  if (layerState.terrain) enableTerrain();
}

function enableTerrain() {
  if (!map || !map.isStyleLoaded()) return;

  if (!map.getSource("mapbox-dem")) {
    map.addSource("mapbox-dem", {
      type: "raster-dem",
      url: "mapbox://mapbox.mapbox-terrain-dem-v1",
      tileSize: 512,
      maxzoom: 14
    });
  }

  map.setTerrain({
    source: "mapbox-dem",
    exaggeration: 1.35
  });
}

function disableTerrain() {
  if (!map) return;
  map.setTerrain(null);
}

async function addOperationalLayers() {
  if (!map || !map.isStyleLoaded()) return;

  if (!map.getSource("urban-focus")) {
    map.addSource("urban-focus", {
      type: "geojson",
      data: "data/urban-focus.geojson"
    });
  }

  if (!map.getLayer("urban-focus-fill")) {
    map.addLayer({
      id: "urban-focus-fill",
      type: "fill",
      source: "urban-focus",
      paint: {
        "fill-color": "#f7b500",
        "fill-opacity": 0.16
      }
    });
  }

  if (!map.getLayer("urban-focus-line")) {
    map.addLayer({
      id: "urban-focus-line",
      type: "line",
      source: "urban-focus",
      paint: {
        "line-color": "#f7b500",
        "line-width": 3
      }
    });
  }

  if (!map.getSource("facilities")) {
    map.addSource("facilities", {
      type: "geojson",
      data: "data/facilities.geojson"
    });
  }

  if (!map.getLayer("facility-points")) {
    map.addLayer({
      id: "facility-points",
      type: "circle",
      source: "facilities",
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10, 4,
          15, 8
        ],
        "circle-color": [
          "match",
          ["get", "category"],
          "Sekolah", "#38bdf8",
          "Hospital", "#fb7185",
          "Transit", "#2dd4bf",
          "#f7b500"
        ],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
        "circle-opacity": 0.94
      }
    });
  }

  if (!map.getSource("mobility")) {
    map.addSource("mobility", {
      type: "geojson",
      data: "data/mobility-corridor.geojson"
    });
  }

  if (!map.getLayer("mobility-line")) {
    map.addLayer({
      id: "mobility-line",
      type: "line",
      source: "mobility",
      paint: {
        "line-color": "#22d3ee",
        "line-width": 5,
        "line-opacity": 0.8
      }
    });
  }

  applyLayerVisibility();
}

function setLayerVisibility(ids, visible) {
  ids.forEach((id) => {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
    }
  });
}

function applyLayerVisibility() {
  setLayerVisibility(["urban-focus-fill", "urban-focus-line"], layerState.urban);
  setLayerVisibility(["facility-points"], layerState.facility);
  setLayerVisibility(["mobility-line"], layerState.mobility);

  if (layerState.terrain) enableTerrain();
  else disableTerrain();

  try {
    map.setConfigProperty("basemap", "show3dObjects", layerState.buildings);
  } catch (error) {
    console.warn("3D building configuration unavailable on this basemap.");
  }
}

function updateLayerCount() {
  const count = Object.values(layerState).filter(Boolean).length;
  document.getElementById("activeLayerCount").textContent = count;
}

function handleMapClick(event) {
  if (measureMode) {
    addMeasurePoint(event.lngLat);
    return;
  }

  const features = map.queryRenderedFeatures(event.point, {
    layers: ["facility-points", "urban-focus-fill"].filter((id) => map.getLayer(id))
  });

  if (!features.length) {
    document.getElementById("featureInfo").textContent =
      `Koordinat dipilih: ${event.lngLat.lat.toFixed(5)}, ${event.lngLat.lng.toFixed(5)}`;
    return;
  }

  const feature = features[0];
  const props = feature.properties || {};

  if (feature.layer.id === "facility-points") {
    const coordinates = feature.geometry.coordinates.slice();
    const html = `
      <strong>${props.name || "Kemudahan"}</strong><br>
      Kategori: ${props.category || "-"}<br>
      PBT: ${props.pbt || "-"}<br>
      Status: ${props.status || "-"}
    `;

    new mapboxgl.Popup().setLngLat(coordinates).setHTML(html).addTo(map);
    document.getElementById("featureInfo").innerHTML = html;
  } else {
    const html = `
      <strong>${props.name || "Kawasan Tumpuan"}</strong><br>
      Jenis: ${props.type || "Urban Focus Area"}<br>
      Catatan: ${props.note || "Data demonstrasi"}
    `;

    new mapboxgl.Popup().setLngLat(event.lngLat).setHTML(html).addTo(map);
    document.getElementById("featureInfo").innerHTML = html;
  }
}

function addMeasurePoint(lngLat) {
  measurePoints.push([lngLat.lng, lngLat.lat]);

  const marker = new mapboxgl.Marker({ color: "#f7b500" })
    .setLngLat(lngLat)
    .addTo(map);

  measureMarkers.push(marker);

  if (measurePoints.length >= 2) {
    const distance = calculateTotalDistance(measurePoints);
    updateMeasureLine();
    document.getElementById("featureInfo").innerHTML =
      `<strong>Ukuran Jarak</strong><br>Jumlah jarak: ${distance.toFixed(2)} km`;
  }
}

function updateMeasureLine() {
  const geojson = {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: measurePoints
    }
  };

  if (!map.getSource("measure-line")) {
    map.addSource("measure-line", { type: "geojson", data: geojson });
    map.addLayer({
      id: "measure-line-layer",
      type: "line",
      source: "measure-line",
      paint: {
        "line-color": "#f7b500",
        "line-width": 4,
        "line-dasharray": [1.5, 1.2]
      }
    });
  } else {
    map.getSource("measure-line").setData(geojson);
  }
}

function calculateTotalDistance(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(points[i - 1], points[i]);
  }
  return total;
}

function haversineDistance(a, b) {
  const toRad = (value) => value * Math.PI / 180;
  const earthRadius = 6371;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);

  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadius * Math.asin(Math.sqrt(value));
}

function clearMeasurement() {
  measurePoints = [];
  measureMarkers.forEach((marker) => marker.remove());
  measureMarkers = [];

  if (map.getLayer("measure-line-layer")) map.removeLayer("measure-line-layer");
  if (map.getSource("measure-line")) map.removeSource("measure-line");

  document.getElementById("featureInfo").textContent =
    "Klik mana-mana kemudahan atau kawasan pada peta untuk melihat maklumat.";
}

function flyToLocation(key) {
  const target = locations[key];
  if (!target) return;

  map.flyTo({
    ...target,
    duration: 2000,
    essential: true
  });

  document.getElementById("leftSidebar").classList.remove("open");
}

async function runFlythrough() {
  const sequence = [
    { center: [101.48, 3.18], zoom: 8.2, pitch: 28, bearing: 0, duration: 2200 },
    { center: [101.48, 3.18], zoom: 10.2, pitch: 48, bearing: 0, duration: 2400 },
    { center: [101.48, 3.18], zoom: 11.4, pitch: 58, bearing: 0, duration: 2400 }
  ];

  for (const step of sequence) {
    await new Promise((resolve) => {
      map.once("moveend", resolve);
      map.flyTo({ ...step, essential: true });
    });
  }
}

document.getElementById("searchForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const query = document.getElementById("searchInput").value.trim();
  const resultsEl = document.getElementById("searchResults");

  if (!query) return;
  resultsEl.textContent = "Mencari...";

  try {
    const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
    url.searchParams.set("q", query);
    url.searchParams.set("access_token", MAPBOX_PUBLIC_TOKEN);
    url.searchParams.set("limit", "5");
    url.searchParams.set("country", "MY");
    url.searchParams.set("language", "ms,en");

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Search failed: ${response.status}`);

    const data = await response.json();
    resultsEl.innerHTML = "";

    if (!data.features?.length) {
      resultsEl.textContent = "Tiada lokasi ditemui.";
      return;
    }

    data.features.forEach((feature) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "result-item";
      button.textContent =
        feature.properties?.full_address ||
        feature.properties?.name ||
        "Lokasi";

      button.addEventListener("click", () => {
        const coordinates = feature.geometry.coordinates;

        map.flyTo({
          center: coordinates,
          zoom: 16,
          pitch: 65,
          bearing: 0,
          duration: 1800
        });

        if (activeMarker) activeMarker.remove();

        activeMarker = new mapboxgl.Marker({ color: "#f7b500" })
          .setLngLat(coordinates)
          .addTo(map);

        resultsEl.innerHTML = "";
      });

      resultsEl.appendChild(button);
    });
  } catch (error) {
    console.error(error);
    resultsEl.textContent = "Carian tidak berjaya. Semak sambungan internet.";
  }
});


document.getElementById("urbanLayerToggle").addEventListener("change", (event) => {
  layerState.urban = event.target.checked;
  applyLayerVisibility();
  updateLayerCount();
});

document.getElementById("facilityLayerToggle").addEventListener("change", (event) => {
  layerState.facility = event.target.checked;
  applyLayerVisibility();
  updateLayerCount();
});

document.getElementById("mobilityLayerToggle").addEventListener("change", (event) => {
  layerState.mobility = event.target.checked;
  applyLayerVisibility();
  updateLayerCount();
});

document.getElementById("terrainToggle").addEventListener("change", (event) => {
  layerState.terrain = event.target.checked;
  applyLayerVisibility();
  updateLayerCount();
});

document.getElementById("buildingToggle").addEventListener("change", (event) => {
  layerState.buildings = event.target.checked;
  applyLayerVisibility();
  updateLayerCount();
});

document.getElementById("toggleAllLayers").addEventListener("click", () => {
  toggleAllState = !toggleAllState;

  Object.keys(layerState).forEach((key) => {
    layerState[key] = toggleAllState;
  });

  document.getElementById("urbanLayerToggle").checked = toggleAllState;
  document.getElementById("facilityLayerToggle").checked = toggleAllState;
  document.getElementById("mobilityLayerToggle").checked = toggleAllState;
  document.getElementById("terrainToggle").checked = toggleAllState;
  document.getElementById("buildingToggle").checked = toggleAllState;

  applyLayerVisibility();
  updateLayerCount();
});

document.getElementById("basemapSelect").addEventListener("change", (event) => {
  map.setStyle(basemapStyles[event.target.value]);
});

document.getElementById("measureBtn").addEventListener("click", () => {
  measureMode = !measureMode;
  document.getElementById("measureBtn").classList.toggle("active", measureMode);
  map.getCanvas().style.cursor = measureMode ? "crosshair" : "";
  document.getElementById("featureInfo").textContent = measureMode
    ? "Mod ukuran aktif. Klik sekurang-kurangnya dua titik pada peta."
    : "Mod ukuran ditutup.";
});

document.getElementById("clearMeasureBtn").addEventListener("click", clearMeasurement);

document.getElementById("locateBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("Geolokasi tidak disokong oleh pelayar ini.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const coordinates = [position.coords.longitude, position.coords.latitude];

      map.flyTo({
        center: coordinates,
        zoom: 16,
        pitch: 55,
        bearing: 0,
        duration: 1800
      });

      if (activeMarker) activeMarker.remove();
      activeMarker = new mapboxgl.Marker({ color: "#2dd4bf" })
        .setLngLat(coordinates)
        .addTo(map);
    },
    () => alert("Lokasi tidak dapat diperoleh. Semak kebenaran pelayar.")
  );
});

document.getElementById("nightBtn").addEventListener("click", () => {
  nightMode = !nightMode;
  document.getElementById("nightBtn").classList.toggle("active", nightMode);

  try {
    map.setConfigProperty("basemap", "lightPreset", nightMode ? "night" : "day");
  } catch (error) {
    map.setStyle(nightMode ? basemapStyles.dark : basemapStyles.standard);
  }
});

document.getElementById("resetBtn").addEventListener("click", () => {
  map.flyTo({ ...START_VIEW, duration: 1800 });
});

document.getElementById("flyBtn").addEventListener("click", runFlythrough);

document.getElementById("fullscreenBtn").addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});

document.getElementById("mobileMenuBtn").addEventListener("click", () => {
  document.getElementById("leftSidebar").classList.toggle("open");
});

document.getElementById("rightPanelToggle").addEventListener("click", () => {
  document.getElementById("rightSidebar").classList.toggle("open");
});

document.getElementById("chatForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const input = document.getElementById("chatInput");
  const command = input.value.trim();
  if (!command) return;

  addChatBubble(command, "user");
  input.value = "";

  const normalized = command.toLowerCase();
  let response = "Arahan belum dikenali. Cuba “papar sekolah”, “terrain tutup” atau “mod malam”.";

  const matchedCity = Object.keys(cityCommands).find((name) => normalized.includes(name));

  if (matchedCity) {
    const [key, label] = cityCommands[matchedCity];
    flyToLocation(key);
    response = `Peta dizum ke ${label} dengan orientasi utara.`;
  } else if (normalized.includes("sekolah") || normalized.includes("kemudahan")) {
    layerState.facility = true;
    document.getElementById("facilityLayerToggle").checked = true;
    applyLayerVisibility();
    updateLayerCount();
    response = "Layer kemudahan awam telah dipaparkan.";
  } else if (normalized.includes("terrain") && (normalized.includes("tutup") || normalized.includes("off"))) {
    layerState.terrain = false;
    document.getElementById("terrainToggle").checked = false;
    applyLayerVisibility();
    updateLayerCount();
    response = "Terrain 3D telah ditutup.";
  } else if (normalized.includes("terrain")) {
    layerState.terrain = true;
    document.getElementById("terrainToggle").checked = true;
    applyLayerVisibility();
    updateLayerCount();
    response = "Terrain 3D telah diaktifkan.";
  } else if (normalized.includes("malam") || normalized.includes("night")) {
    nightMode = true;
    document.getElementById("nightBtn").classList.add("active");
    try {
      map.setConfigProperty("basemap", "lightPreset", "night");
    } catch {
      map.setStyle(basemapStyles.dark);
    }
    response = "Mod malam telah diaktifkan.";
  } else if (normalized.includes("reset") || normalized.includes("asal")) {
    map.flyTo({ ...START_VIEW, duration: 1800 });
    response = "Paparan peta telah ditetapkan semula.";
  }

  setTimeout(() => addChatBubble(response, "bot"), 350);
});

function addChatBubble(text, type) {
  const container = document.getElementById("chatMessages");
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${type}`;
  bubble.textContent = text;
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}
