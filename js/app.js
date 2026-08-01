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
let currentViewMode = "3d";

const layerState = {
  cityHierarchy: true,
  healthFacilities: true,
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
        "Senarai bandar DPN2 belum tersedia dalam konfigurasi.";
      explorerEl.innerHTML =
        '<p class="empty-state">Semak <code>config/urban-hierarchy.json</code> dan fail layer DPN2.</p>';
    } else {
      statusEl.className = "policy-status ready";
      statusEl.textContent = `${total} bandar DPN2 dimuatkan mengikut hierarki.`;
    }
  } catch (error) {
    console.error("Urban hierarchy config error:", error);
    statusEl.className = "policy-status error";
    statusEl.textContent = "Konfigurasi bandar DPN3 gagal dimuatkan.";
    explorerEl.innerHTML =
      '<p class="empty-state">Semak fail <code>config/urban-hierarchy.json</code>.</p>';
  }
}


function setViewMode(mode, options = {}) {
  if (!map) return;

  const animate = options.animate !== false;
  const duration = animate ? 1100 : 0;
  const view2DBtn = document.getElementById("view2DBtn");
  const view3DBtn = document.getElementById("view3DBtn");

  currentViewMode = mode === "2d" ? "2d" : "3d";

  if (currentViewMode === "2d") {
    map.easeTo({
      pitch: 0,
      bearing: 0,
      duration,
      essential: true
    });

    map.setTerrain(null);

    try {
      map.setConfigProperty("basemap", "show3dObjects", false);
    } catch (error) {
      console.warn("Tetapan objek 3D tidak tersedia pada basemap semasa.");
    }

    view2DBtn?.classList.add("active");
    view3DBtn?.classList.remove("active");
    view2DBtn?.setAttribute("aria-pressed", "true");
    view3DBtn?.setAttribute("aria-pressed", "false");
  } else {
    map.easeTo({
      pitch: 60,
      bearing: 0,
      duration,
      essential: true
    });

    if (layerState.terrain) {
      enableTerrain();
    }

    try {
      map.setConfigProperty(
        "basemap",
        "show3dObjects",
        layerState.buildings
      );
    } catch (error) {
      console.warn("Tetapan objek 3D tidak tersedia pada basemap semasa.");
    }

    view3DBtn?.classList.add("active");
    view2DBtn?.classList.remove("active");
    view3DBtn?.setAttribute("aria-pressed", "true");
    view2DBtn?.setAttribute("aria-pressed", "false");
  }
}


async function loadHospitalIcon(targetMap, iconName = "hospital-building") {
  if (targetMap.hasImage(iconName)) return;

  const response = await fetch("assets/icons/hospital-building.svg");
  if (!response.ok) {
    throw new Error(`Gagal memuatkan ikon hospital: ${response.status}`);
  }

  const svgText = await response.text();
  const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
  const imageUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;

    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    targetMap.addImage(iconName, imageData, { sdf: true });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}


