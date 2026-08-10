/**
 * SUO 3D GeoPortal
 * Patch: Kemudahan Masyarakat
 *
 * Final layer order:
 * 1. Hierarki Bandar DPN2
 * 2. Kemudahan Masyarakat
 *    2.1 Kesihatan
 *    2.2 Keselamatan
 *
 * Keselamatan:
 * - PDRM (existing portal layer)
 * - Balai Bomba & Penyelamat Selangor (37 BBP)
 */

const COMMUNITY_FACILITY_CONFIG = {
  id: "community-facilities",
  label: "Kemudahan Masyarakat",
  order: 2,
  expanded: true,
  children: [
    {
      id: "health",
      label: "Kesihatan",
      icon: "✚",
      expanded: false,
      children: [
        {
          id: "health-facilities",
          label: "Fasiliti Kesihatan",
          sourceId: "health-facilities-source",
          layerIds: ["health-facilities-points"],
          data: "./data/fasiliti_kesihatan_selangor.geojson"
        }
      ]
    },
    {
      id: "safety",
      label: "Keselamatan",
      icon: "◆",
      expanded: true,
      children: [
        // Existing PDRM layers can be registered here without changing their map source/layer ids.
        // Example:
        // {
        //   id: "pdrm",
        //   label: "Polis Diraja Malaysia",
        //   layerIds: ["pdrm-points", "pdrm-labels"]
        // },
        {
          id: "fire-stations",
          label: "Balai Bomba & Penyelamat",
          sourceId: "fire-stations-source",
          layerIds: ["fire-stations-halo", "fire-stations-points", "fire-stations-labels"],
          data: "./data/balai_bomba_negeri_selangor_final.geojson"
        }
      ]
    }
  ]
};

async function addFireStationsLayer(map) {
  if (map.getSource("fire-stations-source")) return;

  map.addSource("fire-stations-source", {
    type: "geojson",
    data: "./data/balai_bomba_negeri_selangor_final.geojson"
  });

  // White halo improves visibility over traffic / satellite / dark basemaps.
  map.addLayer({
    id: "fire-stations-halo",
    type: "circle",
    source: "fire-stations-source",
    slot: "top",
    paint: {
      "circle-radius": [
        "case",
        ["==", ["get", "KATEGORI"], "BBP / Pejabat Zon"], 9,
        7
      ],
      "circle-color": "#ffffff",
      "circle-opacity": 0.92
    }
  });

  map.addLayer({
    id: "fire-stations-points",
    type: "circle",
    source: "fire-stations-source",
    slot: "top",
    paint: {
      "circle-radius": [
        "case",
        ["==", ["get", "KATEGORI"], "BBP / Pejabat Zon"], 6.5,
        5
      ],
      "circle-color": [
        "case",
        ["==", ["get", "KATEGORI"], "BBP / Pejabat Zon"], "#9f1239",
        "#dc2626"
      ],
      "circle-stroke-color": "#7f1d1d",
      "circle-stroke-width": 1
    }
  });

  map.addLayer({
    id: "fire-stations-labels",
    type: "symbol",
    source: "fire-stations-source",
    slot: "top",
    minzoom: 10,
    layout: {
      "text-field": ["coalesce", ["get", "NAMA_BBP"], ["get", "NAMA"]],
      "text-size": 11,
      "text-offset": [0, 1.15],
      "text-anchor": "top",
      "text-allow-overlap": false,
      "text-ignore-placement": false
    },
    paint: {
      "text-color": "#7f1d1d",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.5
    }
  });

  const popupLayer = "fire-stations-points";

  map.on("mouseenter", popupLayer, () => map.getCanvas().style.cursor = "pointer");
  map.on("mouseleave", popupLayer, () => map.getCanvas().style.cursor = "");

  map.on("click", popupLayer, (e) => {
    const f = e.features?.[0];
    if (!f) return;
    const p = f.properties || {};

    new mapboxgl.Popup({ closeButton: true, maxWidth: "340px" })
      .setLngLat(e.lngLat)
      .setHTML(`
        <div class="suo-popup">
          <div class="suo-popup-kicker">BALAI BOMBA & PENYELAMAT</div>
          <h3>${p.NAMA_BBP || "Balai Bomba"}</h3>
          <div class="suo-popup-grid">
            <span>Zon</span><b>${p.ZON || "-"}</b>
            <span>Nama Zon</span><b>${p.NAMA_ZON || "-"}</b>
            <span>Kategori</span><b>${p.KATEGORI || "-"}</b>
          </div>
        </div>
      `)
      .addTo(map);
  });
}

function setMapLayerVisibility(map, layerIds, visible) {
  const visibility = visible ? "visible" : "none";
  layerIds.forEach(id => {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visibility);
  });
}

/**
 * Call this after the Mapbox style is loaded.
 *
 * Recommended:
 * map.on("style.load", () => {
 *   ...
 *   addFireStationsLayer(map);
 * });
 */
window.SUOCommunityFacilities = {
  config: COMMUNITY_FACILITY_CONFIG,
  addFireStationsLayer,
  setMapLayerVisibility
};
