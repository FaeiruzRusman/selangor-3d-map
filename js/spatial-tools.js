import { MAPBOX_TOKEN } from "./config.js";

const EARTH_RADIUS_M = 6371008.8;

const SOURCE_ID = "spatial-tools-source";
const POINT_LAYER_ID = "spatial-tools-points";
const LINE_LAYER_ID = "spatial-tools-line";
const FILL_LAYER_ID = "spatial-tools-fill";
const OUTLINE_LAYER_ID = "spatial-tools-outline";
const ROUTE_SOURCE_ID = "network-route-source";
const ROUTE_CASING_LAYER_ID = "network-route-casing";
const ROUTE_LAYER_ID = "network-route-line";
const ROUTE_POINT_LAYER_ID = "network-route-points";

let activeInstance = null;

function radians(value) {
  return value * Math.PI / 180;
}

function degrees(value) {
  return value * 180 / Math.PI;
}

function haversineDistance(a, b) {
  const lat1 = radians(a[1]);
  const lat2 = radians(b[1]);
  const dLat = lat2 - lat1;
  const dLng = radians(b[0] - a[0]);

  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
    Math.cos(lat2) *
    Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(value));
}

function lineDistance(coordinates) {
  let total = 0;

  for (let index = 1; index < coordinates.length; index += 1) {
    total += haversineDistance(
      coordinates[index - 1],
      coordinates[index]
    );
  }

  return total;
}

function polygonArea(coordinates) {
  if (coordinates.length < 3) return 0;

  const meanLat = coordinates.reduce(
    (sum, coordinate) => sum + coordinate[1],
    0
  ) / coordinates.length;

  const scaleX =
    Math.cos(radians(meanLat)) *
    Math.PI *
    EARTH_RADIUS_M /
    180;

  const scaleY =
    Math.PI *
    EARTH_RADIUS_M /
    180;

  const projected = coordinates.map(([lng, lat]) => [
    lng * scaleX,
    lat * scaleY
  ]);

  let area = 0;

  for (let index = 0; index < projected.length; index += 1) {
    const current = projected[index];
    const next = projected[(index + 1) % projected.length];

    area += current[0] * next[1] - next[0] * current[1];
  }

  return Math.abs(area) / 2;
}

function destinationPoint(origin, distanceM, bearingDeg) {
  const angularDistance = distanceM / EARTH_RADIUS_M;
  const bearing = radians(bearingDeg);
  const lat1 = radians(origin[1]);
  const lng1 = radians(origin[0]);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
    Math.cos(lat1) *
    Math.sin(angularDistance) *
    Math.cos(bearing)
  );

  const lng2 = lng1 + Math.atan2(
    Math.sin(bearing) *
    Math.sin(angularDistance) *
    Math.cos(lat1),
    Math.cos(angularDistance) -
    Math.sin(lat1) *
    Math.sin(lat2)
  );

  return [degrees(lng2), degrees(lat2)];
}

function circlePolygon(center, radiusM, steps = 96) {
  const ring = [];

  for (let index = 0; index <= steps; index += 1) {
    ring.push(
      destinationPoint(
        center,
        radiusM,
        index * 360 / steps
      )
    );
  }

  return {
    type: "Feature",
    properties: {
      tool: "buffer",
      radius_m: radiusM
    },
    geometry: {
      type: "Polygon",
      coordinates: [ring]
    }
  };
}

function featureCollection(features = []) {
  return {
    type: "FeatureCollection",
    features
  };
}

function pointFeature(coordinate, properties = {}) {
  return {
    type: "Feature",
    properties,
    geometry: {
      type: "Point",
      coordinates: coordinate
    }
  };
}

function lineFeature(coordinates, properties = {}) {
  return {
    type: "Feature",
    properties,
    geometry: {
      type: "LineString",
      coordinates
    }
  };
}

function polygonFeature(coordinates, properties = {}) {
  const ring = [...coordinates];

  if (
    ring.length &&
    (
      ring[0][0] !== ring[ring.length - 1][0] ||
      ring[0][1] !== ring[ring.length - 1][1]
    )
  ) {
    ring.push(ring[0]);
  }

  return {
    type: "Feature",
    properties,
    geometry: {
      type: "Polygon",
      coordinates: [ring]
    }
  };
}

function formatDistance(distanceM) {
  if (distanceM >= 1000) {
    return `${(distanceM / 1000).toLocaleString("ms-MY", {
      maximumFractionDigits: 2
    })} km`;
  }

  return `${distanceM.toLocaleString("ms-MY", {
    maximumFractionDigits: 1
  })} m`;
}