function enableMiddleMousePan(targetMap) {
  const canvas = targetMap.getCanvas();
  const container = targetMap.getCanvasContainer();

  let active = false;
  let lastX = 0;
  let lastY = 0;

  const stopBrowserAutoScroll = (event) => {
    if (event.button === 1) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  };

  const onMouseDown = (event) => {
    if (event.button !== 1) return;

    event.preventDefault();
    event.stopPropagation();

    active = true;
    lastX = event.clientX;
    lastY = event.clientY;

    container.classList.add("middle-pan-active");
    document.body.classList.add("map-middle-pan-active");
  };

  const onMouseMove = (event) => {
    if (!active) return;

    event.preventDefault();

    const deltaX = event.clientX - lastX;
    const deltaY = event.clientY - lastY;

    lastX = event.clientX;
    lastY = event.clientY;

    targetMap.panBy(
      [-deltaX, -deltaY],
      {
        duration: 0,
        animate: false
      }
    );
  };

  const endPan = (event) => {
    if (!active) return;

    if (event) event.preventDefault();

    active = false;
    container.classList.remove("middle-pan-active");
    document.body.classList.remove("map-middle-pan-active");
  };

  canvas.addEventListener("mousedown", onMouseDown, {
    capture: true
  });

  canvas.addEventListener("auxclick", stopBrowserAutoScroll, {
    capture: true
  });

  container.addEventListener("mousedown", stopBrowserAutoScroll, {
    capture: true
  });

  window.addEventListener("mousemove", onMouseMove, {
    capture: true,
    passive: false
  });

  window.addEventListener("mouseup", (event) => {
    if (event.button === 1) endPan(event);
  }, {
    capture: true
  });

  window.addEventListener("blur", endPan);
  container.addEventListener("mouseleave", (event) => {
    if (active && event.buttons === 0) endPan(event);
  });
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

  map.dragPan.enable();
  map.scrollZoom.enable();
  map.boxZoom.enable();
  map.doubleClickZoom.enable();
  map.keyboard.enable();
  map.touchZoomRotate.enable();
  enableMiddleMousePan(map);

  // Kunci orientasi peta supaya utara sentiasa di bahagian atas.
  map.touchZoomRotate.disableRotation();

  map.on("load", () => {
    addOperationalLayers();
    updateLayerCount();
    setViewMode("3d", { animate: false });
    document.getElementById("loadingScreen").classList.add("hidden");
  });

  map.on("style.load", () => {
    configureCurrentStyle();
    addOperationalLayers();
    setTimeout(() => {
      setViewMode(currentViewMode, { animate: false });
    }, 0);
  });

  map.on("mousemove", (event) => {
    document.getElementById("coordinateStatus").textContent =
      `Lat: ${event.lngLat.lat.toFixed(5)}, Lng: ${event.lngLat.lng.toFixed(5)}`;
  });

  map.on("zoom", () => {
    document.getElementById("zoomStatus").textContent = `Zoom: ${map.getZoom().toFixed(1)}`;
  });

  map.on("click", handleMapClick);

  map.on("mouseenter", "city-hierarchy-dpn2-circle", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", "city-hierarchy-dpn2-circle", () => {
    map.getCanvas().style.cursor = "";
  });

  map.on("mouseenter", "health-facilities-symbol", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", "health-facilities-symbol", () => {
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


  if (!map.getSource("city-hierarchy-dpn2")) {
    map.addSource("city-hierarchy-dpn2", {
      type: "geojson",
      data: "data/hierarki_bandar_selangor_dpn2.geojson"
    });
  }

  if (!map.getLayer("city-hierarchy-dpn2-circle")) {
    map.addLayer({
      id: "city-hierarchy-dpn2-circle",
      type: "circle",
      source: "city-hierarchy-dpn2",
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          7, ["match", ["get", "hierarki"],
            "Bandar Negeri", 7,
            "Bandar Utama", 6,
            "Bandar Tempatan", 5,
            5
          ],
          14, ["match", ["get", "hierarki"],
            "Bandar Negeri", 13,
            "Bandar Utama", 11,
            "Bandar Tempatan", 9,
            9
          ]
        ],
        "circle-color": [
          "match",
          ["get", "hierarki"],
          "Bandar Negeri", "#E31A1C",
          "Bandar Utama", "#FD8D3C",
          "Bandar Tempatan", "#3182BD",
          "#7F8C8D"
        ],
        "circle-stroke-color": "#FFFFFF",
        "circle-stroke-width": 1.8,
        "circle-opacity": 0.92
      }
    });
  }

  if (!map.getLayer("city-hierarchy-dpn2-label")) {
    map.addLayer({
      id: "city-hierarchy-dpn2-label",
      type: "symbol",
      source: "city-hierarchy-dpn2",
      minzoom: 9,
      layout: {
        "text-field": ["coalesce", ["get", "label"], ["get", "nama_bandar"]],
        "text-size": ["interpolate", ["linear"], ["zoom"], 9, 10, 14, 14],
        "text-offset": [0, 1.3],
        "text-anchor": "top",
        "text-allow-overlap": false
      },
      paint: {
        "text-color": "#FFFFFF",
        "text-halo-color": "rgba(7,17,31,0.92)",
        "text-halo-width": 1.5
      }
    });
  }


  if (!map.getSource("health-facilities")) {
    map.addSource("health-facilities", {
      type: "geojson",
      data: "data/kesihatan/kemudahan_kesihatan_selangor.geojson"
    });
  }

  map.once("sourcedata", (event) => {
    if (event.sourceId === "health-facilities" && event.isSourceLoaded) {
      console.info("Kemudahan Kesihatan Negeri Selangor berjaya dimuatkan.");
    }
  });

  await loadHospitalIcon(map);

  if (!map.getLayer("health-facilities-symbol")) {
    map.addLayer({
      id: "health-facilities-symbol",
      type: "symbol",
      source: "health-facilities",
      slot: "top",
      layout: {
        "icon-image": "hospital-building",
        "icon-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          7, [
            "match",
            ["get", "web_category"],
            "Hospital", 0.32,
            "Klinik Kesihatan", 0.28,
            "Klinik Ibu dan Anak", 0.27,
            "Klinik Desa", 0.25,
            0.26
          ],
          15, [
            "match",
            ["get", "web_category"],
            "Hospital", 0.52,
            "Klinik Kesihatan", 0.46,
            "Klinik Ibu dan Anak", 0.44,
            "Klinik Desa", 0.41,
            0.42
          ]
        ],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true
      },
      paint: {
        "icon-color": [
          "match",
          ["get", "web_category"],
          "Hospital", "#E63946",
          "Klinik Kesihatan", "#1D4ED8",
          "Klinik Ibu dan Anak", "#EC4899",
          "Klinik Desa", "#16A34A",
          "#6B7280"
        ],
        "icon-halo-color": "#FFFFFF",
        "icon-halo-width": 1.4,
        "icon-opacity": 0.96
      }
    });
  }

  if (!map.getLayer("health-facilities-label")) {
    map.addLayer({
      id: "health-facilities-label",
      type: "symbol",
      source: "health-facilities",
      slot: "top",
      minzoom: 11,
      layout: {
        "text-field": ["get", "web_name"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 12, 9, 16, 12],
        "text-offset": [0, 1.25],
        "text-anchor": "top",
        "text-allow-overlap": false
      },
      paint: {
        "text-color": "#FFFFFF",
        "text-halo-color": "rgba(7,17,31,0.94)",
        "text-halo-width": 1.4
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
  setLayerVisibility(
    ["city-hierarchy-dpn2-circle", "city-hierarchy-dpn2-label"],
    layerState.cityHierarchy
  );
  setLayerVisibility(
    ["health-facilities-symbol", "health-facilities-label"],
    layerState.healthFacilities
  );

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
    layers: [
      "health-facilities-symbol",
      "city-hierarchy-dpn2-circle"
    ].filter((id) => map.getLayer(id))
  });

  if (!features.length) {
    document.getElementById("featureInfo").textContent =
      `Koordinat dipilih: ${event.lngLat.lat.toFixed(5)}, ${event.lngLat.lng.toFixed(5)}`;
    return;
  }

  const feature = features[0];
  const props = feature.properties || {};

  if (feature.layer.id === "health-facilities-symbol") {
    const coordinates = feature.geometry.coordinates.slice();
    const html = `
      <strong>${props.web_name || "Kemudahan Kesihatan"}</strong><br>
      Kategori: ${props.web_category || "-"}<br>
      Sektor: ${props.web_sector || "-"}<br>
      Operator: ${props.web_operator || "-"}<br>
      Daerah: ${props.web_district || "-"}<br>
      Lokaliti: ${props.web_locality || "-"}<br>
      Semakan: ${props.web_status || "-"}
    `;

    new mapboxgl.Popup().setLngLat(coordinates).setHTML(html).addTo(map);
    document.getElementById("featureInfo").innerHTML = html;
  } else if (feature.layer.id === "city-hierarchy-dpn2-circle") {
    const coordinates = feature.geometry.coordinates.slice();
    const html = `
      <strong>${props.nama_bandar || "Bandar"}</strong><br>
      Hierarki: ${props.hierarki || "-"}<br>
      Daerah: ${props.daerah || "-"}<br>
      Dasar: ${props.dasar || "DPN2"}<br>
      Tahun dasar: ${props.tahun_dasar || "-"}<br>
      <em>Layer rujukan; bukan senarai rasmi DPN3.</em>
    `;

    new mapboxgl.Popup().setLngLat(coordinates).setHTML(html).addTo(map);
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





document.getElementById("cityHierarchyToggle").addEventListener("change", (event) => {
  layerState.cityHierarchy = event.target.checked;
  applyLayerVisibility();
  updateLayerCount();
});


document.getElementById("healthLegendBtn").addEventListener("click", () => {
  const button = document.getElementById("healthLegendBtn");
  const panel = document.getElementById("healthLegendPanel");
  const expanded = button.getAttribute("aria-expanded") === "true";

  button.setAttribute("aria-expanded", String(!expanded));
  button.classList.toggle("open", !expanded);
  panel.hidden = expanded;
});

document.getElementById("healthFacilityToggle").addEventListener("change", (event) => {
  layerState.healthFacilities = event.target.checked;
  applyLayerVisibility();
  updateLayerCount();

  window.dispatchEvent(new CustomEvent("suo:health-layer-toggle", {
    detail: { visible: layerState.healthFacilities }
  }));
});

document.getElementById("terrainToggle").addEventListener("change", (event) => {
  layerState.terrain = event.target.checked;

  if (currentViewMode === "3d") {
    applyLayerVisibility();
  } else {
    map.setTerrain(null);
  }

  updateLayerCount();
});

document.getElementById("buildingToggle").addEventListener("change", (event) => {
  layerState.buildings = event.target.checked;

  if (currentViewMode === "3d") {
    applyLayerVisibility();
  } else {
    try {
      map.setConfigProperty("basemap", "show3dObjects", false);
    } catch (error) {
      console.warn("Tetapan objek 3D tidak tersedia pada basemap semasa.");
    }
  }

  updateLayerCount();
});

document.getElementById("toggleAllLayers").addEventListener("click", () => {
  toggleAllState = !toggleAllState;

  Object.keys(layerState).forEach((key) => {
    layerState[key] = toggleAllState;
  });
  document.getElementById("cityHierarchyToggle").checked = toggleAllState;
  document.getElementById("healthFacilityToggle").checked = toggleAllState;
  document.getElementById("terrainToggle").checked = toggleAllState;
  document.getElementById("buildingToggle").checked = toggleAllState;

  applyLayerVisibility();
  updateLayerCount();
});

document.getElementById("view2DBtn").addEventListener("click", () => {
  setViewMode("2d");
});

document.getElementById("view3DBtn").addEventListener("click", () => {
  setViewMode("3d");
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
  map.flyTo({
    ...START_VIEW,
    pitch: currentViewMode === "2d" ? 0 : START_VIEW.pitch,
    bearing: 0,
    duration: 1800
  });
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
  let response = "Arahan belum dikenali. Cuba nama bandar DPN2, “papar sekolah”, “terrain tutup” atau “mod malam”.";

  const matchedCity = Object.keys(cityCommands).find((name) => normalized.includes(name));

  if (matchedCity) {
    const [key, label] = cityCommands[matchedCity];
    flyToLocation(key);
    response = `Peta dizum ke ${label} dengan orientasi utara.`;
  } else if (normalized.includes("paparan 2d") || normalized === "2d" || normalized.includes("mod 2d")) {
    setViewMode("2d");
    response = "Paparan 2D telah diaktifkan.";
  } else if (normalized.includes("paparan 3d") || normalized === "3d" || normalized.includes("mod 3d")) {
    setViewMode("3d");
    response = "Paparan 3D telah diaktifkan.";
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

window.SUO_COMPARE_CONFIG = {
  token: MAPBOX_PUBLIC_TOKEN,
  startView: START_VIEW,
  basemapStyles,
  cityDataUrl: "data/hierarki_bandar_selangor_dpn2.geojson",
  healthDataUrl: "data/kesihatan/kemudahan_kesihatan_selangor.geojson"
};
