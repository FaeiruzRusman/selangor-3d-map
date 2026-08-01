import { MAPBOX_TOKEN, BASEMAPS } from "./config.js";
import {
  addPortalLayers,
  applyLayerVisibility,
  enableTerrain,
  disableTerrain,
  layerState
} from "./layers.js";
import { enableMiddleMousePan, cameraFrom, applyCamera } from "./utils.js";

export class CompareEngine {
  constructor(mainMap) {
    this.mainMap = mainMap;
    this.compareMap = null;
    this.active = false;
    this.syncEnabled = true;
    this.syncing = false;
    this.rightMode = "3d";

    this.shell = document.querySelector(".map-shell");
    this.panel = document.getElementById("comparePanel");
    this.status = document.getElementById("compareStatus");

    document.getElementById("splitBtn").addEventListener("click", () => this.toggle());
    document.getElementById("closeSplitBtn").addEventListener("click", () => this.close());

    document.getElementById("syncMapsToggle").addEventListener("change", (event) => {
      this.syncEnabled = event.target.checked;
      this.status.textContent = this.syncEnabled
        ? "Sync aktif selepas pergerakan selesai"
        : "Sync dimatikan";
    });

    document.getElementById("leftBasemapSelect").addEventListener("change", (event) => {
      this.mainMap.setStyle(BASEMAPS[event.target.value]);
    });

    document.getElementById("rightBasemapSelect").addEventListener("change", (event) => {
      this.ensureMap().then(() => this.compareMap.setStyle(BASEMAPS[event.target.value]));
    });

    document.getElementById("right2DBtn").addEventListener("click", () => this.setRightMode("2d"));
    document.getElementById("right3DBtn").addEventListener("click", () => this.setRightMode("3d"));

    document.getElementById("swapMapsBtn").addEventListener("click", async () => {
      const left = document.getElementById("leftBasemapSelect");
      const right = document.getElementById("rightBasemapSelect");
      const temp = left.value;
      left.value = right.value;
      right.value = temp;

      this.mainMap.setStyle(BASEMAPS[left.value]);
      await this.ensureMap();
      this.compareMap.setStyle(BASEMAPS[right.value]);
    });
  }

  async ensureMap() {
    if (this.compareMap) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const camera = cameraFrom(this.mainMap);

    this.compareMap = new mapboxgl.Map({
      container: "compareMap",
      style: BASEMAPS.satellite,
      center: camera.center,
      zoom: camera.zoom,
      pitch: camera.pitch,
      bearing: 0,
      antialias: true
    });

    this.compareMap.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      "top-right"
    );

    enableMiddleMousePan(this.compareMap);

    this.compareMap.on("style.load", async () => {
      await addPortalLayers(this.compareMap, "compare-");
      if (this.rightMode === "3d" && layerState.terrain) {
        enableTerrain(this.compareMap, "compare-dem");
      }
    });

    this.mainMap.on("moveend", () => this.syncLeftToRight());
    this.compareMap.on("moveend", () => this.syncRightToLeft());
  }

  async open() {
    if (this.active) return;
    this.active = true;
    this.shell.classList.add("split-active");
    this.panel.classList.add("visible");

    await this.ensureMap();

    requestAnimationFrame(() => {
      this.mainMap.resize();
      this.compareMap.resize();
      applyCamera(this.compareMap, cameraFrom(this.mainMap));
    });
  }

  close() {
    if (!this.active) return;
    this.active = false;
    this.shell.classList.remove("split-active");
    this.panel.classList.remove("visible");
    requestAnimationFrame(() => this.mainMap.resize());
  }

  toggle() {
    return this.active ? this.close() : this.open();
  }

  syncLeftToRight() {
    if (!this.active || !this.syncEnabled || this.syncing || !this.compareMap) return;
    this.syncing = true;
    applyCamera(this.compareMap, cameraFrom(this.mainMap));
    requestAnimationFrame(() => {
      this.syncing = false;
    });
  }

  syncRightToLeft() {
    if (!this.active || !this.syncEnabled || this.syncing || !this.compareMap) return;
    this.syncing = true;
    applyCamera(this.mainMap, cameraFrom(this.compareMap));
    requestAnimationFrame(() => {
      this.syncing = false;
    });
  }

  async setRightMode(mode) {
    await this.ensureMap();
    this.rightMode = mode;
    const is3D = mode === "3d";

    this.compareMap.easeTo({
      pitch: is3D ? 60 : 0,
      bearing: 0,
      duration: 700
    });

    if (is3D && layerState.terrain) {
      enableTerrain(this.compareMap, "compare-dem");
    } else {
      disableTerrain(this.compareMap);
    }

    document.getElementById("right2DBtn").classList.toggle("active", !is3D);
    document.getElementById("right3DBtn").classList.toggle("active", is3D);
  }

  refreshLayers() {
    if (!this.compareMap) return;
    applyLayerVisibility(this.compareMap, "compare-");
  }
}
