# SUO GeoPortal — Kemudahan Masyarakat Patch

## Susunan layer baharu

1. Hierarki Bandar DPN2
2. Kemudahan Masyarakat
   - 2.1 Kesihatan
   - 2.2 Keselamatan

`Keselamatan` menempatkan layer PDRM sedia ada dan layer baharu
**Balai Bomba & Penyelamat (37 BBP)**.

## Fail

- `data/balai_bomba_negeri_selangor_final.geojson`
- `data/fasiliti_kesihatan_selangor.geojson`
- `js/community-facilities.js`
- `css/community-facilities.css`
- `layer-panel-replacement.html`

## Integrasi

1. Salin folder `data`, `js` dan `css` ke projek GeoPortal.
2. Dalam `<head>`:
   `<link rel="stylesheet" href="css/community-facilities.css">`
3. Sebelum penutup `</body>`:
   `<script src="js/community-facilities.js"></script>`
4. Dalam handler Mapbox `style.load`, selepas source/layer asas:
   `SUOCommunityFacilities.addFireStationsLayer(map);`
5. Gantikan blok panel Layer Management dengan kandungan
   `layer-panel-replacement.html`.
6. Kekalkan layer PDRM sedia ada di bawah sub-group `Keselamatan`.
7. Untuk checkbox layer, gunakan:
   `SUOCommunityFacilities.setMapLayerVisibility(map, ids, checked)`.

## Layer IDs Balai Bomba

- `fire-stations-halo`
- `fire-stations-points`
- `fire-stations-labels`

Semua diletakkan pada slot `top` supaya simbol kemudahan kekal jelas di atas
traffic dan layer pentadbiran.
