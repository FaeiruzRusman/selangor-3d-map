(() => {
  "use strict";

  let compareMap = null;
  let splitActive = false;
  let syncEnabled = true;
  let syncing = false;
  let rightMode = "3d";
  let healthLayerVisible = true;
  let pendingRightStyle = "satellite";
  let resizeTimer = null;

  const shell = document.querySelector(".map-shell");
  const panel = document.getElementById("comparePanel");
  const splitBtn = document.getElementById("splitBtn");
  const closeBtn = document.getElementById("closeSplitBtn");
  const compareContainer = document.getElementById("compareMap");
  const syncToggle = document.getElementById("syncMapsToggle");
  const compareStatus = document.getElementById("compareStatus");

  function setStatus(message) {
    if (compareStatus) compareStatus.textContent = message;
  }

  function cameraFrom(sourceMap) {
    const center = sourceMap.getCenter();

    return {
      center: [center.lng, center.lat],
      zoom: sourceMap.getZoom(),
      pitch: sourceMap.getPitch(),
      bearing: 0
    };
  }

  function applyCamera(targetMap, camera) {
    if (!targetMap || !camera) return;

    targetMap.jumpTo({
      center: camera.center,
      zoom: camera.zoom,
      pitch: camera.pitch,
      bearing: 0
    });
  }

  function resizeMaps() {
    map.resize();
    compareMap?.resize();
  }

  function scheduleResize() {
    if (resizeTimer) clearTimeout(resizeTimer);

    requestAnimationFrame(resizeMaps);
    resizeTimer = setTimeout(resizeMaps, 260);
  }

  async function loadSvgIcon(targetMap, name, url) {
    if (targetMap.hasImage(name)) return;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Gagal memuatkan ikon ${name}: ${response.status}`);
    }

    const svgText = await response.text();
    const blob = new Blob([svgText], { type: "image/svg+xml" });
    const objectUrl = URL.createObjectURL(blob);

    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = objectUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, 64, 64);
      ctx.drawImage(image, 0, 0, 64, 64);

      targetMap.addImage(name, ctx.getImageData(0, 0, 64, 64), {
        sdf: true
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  function addCityLayer(targetMap) {
    if (!targetMap.getSource("compare-city-hierarchy")) {
      targetMap.addSource("compare-city-hierarchy", {
        type: "geojson",
        data: window.SUO_COMPARE_CONFIG.cityDataUrl
      });
    }

    if (!targetMap.getLayer("compare-city-circle")) {
      targetMap.addLayer({
        id: "compare-city-circle",
        type: "circle",
        source: "compare-city-hierarchy",
        slot: "top",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            7, [
              "match",
              ["get", "hierarki"],
              "Bandar Negeri", 7,
              "Bandar Utama", 6,
              "Bandar Tempatan", 5,
              5
            ],
            14, [
              "match",
              ["get", "hierarki"],
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
          "circle-stroke-width": 1.8
        }
      });
    }

    if (!targetMap.getLayer("compare-city-label")) {
      targetMap.addLayer({
        id: "compare-city-label",
        type: "symbol",
        source: "compare-city-hierarchy",
        slot: "top",
        minzoom: 9,
        layout: {
          "text-field": [
            "coalesce",
            ["get", "label"],
            ["get", "nama_bandar"]
          ],
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            9, 10,
            14, 14
          ],
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
  }

  async function addHealthLayer(targetMap) {
    await loadSvgIcon(
      targetMap,
      "hospital-building",
      "assets/icons/hospital-building.svg"
    );

    if (!targetMap.getSource("compare-health-facilities")) {
      targetMap.addSource("compare-health-facilities", {
        type: "geojson",
        data: window.SUO_COMPARE_CONFIG.healthDataUrl
      });
    }

    if (!targetMap.getLayer("compare-health-symbol")) {
      targetMap.addLayer({
        id: "compare-health-symbol",
        type: "symbol",
        source: "compare-health-facilities",
        slot: "top",
        layout: {
          visibility: healthLayerVisible ? "visible" : "none",
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

    if (!targetMap.getLayer("compare-health-label")) {
      targetMap.addLayer({
        id: "compare-health-label",
        type: "symbol",
        source: "compare-health-facilities",
        slot: "top",
        minzoom: 11,
        layout: {
          visibility: healthLayerVisible ? "visible" : "none",
          "text-field": ["get", "web_name"],
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            11, 9,
            16, 12
          ],
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
  }

  function enableTerrain(targetMap) {
    if (!targetMap || !targetMap.isStyleLoaded()) return;

    if (!targetMap.getSource("compare-dem")) {
      targetMap.addSource("compare-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14
      });
    }

    targetMap.setTerrain({
      source: "compare-dem",
      exaggeration: 1.35
    });
  }

  function setRightMode(mode, animate = true) {
    if (!compareMap) return;

    rightMode = mode === "2d" ? "2d" : "3d";
    const is3D = rightMode === "3d";

    compareMap.easeTo({
      pitch: is3D ? 60 : 0,
      bearing: 0,
      duration: animate ? 700 : 0,
      essential: true
    });

    if (is3D) {
      enableTerrain(compareMap);
      try {
        compareMap.setConfigProperty("basemap", "show3dObjects", true);
      } catch (_) {}
    } else {
      compareMap.setTerrain(null);
      try {
        compareMap.setConfigProperty("basemap", "show3dObjects", false);
      } catch (_) {}
    }

    document.getElementById("right2DBtn")
      .classList.toggle("active", !is3D);

    document.getElementById("right3DBtn")
      .classList.toggle("active", is3D);
  }

  async function restoreCompareLayers() {
    if (!compareMap || !compareMap.isStyleLoaded()) return;

    addCityLayer(compareMap);
    await addHealthLayer(compareMap);
    setRightMode(rightMode, false);
  }

  function createCompareMap(initialCamera) {
    if (compareMap) return;

    const config = window.SUO_COMPARE_CONFIG;
    const camera = initialCamera || cameraFrom(map);

    mapboxgl.accessToken = config.token;

    compareMap = new mapboxgl.Map({
      container: "compareMap",
      style: config.basemapStyles[pendingRightStyle],
      center: camera.center,
      zoom: camera.zoom,
      pitch: camera.pitch,
      bearing: 0,
      antialias: true
    });

    compareMap.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      "top-right"
    );

    compareMap.on("load", async () => {
      await restoreCompareLayers();
      applyCamera(compareMap, camera);
      scheduleResize();
    });

    compareMap.on("style.load", async () => {
      await restoreCompareLayers();
    });

    compareMap.on("click", (event) => {
      const layerIds = [
        "compare-health-symbol",
        "compare-city-circle"
      ].filter((id) => compareMap.getLayer(id));

      const features = compareMap.queryRenderedFeatures(event.point, {
        layers: layerIds
      });

      if (!features.length) return;

      const feature = features[0];
      const props = feature.properties || {};
      let popupHtml;

      if (feature.layer.id === "compare-health-symbol") {
        popupHtml =
          `<strong>${props.web_name || "Kemudahan Kesihatan"}</strong><br>` +
          `Kategori: ${props.web_category || "-"}<br>` +
          `Sektor: ${props.web_sector || "-"}<br>` +
          `Operator: ${props.web_operator || "-"}<br>` +
          `Daerah: ${props.web_district || "-"}<br>` +
          `Lokaliti: ${props.web_locality || "-"}`;
      } else {
        popupHtml =
          `<strong>${props.nama_bandar || "Bandar"}</strong><br>` +
          `Hierarki: ${props.hierarki || "-"}<br>` +
          `Daerah: ${props.daerah || "-"}`;
      }

      new mapboxgl.Popup()
        .setLngLat(feature.geometry.coordinates)
        .setHTML(popupHtml)
        .addTo(compareMap);
    });

    attachSyncEvents();
  }

  function syncLeftToRight() {
    if (!splitActive || !syncEnabled || syncing || !compareMap) return;

    syncing = true;
    setStatus("Menyelaraskan peta kanan...");

    applyCamera(compareMap, cameraFrom(map));

    requestAnimationFrame(() => {
      syncing = false;
      setStatus("Sync aktif selepas pergerakan selesai");
    });
  }

  function syncRightToLeft() {
    if (!splitActive || !syncEnabled || syncing || !compareMap) return;

    syncing = true;
    setStatus("Menyelaraskan peta kiri...");

    applyCamera(map, cameraFrom(compareMap));

    requestAnimationFrame(() => {
      syncing = false;
      setStatus("Sync aktif selepas pergerakan selesai");
    });
  }

  function attachSyncEvents() {
    if (!compareMap) return;

    map.off("moveend", syncLeftToRight);
    compareMap.off("moveend", syncRightToLeft);

    map.on("moveend", syncLeftToRight);
    compareMap.on("moveend", syncRightToLeft);
  }

  function openSplit() {
    if (splitActive) return;

    splitActive = true;
    const camera = cameraFrom(map);

    shell.classList.add("split-active");
    panel.classList.add("visible");
    splitBtn.classList.add("active");
    compareContainer.setAttribute("aria-hidden", "false");

    requestAnimationFrame(() => {
      resizeMaps();

      if (!compareMap) {
        createCompareMap(camera);
      } else {
        applyCamera(compareMap, camera);
        scheduleResize();
      }
    });

    setStatus("Split screen aktif");
  }

  function closeSplit() {
    if (!splitActive) return;

    splitActive = false;
    const camera = cameraFrom(map);

    shell.classList.remove("split-active");
    panel.classList.remove("visible");
    splitBtn.classList.remove("active");
    compareContainer.setAttribute("aria-hidden", "true");

    requestAnimationFrame(() => {
      map.resize();
      applyCamera(map, camera);
    });

    setStatus("Split screen ditutup");
  }

  function setLeftMode(mode) {
    setViewMode(mode);

    document.getElementById("left2DBtn")
      .classList.toggle("active", mode === "2d");

    document.getElementById("left3DBtn")
      .classList.toggle("active", mode === "3d");
  }

  splitBtn.addEventListener("click", () => {
    splitActive ? closeSplit() : openSplit();
  });

  closeBtn.addEventListener("click", closeSplit);

  document.getElementById("leftBasemapSelect")
    .addEventListener("change", (event) => {
      const camera = cameraFrom(map);
      const style = window.SUO_COMPARE_CONFIG
        .basemapStyles[event.target.value];

      document.getElementById("basemapSelect").value = event.target.value;
      map.setStyle(style);

      map.once("style.load", () => {
        applyCamera(map, camera);
        if (syncEnabled && compareMap) {
          applyCamera(compareMap, camera);
        }
      });
    });

  document.getElementById("rightBasemapSelect")
    .addEventListener("change", (event) => {
      pendingRightStyle = event.target.value;

      if (!compareMap) {
        createCompareMap(cameraFrom(map));
        return;
      }

      const camera = cameraFrom(compareMap);
      compareMap.setStyle(
        window.SUO_COMPARE_CONFIG.basemapStyles[pendingRightStyle]
      );

      compareMap.once("style.load", () => {
        applyCamera(compareMap, camera);
      });
    });

  document.getElementById("left2DBtn")
    .addEventListener("click", () => setLeftMode("2d"));

  document.getElementById("left3DBtn")
    .addEventListener("click", () => setLeftMode("3d"));

  document.getElementById("right2DBtn")
    .addEventListener("click", () => setRightMode("2d"));

  document.getElementById("right3DBtn")
    .addEventListener("click", () => setRightMode("3d"));

  syncToggle.addEventListener("change", (event) => {
    syncEnabled = event.target.checked;

    if (syncEnabled && compareMap) {
      applyCamera(compareMap, cameraFrom(map));
      setStatus("Sync diaktifkan");
    } else {
      setStatus("Sync dimatikan — kedua-dua peta boleh digerakkan bebas");
    }
  });

  document.getElementById("swapMapsBtn")
    .addEventListener("click", () => {
      const leftSelect = document.getElementById("leftBasemapSelect");
      const rightSelect = document.getElementById("rightBasemapSelect");

      const leftValue = leftSelect.value;
      leftSelect.value = rightSelect.value;
      rightSelect.value = leftValue;

      const leftCamera = cameraFrom(map);
      const rightCamera = compareMap ? cameraFrom(compareMap) : leftCamera;

      map.setStyle(
        window.SUO_COMPARE_CONFIG.basemapStyles[leftSelect.value]
      );

      if (compareMap) {
        pendingRightStyle = rightSelect.value;
        compareMap.setStyle(
          window.SUO_COMPARE_CONFIG.basemapStyles[rightSelect.value]
        );
      }

      map.once("style.load", () => applyCamera(map, leftCamera));

      compareMap?.once("style.load", () => {
        applyCamera(compareMap, rightCamera);
      });
    });

  window.addEventListener("suo:health-layer-toggle", (event) => {
    healthLayerVisible = Boolean(event.detail?.visible);

    if (!compareMap) return;

    [
      "compare-health-symbol",
      "compare-health-label"
    ].forEach((layerId) => {
      if (compareMap.getLayer(layerId)) {
        compareMap.setLayoutProperty(
          layerId,
          "visibility",
          healthLayerVisible ? "visible" : "none"
        );
      }
    });
  });

  window.addEventListener("resize", () => {
    if (!splitActive) return;
    scheduleResize();
  });
})();
