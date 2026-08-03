import { MAPBOX_TOKEN, BASEMAPS } from "./config.js";
import {
  addPortalLayers,
  enableTerrain,
  disableTerrain,
  layerState
} from "./layers.js";
import { enableMiddleMousePan, cameraFrom } from "./utils.js";

const STORAGE_KEY = "suoCompareStateV60";

const DEFAULT_LAYERS = {
  cityHierarchy: true,
  healthFacilities: true,
  schools: true,
  police: true,
  floodRain: true,
  traffic: true,
  districts: true,
  pbt: true
};

const LAYER_IDS = {
  cityHierarchy: ["city-circle", "city-label"],
  healthFacilities: ["health-symbol", "health-label"],
  schools: ["school-symbol", "school-label"],
  police: ["police-symbol", "police-label"],
  floodRain: ["flood-rain-circle", "flood-rain-label"],
  traffic: ["traffic-casing", "traffic-line"],
  districts: ["district-fill", "district-line", "district-label"],
  pbt: ["pbt-fill", "pbt-line", "pbt-label"]
};

const SUO_SYMBOL_SUFFIXES = new Set([
  "city-label",
  "health-symbol",
  "health-label",
  "school-symbol",
  "school-label",
  "police-symbol",
  "police-label",
  "flood-rain-label",
  "district-label",
  "pbt-label"
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function savedState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch (_) {
    return null;
  }
}

function initialState() {
  const saved = savedState();

  return {
    left: {
      basemap: saved?.left?.basemap || "standard",
      mode: saved?.left?.mode || "3d",
      labels: saved?.left?.labels ?? true,
      layers: { ...DEFAULT_LAYERS, ...(saved?.left?.layers || {}) }
    },
    right: {
      basemap: saved?.right?.basemap || "satellite",
      mode: saved?.right?.mode || "3d",
      labels: saved?.right?.labels ?? true,
      layers: { ...DEFAULT_LAYERS, ...(saved?.right?.layers || {}) }
    },
    sync: {
      pan: saved?.sync?.pan ?? true,
      zoom: saved?.sync?.zoom ?? true,
      bearing: saved?.sync?.bearing ?? true,
      pitch: saved?.sync?.pitch ?? true
    }
  };
}

export class CompareEngine {
  constructor(mainMap) {
    this.mainMap = mainMap;
    this.compareMap = null;
    this.active = false;
    this.syncing = false;
    this.state = initialState();
    this.mainSnapshot = null;

    this.shell = document.querySelector(".map-shell");
    this.panel = document.getElementById("comparePanel");
    this.status = document.getElementById("compareStatus");

    this.bindUI();
    this.renderUI();
  }

  bindUI() {
    document.getElementById("splitBtn")
      .addEventListener("click", () => this.toggle());

    document.getElementById("closeSplitBtn")
      .addEventListener("click", () => this.close());

    document.querySelectorAll("[data-compare-tab]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const tab = button.dataset.compareTab;

          document.querySelectorAll("[data-compare-tab]")
            .forEach((item) =>
              item.classList.toggle("active", item === button)
            );

          document.querySelectorAll("[data-compare-panel]")
            .forEach((panel) => {
              const active = panel.dataset.comparePanel === tab;
              panel.hidden = !active;
              panel.classList.toggle("active", active);
            });
        });
      });

    document.querySelectorAll("[data-compare-layer]")
      .forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          const side = checkbox.dataset.compareSide;
          const layer = checkbox.dataset.compareLayer;
          this.state[side].layers[layer] = checkbox.checked;
          this.save();
          this.applyLayerState(side);
        });
      });

    document.querySelectorAll("[data-select-all]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const side = button.dataset.selectAll;
          const values = Object.values(this.state[side].layers);
          const turnOn = !values.every(Boolean);

          Object.keys(this.state[side].layers)
            .forEach((key) => {
              this.state[side].layers[key] = turnOn;
            });

          this.renderUI();
          this.save();
          this.applyLayerState(side);
        });
      });

    document.getElementById("leftBasemapSelect")
      .addEventListener("change", (event) =>
        this.setBasemap("left", event.target.value)
      );

    document.getElementById("rightBasemapSelect")
      .addEventListener("change", (event) =>
        this.setBasemap("right", event.target.value)
      );

    document.getElementById("swapMapsBtn")
      .addEventListener("click", async () => {
        const left = this.state.left.basemap;
        this.state.left.basemap = this.state.right.basemap;
        this.state.right.basemap = left;
        this.renderUI();
        this.save();

        if (this.active) {
          await Promise.all([
            this.applyBasemap("left"),
            this.applyBasemap("right")
          ]);
        }
      });

    document.getElementById("left2DBtn")
      .addEventListener("click", () => this.setMode("left", "2d"));

    document.getElementById("left3DBtn")
      .addEventListener("click", () => this.setMode("left", "3d"));

    document.getElementById("right2DBtn")
      .addEventListener("click", () => this.setMode("right", "2d"));

    document.getElementById("right3DBtn")
      .addEventListener("click", () => this.setMode("right", "3d"));

    document.getElementById("leftLabelsToggle")
      .addEventListener("change", (event) => {
        this.state.left.labels = event.target.checked;
        this.save();
        this.applyBasemapLabels("left");
      });

    document.getElementById("rightLabelsToggle")
      .addEventListener("change", (event) => {
        this.state.right.labels = event.target.checked;
        this.save();
        this.applyBasemapLabels("right");
      });

    const syncMap = {
      syncPanToggle: "pan",
      syncZoomToggle: "zoom",
      syncBearingToggle: "bearing",
      syncPitchToggle: "pitch"
    };

    Object.entries(syncMap).forEach(([id, key]) => {
      document.getElementById(id)
        .addEventListener("change", (event) => {
          this.state.sync[key] = event.target.checked;
          this.save();
          this.updateStatus();
        });
    });
  }

  renderUI() {
    document.getElementById("leftBasemapSelect").value =
      this.state.left.basemap;
    document.getElementById("rightBasemapSelect").value =
      this.state.right.basemap;

    for (const side of ["left", "right"]) {
      document.querySelectorAll(
        `[data-compare-side="${side}"][data-compare-layer]`
      ).forEach((checkbox) => {
        checkbox.checked =
          Boolean(this.state[side].layers[checkbox.dataset.compareLayer]);
      });

      const is3D = this.state[side].mode === "3d";
      document.getElementById(`${side}2DBtn`)
        .classList.toggle("active", !is3D);
      document.getElementById(`${side}3DBtn`)
        .classList.toggle("active", is3D);
      document.getElementById(`${side}LabelsToggle`).checked =
        this.state[side].labels;
    }

    document.getElementById("syncPanToggle").checked =
      this.state.sync.pan;
    document.getElementById("syncZoomToggle").checked =
      this.state.sync.zoom;
    document.getElementById("syncBearingToggle").checked =
      this.state.sync.bearing;
    document.getElementById("syncPitchToggle").checked =
      this.state.sync.pitch;

    this.updateStatus();
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (_) {}
  }

  mapFor(side) {
    return side === "left" ? this.mainMap : this.compareMap;
  }

  prefixFor(side) {
    return side === "left" ? "" : "compare-";
  }

  snapshotMain() {
    this.mainSnapshot = {
      basemap:
        document.getElementById("basemapSelect")?.value || "standard",
      camera: cameraFrom(this.mainMap),
      layerState: clone(layerState)
    };

    this.renderUI();
  }

  async ensureMap() {
    if (this.compareMap) return this.compareMap;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const camera = cameraFrom(this.mainMap);

    this.compareMap = new mapboxgl.Map({
      container: "compareMap",
      style: BASEMAPS[this.state.right.basemap],
      center: camera.center,
      zoom: camera.zoom,
      pitch: this.state.right.mode === "3d" ? camera.pitch : 0,
      bearing: camera.bearing,
      antialias: true
    });

    this.compareMap.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      "top-right"
    );

    enableMiddleMousePan(this.compareMap);

    this.compareMap.on("style.load", async () => {
      await addPortalLayers(this.compareMap, "compare-");
      this.applyLayerState("right");
      this.applyBasemapLabels("right");
      this.applyTerrain("right");

      window.dispatchEvent(new CustomEvent(
        "suo:compare-map-ready",
        {
          detail: {
            map: this.compareMap,
            prefix: "compare-"
          }
        }
      ));

      this.compareMap.once("idle", () => {
        this.applyLayerState("right");
        this.applyBasemapLabels("right");
      });
    });

    this.mainMap.on("move", () =>
      this.syncCamera("left", "right")
    );

    this.compareMap.on("move", () =>
      this.syncCamera("right", "left")
    );

    return this.compareMap;
  }

  async open() {
    if (this.active) return;

    this.snapshotMain();
    this.active = true;
    this.shell.classList.add("split-active");
    this.panel.classList.add("visible");

    await this.ensureMap();
    await this.applyBasemap("left");
    await this.applyBasemap("right");

    requestAnimationFrame(() => {
      this.mainMap.resize();
      this.compareMap.resize();
      this.syncCamera("left", "right", true);
    });
  }

  async close() {
    if (!this.active) return;

    this.active = false;
    this.shell.classList.remove("split-active");
    this.panel.classList.remove("visible");

    if (this.mainSnapshot) {
      const snapshot = this.mainSnapshot;
      document.getElementById("basemapSelect").value =
        snapshot.basemap;

      await this.setMapStyle(
        this.mainMap,
        BASEMAPS[snapshot.basemap]
      );

      Object.assign(layerState, snapshot.layerState);

      const restore = () => {
        this.applyGlobalVisibility();
        this.mainMap.jumpTo(snapshot.camera);
        this.mainMap.resize();
      };

      if (this.mainMap.isStyleLoaded()) {
        restore();
      } else {
        this.mainMap.once("idle", restore);
      }
    } else {
      requestAnimationFrame(() => this.mainMap.resize());
    }
  }

  toggle() {
    return this.active ? this.close() : this.open();
  }

  async setBasemap(side, key) {
    this.state[side].basemap = key;
    this.save();

    if (this.active) {
      await this.applyBasemap(side);
    }
  }

  async applyBasemap(side) {
    const map = side === "right"
      ? await this.ensureMap()
      : this.mainMap;

    await this.setMapStyle(
      map,
      BASEMAPS[this.state[side].basemap]
    );

    const prefix = this.prefixFor(side);

    const finish = async () => {
      await addPortalLayers(map, prefix);
      this.applyLayerState(side);
      this.applyBasemapLabels(side);
      this.applyTerrain(side);

      window.dispatchEvent(new CustomEvent(
        "suo:compare-map-ready",
        { detail: { map, prefix } }
      ));

      map.once("idle", () => {
        this.applyLayerState(side);
        this.applyBasemapLabels(side);
      });

      setTimeout(() => {
        if (this.active) {
          this.applyLayerState(side);
          this.applyBasemapLabels(side);
        }
      }, 350);
    };

    if (map.isStyleLoaded()) {
      await finish();
    } else {
      map.once("style.load", finish);
    }
  }

  setMapStyle(map, style) {
    return new Promise((resolve) => {
      map.setStyle(style);
      map.once("style.load", resolve);
    });
  }

  async setMode(side, mode) {
    if (side === "right") await this.ensureMap();

    this.state[side].mode = mode;
    this.renderUI();
    this.save();

    const map = this.mapFor(side);
    const is3D = mode === "3d";

    map.easeTo({
      pitch: is3D ? 60 : 0,
      bearing: is3D ? map.getBearing() : 0,
      duration: 650
    });

    this.applyTerrain(side);
  }

  applyTerrain(side) {
    const map = this.mapFor(side);
    if (!map || !map.isStyleLoaded()) return;

    const is3D = this.state[side].mode === "3d";

    if (is3D) {
      enableTerrain(
        map,
        side === "left" ? "compare-left-dem" : "compare-right-dem"
      );
    } else {
      disableTerrain(map);
    }

    try {
      map.setConfigProperty("basemap", "show3dObjects", is3D);
    } catch (_) {}
  }

  applyLayerState(side) {
    const map = this.mapFor(side);
    if (!map || !map.isStyleLoaded()) return;

    const prefix = this.prefixFor(side);
    const states = this.state[side].layers;

    Object.entries(LAYER_IDS).forEach(([key, ids]) => {
      const visibility = states[key] ? "visible" : "none";

      ids.forEach((suffix) => {
        const id = `${prefix}${suffix}`;

        if (map.getLayer(id)) {
          map.setLayoutProperty(id, "visibility", visibility);
        }
      });
    });
  }

  applyGlobalVisibility() {
    const map = this.mainMap;

    const global = {
      cityHierarchy: layerState.cityHierarchy,
      healthFacilities: layerState.healthFacilities,
      schools: layerState.schools,
      police: layerState.police,
      floodRain: layerState.floodRain,
      traffic: layerState.liveTraffic,
      districts: layerState.districts,
      pbt: layerState.pbt
    };

    Object.entries(LAYER_IDS).forEach(([key, ids]) => {
      const visibility = global[key] ? "visible" : "none";

      ids.forEach((id) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, "visibility", visibility);
        }
      });
    });
  }

  applyBasemapLabels(side) {
    const map = this.mapFor(side);
    if (!map || !map.isStyleLoaded()) return;

    const visible = this.state[side].labels;
    const prefix = this.prefixFor(side);

    try {
      map.setConfigProperty(
        "basemap",
        "showPointOfInterestLabels",
        visible
      );
      map.setConfigProperty(
        "basemap",
        "showPlaceLabels",
        visible
      );
      map.setConfigProperty(
        "basemap",
        "showTransitLabels",
        visible
      );
      map.setConfigProperty(
        "basemap",
        "showRoadLabels",
        visible
      );
    } catch (_) {}

    const styleLayers = map.getStyle()?.layers || [];

    styleLayers.forEach((layer) => {
      if (layer.type !== "symbol") return;

      const suffix = prefix && layer.id.startsWith(prefix)
        ? layer.id.slice(prefix.length)
        : layer.id;

      if (SUO_SYMBOL_SUFFIXES.has(suffix)) return;

      try {
        map.setLayoutProperty(
          layer.id,
          "visibility",
          visible ? "visible" : "none"
        );
      } catch (_) {}
    });
  }

  syncCamera(fromSide, toSide, force = false) {
    if (
      !this.active ||
      this.syncing ||
      !this.compareMap
    ) {
      return;
    }

    const anySync = Object.values(this.state.sync).some(Boolean);
    if (!anySync && !force) return;

    const source = this.mapFor(fromSide);
    const target = this.mapFor(toSide);

    const options = {};

    if (this.state.sync.pan || force) {
      options.center = source.getCenter();
    }

    if (this.state.sync.zoom || force) {
      options.zoom = source.getZoom();
    }

    if (this.state.sync.bearing || force) {
      options.bearing = source.getBearing();
    }

    if (this.state.sync.pitch || force) {
      options.pitch = source.getPitch();
    }

    this.syncing = true;
    target.jumpTo(options);

    requestAnimationFrame(() => {
      this.syncing = false;
    });
  }

  updateStatus() {
    const active = Object.entries(this.state.sync)
      .filter(([, value]) => value)
      .map(([key]) => key);

    this.status.textContent = active.length
      ? `Sync aktif: ${active.join(", ")}`
      : "Kedua-dua paparan bergerak secara bebas";
  }

  refreshLayers() {
    if (!this.active) return;
    this.applyLayerState("left");
    this.applyLayerState("right");
  }
}
