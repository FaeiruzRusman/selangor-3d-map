export const MAPBOX_TOKEN = "pk.eyJ1IjoiYXBhaTE5ODkiLCJhIjoiY21zODZ2Nzc4MDAzODJ5czk5eDFhOXFpZSJ9.bZ4OwmZqVZKRs_CX3f0tVA";

export const START_VIEW = {
  center: [101.48, 3.18],
  zoom: 10.2,
  pitch: 58,
  bearing: 0
};

export const BASEMAPS = {
  standard: "mapbox://styles/mapbox/standard",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  streets: "mapbox://styles/mapbox/streets-v12",
  outdoors: "mapbox://styles/mapbox/outdoors-v12",
  dark: "mapbox://styles/mapbox/dark-v11"
};

export const DATA_URLS = {
  cities: "data/hierarki_bandar_selangor_dpn2.geojson",
  urbanConfig: "config/urban-hierarchy.json",
  health: "data/kesihatan/kemudahan_kesihatan_selangor.geojson",
  hospitalIcon: "assets/icons/hospital-building.svg",
  police: "data/keselamatan/ipk_ipd_selangor.geojson",
  policeIcon: "assets/icons/police-building.svg"
};
