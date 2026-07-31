# SUO 3D GeoPortal v1.0

Prototaip **Selangor Urban Observatory 3D GeoPortal** menggunakan Mapbox GL JS dan GitHub Pages.

## Fungsi utama

- Peta 3D Mapbox
- Terrain 3D
- Bangunan 3D melalui Mapbox Standard
- Carian lokasi Malaysia
- Basemap switcher
- Layer GIS GeoJSON
- Feature popup dan panel maklumat
- KPI dashboard
- Fly-through Selangor dengan orientasi utara
- Ukuran jarak
- Geolokasi
- Mod malam
- AI ChatGIS asas berasaskan arahan
- Paparan responsif desktop dan telefon
- Orientasi peta dikunci ke utara
- 17 lokasi bandar dan pekan utama Selangor

## Struktur

```text
index.html
styles.css
app.js
README.md
data/
  urban-focus.geojson
  facilities.geojson
  mobility-corridor.geojson
```

## Cara terbitkan ke GitHub Pages

1. Cipta repository baharu, contohnya `SUO-3D-GeoPortal`.
2. Upload semua fail dan folder dalam projek ini.
3. Buka `Settings`.
4. Pilih `Pages`.
5. Di bahagian `Build and deployment`, pilih:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
6. Tekan `Save`.

URL akan berbentuk:

```text
https://USERNAME.github.io/SUO-3D-GeoPortal/
```

## Mapbox token

Token public dimasukkan dalam `app.js`:

```javascript
const MAPBOX_PUBLIC_TOKEN = "pk...";
```

Untuk production, tetapkan URL restrictions dalam akaun Mapbox kepada domain GitHub Pages atau domain rasmi SUO.

## Tukar data GIS

Gantikan kandungan fail GeoJSON dalam folder `data` dengan data sebenar yang mempunyai sistem koordinat WGS84, EPSG:4326.

## Nota

KPI, carta dan layer dalam versi ini ialah data demonstrasi. Ia disediakan sebagai asas UI dan fungsi untuk integrasi data sebenar kemudian.