function formatArea(areaM2) {
  if (areaM2 >= 1000000) {
    return `${(areaM2 / 1000000).toLocaleString("ms-MY", {
      maximumFractionDigits: 2
    })} km²`;
  }

  if (areaM2 >= 10000) {
    return `${(areaM2 / 10000).toLocaleString("ms-MY", {
      maximumFractionDigits: 2
    })} ha`;
  }

  return `${areaM2.toLocaleString("ms-MY", {
    maximumFractionDigits: 1
  })} m²`;
}

export function isSpatialToolActive() {
  return Boolean(activeInstance?.mode);
}

export class SpatialTools {
  constructor(map) {
    this.map = map;
    this.mode = null;
    this.coordinates = [];
    this.popup = null;
    this.routeTravelMode = "driving";

    this.measureDistanceButton =
      document.getElementById("measureDistanceBtn");
    this.measureAreaButton =
      document.getElementById("measureAreaBtn");
    this.networkDistanceButton =
      document.getElementById("networkDistanceBtn");
    this.routeProfile =
      document.getElementById("routeProfile");
    this.avoidTollToggle =
      document.getElementById("avoidTollToggle");
    this.avoidMotorwayToggle =
      document.getElementById("avoidMotorwayToggle");
    this.bufferButton =
      document.getElementById("bufferAnalysisBtn");
    this.clearButton =
      document.getElementById("clearSpatialToolsBtn");
    this.bufferDistance =
      document.getElementById("bufferDistance");
    this.bufferUnit =
      document.getElementById("bufferUnit");
    this.status =
      document.getElementById("spatialToolStatus");

    activeInstance = this;

    this.bind();
    this.ensureLayers();
  }

  bind() {
    this.measureDistanceButton.addEventListener("click", () => {
      this.toggleMode("distance");
    });

    this.measureAreaButton.addEventListener("click", () => {
      this.toggleMode("area");
    });

    this.networkDistanceButton.addEventListener("click", () => {
      this.toggleMode("network");
    });

    this.bufferButton.addEventListener("click", () => {
      this.toggleMode("buffer");
    });

    this.clearButton.addEventListener("click", () => {
      this.clear();
    });

    this.map.on("style.load", () => {
      this.ensureLayers();
      this.render();
    });

    this.map.on("click", (event) => {
      if (!this.mode) return;

      const coordinate = [
        event.lngLat.lng,
        event.lngLat.lat
      ];

      if (this.mode === "buffer") {
        this.createBuffer(coordinate);
        return;
      }

      if (this.mode === "network") {
        this.coordinates.push(coordinate);
        this.renderNetworkEndpoints();

        if (this.coordinates.length === 1) {
          this.setStatus(
            "Titik mula ditetapkan. Klik destinasi pada peta."
          );
        } else if (this.coordinates.length === 2) {
          this.calculateNetworkRoute();
        }
        return;
      }

      this.coordinates.push(coordinate);
      this.render();
      this.updateResult();

      if (this.mode === "distance") {
        this.setStatus(
          this.coordinates.length === 1
            ? "Titik pertama ditetapkan. Klik titik seterusnya; klik dua kali untuk tamat."
            : `Jumlah jarak: ${formatDistance(lineDistance(this.coordinates))}`
        );
      } else {
        this.setStatus(
          this.coordinates.length < 3
            ? "Tambah sekurang-kurangnya 3 titik; klik dua kali untuk tamat."
            : `Keluasan semasa: ${formatArea(polygonArea(this.coordinates))}`
        );
      }
    });

    this.map.on("dblclick", (event) => {
      if (!["distance", "area"].includes(this.mode)) return;

      event.preventDefault();

      if (
        this.mode === "distance" &&
        this.coordinates.length >= 2
      ) {
        this.finishDistance();
      } else if (
        this.mode === "area" &&
        this.coordinates.length >= 3
      ) {
        this.finishArea();
      }
    });
  }

  ensureLayers() {
    if (!this.map.isStyleLoaded()) return;

    if (!this.map.getSource(SOURCE_ID)) {
      this.map.addSource(SOURCE_ID, {
        type: "geojson",
        data: featureCollection()
      });
    }

    if (!this.map.getLayer(FILL_LAYER_ID)) {
      this.map.addLayer({
        id: FILL_LAYER_ID,
        type: "fill",
        source: SOURCE_ID,
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "fill-color": [
            "match",
            ["get", "tool"],
            "buffer", "#22D3EE",
            "#FACC15"
          ],
          "fill-opacity": 0.20
        }
      });
    }

