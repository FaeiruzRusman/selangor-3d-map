(() => {
  "use strict";

  let compareMap = null;
  let splitActive = false;
  let syncing = false;
  let syncEnabled = true;
  let rightMode = "3d";
  let healthLayerVisible = true;
  let pendingCamera = null;
  let resizeTimer = null;

  const panel = document.getElementById("comparePanel");
  const shell = document.querySelector(".map-shell");
  const splitBtn = document.getElementById("splitBtn");
  const closeBtn = document.getElementById("closeSplitBtn");
  const compareContainer = document.getElementById("compareMap");
  const divider = document.getElementById("splitDivider");

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
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
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

    if (!targetMap.getLayer("compare-city-label")) {
      targetMap.addLayer({
        id: "compare-city-label",
        type: "symbol",
        source: "compare-city-hierarchy",
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
  }



  async function loadCompareHospitalIcon(targetMap) {
    if (targetMap.hasImage("hospital-building")) return;

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
      context.drawImage(image, 0, 0, 64, 64);

      targetMap.addImage(
        "hospital-building",
        context.getImageData(0, 0, 64, 64),
        { sdf: true }
      );
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  async function addHealthLayer(targetMap) {
    if (!targetMap.getSource("compare-health-facilities")) {
      targetMap.addSource("compare-health-facilities", {
        type: "geojson",
        data: window.SUO_COMPARE_CONFIG.healthDataUrl
      });
    }

    await loadCompareHospitalIcon(targetMap);

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
  }

  function enableRightTerrain() {
    if (!compareMap || !compareMap.isStyleLoaded()) return;
    if (!compareMap.getSource("compare-dem")) {
      compareMap.addSource("compare-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14
      });
    }
    compareMap.setTerrain({ source: "compare-dem", exaggeration: 1.35 });
  }

  function setRightMode(mode, animate = true) {
    if (!compareMap) return;
    rightMode = mode;
    const is3D = mode === "3d";

    compareMap.easeTo({
      pitch: is3D ? 60 : 0,
      bearing: 0,
      duration: animate ? 900 : 0,
      essential: true
    });

    if (is3D) {
      enableRightTerrain();
      try {
        compareMap.setConfigProperty("basemap", "show3dObjects", true);
      } catch (_) {}
    } else {
      compareMap.setTerrain(null);
      try {
        compareMap.setConfigProperty("basemap", "show3dObjects", false);
      } catch (_) {}
    }

    document.getElementById("right2DBtn").classList.toggle("active", !is3D);
    document.getElementById("right3DBtn").classList.toggle("active", is3D);
  }

  function getCameraState(sourceMap) {
    const center = sourceMap.getCenter();

    return {
      center: [center.lng, center.lat],
      zoom: sourceMap.getZoom(),
      pitch: sourceMap.getPitch(),
      bearing: 0
    };
  }

  function createCompareMap(initialCamera) {
    if (compareMap) return;

    const config = window.SUO_COMPARE_CONFIG;
    const camera = initialCamera || getCameraState(map);

    mapboxgl.accessToken = config.token;

    compareMap = new mapboxgl.Map({
      container: "compareMap",
      style: config.basemapStyles.satellite,
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
      addCityLayer(compareMap);
      await addHealthLayer(compareMap);
      setRightMode(rightMode, false);
      alignBothMaps(camera);
    });

    compareMap.on("style.load", async () => {
      addCityLayer(compareMap);
      await addHealthLayer(compareMap);
      setRightMode(rightMode, false);

      const currentCamera = pendingCamera || getCameraState(map);
      requestAnimationFrame(() => alignBothMaps(currentCamera));
    });

    compareMap.on("click", (event) => {
      const features = compareMap.queryRenderedFeatures(event.point, {
        layers: [
          "compare-health-symbol",
          "compare-city-circle"
        ].filter((id) => compareMap.getLayer(id))
      });

      if (!features.length) return;

      const feature = features[0];
      const props = feature.properties || {};
      let popupHtml = "";

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

    map.on("move", syncFromLeft);
    compareMap.on("move", syncFromRight);
  }

  function alignBothMaps(cameraState) {
    if (!compareMap) return;

    const camera = cameraState || getCameraState(map);
    pendingCamera = camera;

    map.resize();
    compareMap.resize();

    map.jumpTo({
      center: camera.center,
      zoom: camera.zoom,
      pitch: camera.pitch,
      bearing: 0
    });

    compareMap.jumpTo({
      center: camera.center,
      zoom: camera.zoom,
      pitch: camera.pitch,
      bearing: 0
    });

    pendingCamera = null;
  }

  function scheduleAlignment(cameraState) {
    if (resizeTimer) window.clearTimeout(resizeTimer);

    const camera = cameraState || getCameraState(map);

    requestAnimationFrame(() => {
      map.resize();
      compareMap?.resize();

      requestAnimationFrame(() => {
        alignBothMaps(camera);
      });
    });

    resizeTimer = window.setTimeout(() => {
      alignBothMaps(camera);
    }, 320);
  }

  function copyCamera(source, target) {
    if (!source || !target) return;

    const camera = getCameraState(source);

    target.jumpTo({
      center: camera.center,
      zoom: camera.zoom,
      pitch: camera.pitch,
      bearing: 0
    });
  }

  function syncFromLeft() {
    if (!splitActive || !syncEnabled || syncing || !compareMap) return;
    syncing = true;
    copyCamera(map, compareMap);
    syncing = false;
  }

  function syncFromRight() {
    if (!splitActive || !syncEnabled || syncing || !compareMap) return;
    syncing = true;
    copyCamera(compareMap, map);
    syncing = false;
  }

  function openSplit() {
    if (splitActive) return;

    const initialCamera = getCameraState(map);
    pendingCamera = initialCamera;
    splitActive = true;

    shell.classList.add("split-active");
    panel.classList.add("visible");
    splitBtn.classList.add("active");
    compareContainer.setAttribute("aria-hidden", "false");

    requestAnimationFrame(() => {
      map.resize();

      if (!compareMap) {
        createCompareMap(initialCamera);
      } else {
        compareMap.resize();
        scheduleAlignment(initialCamera);
      }
    });
  }

  function closeSplit() {
    if (!splitActive) return;

    const camera = getCameraState(map);
    splitActive = false;

    shell.classList.remove("split-active");
    panel.classList.remove("visible");
    splitBtn.classList.remove("active");
    compareContainer.setAttribute("aria-hidden", "true");

    requestAnimationFrame(() => {
      map.resize();
      map.jumpTo({
        center: camera.center,
        zoom: camera.zoom,
        pitch: camera.pitch,
        bearing: 0
      });
    });
  }

  splitBtn.addEventListener("click", () => splitActive ? closeSplit() : openSplit());
  closeBtn.addEventListener("click", closeSplit);

  document.getElementById("leftBasemapSelect").addEventListener("change", (event) => {
    const camera = getCameraState(map);
    pendingCamera = camera;

    document.getElementById("basemapSelect").value = event.target.value;
    map.setStyle(
      window.SUO_COMPARE_CONFIG.basemapStyles[event.target.value]
    );

    map.once("style.load", () => {
      scheduleAlignment(camera);
    });
  });

  document.getElementById("rightBasemapSelect").addEventListener("change", (event) => {
    const camera = getCameraState(map);
    pendingCamera = camera;

    if (!compareMap) {
      createCompareMap(camera);
      return;
    }

    compareMap.setStyle(
      window.SUO_COMPARE_CONFIG.basemapStyles[event.target.value]
    );

    compareMap.once("style.load", () => {
      scheduleAlignment(camera);
    });
  });

  document.getElementById("left2DBtn").addEventListener("click", () => {
    setViewMode("2d");
    document.getElementById("left2DBtn").classList.add("active");
    document.getElementById("left3DBtn").classList.remove("active");
  });

  document.getElementById("left3DBtn").addEventListener("click", () => {
    setViewMode("3d");
    document.getElementById("left3DBtn").classList.add("active");
    document.getElementById("left2DBtn").classList.remove("active");
  });

  document.getElementById("right2DBtn").addEventListener("click", () => setRightMode("2d"));
  document.getElementById("right3DBtn").addEventListener("click", () => setRightMode("3d"));

  document.getElementById("syncMapsToggle").addEventListener("change", (event) => {
    syncEnabled = event.target.checked;
    if (syncEnabled && compareMap) copyCamera(map, compareMap);
  });

  document.getElementById("swapMapsBtn").addEventListener("click", () => {
    const camera = getCameraState(map);
    pendingCamera = camera;

    const left = document.getElementById("leftBasemapSelect");
    const right = document.getElementById("rightBasemapSelect");
    const temp = left.value;

    left.value = right.value;
    right.value = temp;

    map.setStyle(window.SUO_COMPARE_CONFIG.basemapStyles[left.value]);
    compareMap?.setStyle(
      window.SUO_COMPARE_CONFIG.basemapStyles[right.value]
    );

    window.setTimeout(() => scheduleAlignment(camera), 300);
  });

  divider.addEventListener("dblclick", () => {
    syncEnabled = !syncEnabled;
    document.getElementById("syncMapsToggle").checked = syncEnabled;
  });

  window.addEventListener("suo:health-layer-toggle", (event) => {
    healthLayerVisible = Boolean(event.detail?.visible);

    if (!compareMap) return;

    ["compare-health-symbol", "compare-health-label"].forEach((layerId) => {
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
    if (!splitActive || !compareMap) return;
    scheduleAlignment(getCameraState(map));
  });
})();