    if (!this.map.getLayer(OUTLINE_LAYER_ID)) {
      this.map.addLayer({
        id: OUTLINE_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "line-color": [
            "match",
            ["get", "tool"],
            "buffer", "#22D3EE",
            "#FACC15"
          ],
          "line-width": 2.2,
          "line-dasharray": [2, 1]
        }
      });
    }

    if (!this.map.getLayer(LINE_LAYER_ID)) {
      this.map.addLayer({
        id: LINE_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        filter: ["==", ["geometry-type"], "LineString"],
        paint: {
          "line-color": "#FACC15",
          "line-width": 3,
          "line-dasharray": [2, 1]
        }
      });
    }

    if (!this.map.getLayer(POINT_LAYER_ID)) {
      this.map.addLayer({
        id: POINT_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": 5,
          "circle-color": "#FACC15",
          "circle-stroke-color": "#111827",
          "circle-stroke-width": 2
        }
      });
    }

    if (!this.map.getSource(ROUTE_SOURCE_ID)) {
      this.map.addSource(ROUTE_SOURCE_ID, {
        type: "geojson",
        data: featureCollection()
      });
    }

    if (!this.map.getLayer(ROUTE_CASING_LAYER_ID)) {
      this.map.addLayer({
        id: ROUTE_CASING_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        filter: ["==", ["geometry-type"], "LineString"],
        paint: {
          "line-color": "#0F172A",
          "line-width": 8,
          "line-opacity": 0.82
        }
      });
    }

    if (!this.map.getLayer(ROUTE_LAYER_ID)) {
      this.map.addLayer({
        id: ROUTE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        filter: ["==", ["geometry-type"], "LineString"],
        paint: {
          "line-color": "#22D3EE",
          "line-width": 4.5,
          "line-opacity": 0.98
        }
      });
    }

    if (!this.map.getLayer(ROUTE_POINT_LAYER_ID)) {
      this.map.addLayer({
        id: ROUTE_POINT_LAYER_ID,
        type: "circle",
        source: ROUTE_SOURCE_ID,
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": [
            "match",
            ["get", "role"],
            "start", 7,
            "end", 7,
            5
          ],
          "circle-color": [
            "match",
            ["get", "role"],
            "start", "#22C55E",
            "end", "#EF4444",
            "#22D3EE"
          ],
          "circle-stroke-color": "#FFFFFF",
          "circle-stroke-width": 2
        }
      });
    }
  }

  toggleMode(mode) {
    if (this.mode === mode) {
      this.stopMode();
      return;
    }

    this.mode = mode;
    this.coordinates = [];
    this.popup?.remove();
    this.popup = null;
    this.map.doubleClickZoom.disable();
    this.map.getCanvas().classList.add("spatial-tool-cursor");

    this.renderButtons();
    this.render();

    if (mode === "distance") {
      this.setStatus(
        "Ukur Jarak aktif. Klik titik pertama pada peta."
      );
    } else if (mode === "network") {
      this.setStatus(
        "Jarak Perjalanan aktif. Klik titik mula pada peta."
      );
    } else if (mode === "area") {
      this.setStatus(
        "Ukur Keluasan aktif. Klik minimum 3 titik dan klik dua kali untuk tamat."
      );
    } else {
      this.setStatus(
        "Analisis Buffer aktif. Tetapkan jarak, kemudian klik titik pusat pada peta."
      );
    }
  }

  stopMode() {
    this.mode = null;
    this.coordinates = [];
    this.map.doubleClickZoom.enable();
    this.map.getCanvas().classList.remove("spatial-tool-cursor");
    this.renderButtons();
    this.setStatus("Pilih alat untuk memulakan analisis.");
  }

  finishDistance() {
    const distance = lineDistance(this.coordinates);
    const last = this.coordinates[this.coordinates.length - 1];

    this.popup?.remove();
    this.popup = new mapboxgl.Popup({
      closeOnClick: false,
      closeButton: true
    })
      .setLngLat(last)
      .setHTML(
        `<strong>Hasil Ukur Jarak</strong><br>
         Jumlah: ${formatDistance(distance)}<br>
         Segmen: ${Math.max(0, this.coordinates.length - 1)}`
      )
      .addTo(this.map);

    this.mode = null;
    this.map.doubleClickZoom.enable();
    this.map.getCanvas().classList.remove("spatial-tool-cursor");
    this.renderButtons();
    this.setStatus(`Selesai: ${formatDistance(distance)}`);
  }

  finishArea() {
    const area = polygonArea(this.coordinates);
    const last = this.coordinates[this.coordinates.length - 1];

    this.popup?.remove();
    this.popup = new mapboxgl.Popup({
      closeOnClick: false,
      closeButton: true
    })
      .setLngLat(last)
      .setHTML(
        `<strong>Hasil Ukur Keluasan</strong><br>
         Keluasan: ${formatArea(area)}<br>
         Perimeter: ${formatDistance(
           lineDistance([
             ...this.coordinates,
             this.coordinates[0]
           ])
         )}`
      )
      .addTo(this.map);

    this.render();

    this.mode = null;
    this.map.doubleClickZoom.enable();
    this.map.getCanvas().classList.remove("spatial-tool-cursor");
    this.renderButtons();
    this.setStatus(`Selesai: ${formatArea(area)}`);
  }

  createBuffer(center) {
    const value = Number(this.bufferDistance.value);

    if (!Number.isFinite(value) || value <= 0) {
      this.setStatus("Masukkan jarak buffer yang sah.");
      return;
    }

    const unit = this.bufferUnit.value;
    const multiplier = {
      m: 1,
      km: 1000
    }[unit] || 1;

    const radiusM = value * multiplier;
    const buffer = circlePolygon(center, radiusM);

    const source = this.map.getSource(SOURCE_ID);

    source?.setData(
      featureCollection([
        buffer,
        pointFeature(center, {
          tool: "buffer-center"
        })
      ])
    );

    this.popup?.remove();
    this.popup = new mapboxgl.Popup({
      closeOnClick: false,
      closeButton: true
    })
      .setLngLat(center)
      .setHTML(
        `<strong>Analisis Buffer</strong><br>
         Radius: ${formatDistance(radiusM)}<br>
         Keluasan: ${formatArea(Math.PI * radiusM ** 2)}`
      )
      .addTo(this.map);

    this.mode = null;
    this.map.doubleClickZoom.enable();
    this.map.getCanvas().classList.remove("spatial-tool-cursor");
    this.renderButtons();
    this.setStatus(
      `Buffer ${formatDistance(radiusM)} berjaya dijana.`
    );
  }

  renderNetworkEndpoints(routeGeometry = null) {
    this.ensureLayers();

    const source = this.map.getSource(ROUTE_SOURCE_ID);
    if (!source) return;

    const features = [];

    if (routeGeometry) {
      features.push({
        type: "Feature",
        properties: {
          tool: "network-route"
        },
        geometry: routeGeometry
      });
    }

    if (this.coordinates[0]) {
      features.push(
        pointFeature(this.coordinates[0], {
          role: "start"
        })
      );
    }

    if (this.coordinates[1]) {
      features.push(
        pointFeature(this.coordinates[1], {
          role: "end"
        })
      );
    }

    source.setData(featureCollection(features));
  }

  async calculateNetworkRoute() {
    const [start, end] = this.coordinates;

    if (!start || !end) return;

    this.setStatus("Mengira laluan melalui rangkaian jalan...");
    this.networkDistanceButton.disabled = true;

    const mode = this.routeProfile.value;
    const profile =
      this.routeTravelMode === "walking"
        ? "mapbox/walking"
        : this.routeTravelMode === "cycling"
          ? "mapbox/cycling"
          : mode === "fastest"
            ? "mapbox/driving-traffic"
            : "mapbox/driving";

    const coordinates =
      `${start[0]},${start[1]};${end[0]},${end[1]}`;

    const url = new URL(
      `https://api.mapbox.com/directions/v5/${profile}/${coordinates}`
    );

    url.searchParams.set("access_token", MAPBOX_TOKEN);
    url.searchParams.set("geometries", "geojson");
    url.searchParams.set("overview", "full");
    url.searchParams.set("steps", "true");
    url.searchParams.set("language", "ms");
    url.searchParams.set("alternatives", mode === "shortest" ? "true" : "false");

    const exclusions = [];

    if (this.routeTravelMode === "driving") {
      if (this.avoidTollToggle.checked) {
        exclusions.push("toll");
      }

      if (this.avoidMotorwayToggle.checked) {
        exclusions.push("motorway");
      }
    }

    if (exclusions.length) {
      url.searchParams.set("exclude", exclusions.join(","));
    }

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Directions API ${response.status}`);
      }

      const data = await response.json();
      const routes = data.routes || [];

      if (!routes.length) {
        throw new Error("Tiada laluan jalan ditemui.");
      }

      const selectedRoute =
        mode === "shortest"
          ? [...routes].sort((a, b) => a.distance - b.distance)[0]
          : routes[0];

      this.renderNetworkEndpoints(selectedRoute.geometry);

      const bounds = new mapboxgl.LngLatBounds();

      selectedRoute.geometry.coordinates.forEach((coordinate) => {
        bounds.extend(coordinate);
      });

      if (!bounds.isEmpty()) {
        this.map.fitBounds(bounds, {
          padding: 90,
          maxZoom: 16,
          duration: 900
        });
      }

      const destination =
        selectedRoute.geometry.coordinates[
          selectedRoute.geometry.coordinates.length - 1
        ];

      const durationMinutes = selectedRoute.duration / 60;
      const selectedMethod =
        mode === "shortest"
          ? "Jarak terpendek antara alternatif jalan"
          : "Masa terpantas berdasarkan profil trafik";

      const restrictions = [
        this.avoidTollToggle.checked ? "Elak tol" : null,
        this.avoidMotorwayToggle.checked ? "Elak highway" : null
      ].filter(Boolean);

      this.popup?.remove();
      this.popup = new mapboxgl.Popup({
        closeOnClick: false,
        closeButton: true
      })
        .setLngLat(destination)
        .setHTML(
          `<strong>Jarak Perjalanan Jalan</strong><br>
           Jarak: ${formatDistance(selectedRoute.distance)}<br>
           Anggaran masa: ${durationMinutes.toLocaleString("ms-MY", {
             maximumFractionDigits: 0
           })} minit<br>
           Kaedah: ${selectedMethod}<br>
           Sekatan: ${restrictions.length
             ? restrictions.join(", ")
             : "Tiada"}`
        )
        .addTo(this.map);

      this.mode = null;
      this.map.doubleClickZoom.enable();
      this.map.getCanvas().classList.remove("spatial-tool-cursor");
      this.renderButtons();

      this.setStatus(
        `Laluan siap: ${formatDistance(selectedRoute.distance)} • ` +
        `${durationMinutes.toLocaleString("ms-MY", {
          maximumFractionDigits: 0
        })} minit`
      );
    } catch (error) {
      console.error(error);

      this.coordinates = [];
      this.renderNetworkEndpoints();

      this.setStatus(
        "Laluan gagal dikira. Semak token Mapbox, sambungan internet atau lokasi titik."
      );
    } finally {
      this.networkDistanceButton.disabled = false;
    }
  }

  setRouteTravelMode(mode) {
    if (!["driving", "walking", "cycling"].includes(mode)) {
      return;
    }

    this.routeTravelMode = mode;

    const drivingOnly = mode === "driving";
    this.avoidTollToggle.disabled = !drivingOnly;
    this.avoidMotorwayToggle.disabled = !drivingOnly;

    if (!drivingOnly) {
      this.avoidTollToggle.checked = false;
      this.avoidMotorwayToggle.checked = false;
    }

    this.setStatus(
      mode === "walking"
        ? "Mod laluan berjalan kaki dipilih."
        : mode === "cycling"
          ? "Mod laluan berbasikal dipilih."
          : "Mod laluan kenderaan dipilih."
    );
  }

  updateResult() {
    // Reserved for live statistics and future intersect analysis.
  }

  render() {
    this.ensureLayers();

    const source = this.map.getSource(SOURCE_ID);
    if (!source) return;

    const features = this.coordinates.map(
      (coordinate, index) =>
        pointFeature(coordinate, {
          tool: this.mode,
          sequence: index + 1
        })
    );

    if (
      this.mode === "distance" &&
      this.coordinates.length >= 2
    ) {
      features.push(
        lineFeature(this.coordinates, {
          tool: "distance"
        })
      );
    }

    if (
      this.mode === "area" &&
      this.coordinates.length >= 3
    ) {
      features.push(
        polygonFeature(this.coordinates, {
          tool: "area"
        })
      );
    }

    source.setData(featureCollection(features));
  }

  clear() {
    this.mode = null;
    this.coordinates = [];
    this.popup?.remove();
    this.popup = null;

    this.map.doubleClickZoom.enable();
    this.map.getCanvas().classList.remove("spatial-tool-cursor");

    const source = this.map.getSource(SOURCE_ID);
    source?.setData(featureCollection());

    const routeSource = this.map.getSource(ROUTE_SOURCE_ID);
    routeSource?.setData(featureCollection());

    this.renderButtons();
    this.setStatus("Semua hasil ukuran dan analisis telah dipadam.");
  }

  renderButtons() {
    const map = {
      distance: this.measureDistanceButton,
      network: this.networkDistanceButton,
      area: this.measureAreaButton,
      buffer: this.bufferButton
    };

    Object.entries(map).forEach(([mode, button]) => {
      button.classList.toggle(
        "active",
        this.mode === mode
      );

      button.setAttribute(
        "aria-pressed",
        String(this.mode === mode)
      );
    });
  }

  setStatus(message) {
    this.status.textContent = message;
  }
}
