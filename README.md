# SUO GeoPortal v3.2 — Modular Architecture

## Struktur JavaScript

```text
js/
├── app.js
├── config.js
├── utils.js
├── layers.js
├── urban-explorer.js
├── urban-tour.js
└── compare.js
```

## Urban Tour Engine

Urban Tour membaca terus `config/urban-hierarchy.json` dan bergerak mengikut susunan:

1. Bandar Negeri
2. Bandar Utama
3. Bandar Tempatan

Fungsi:

- Play automatik
- Pause dan sambung
- Next dan previous
- Stop
- Kad nama bandar, hierarki dan daerah
- Progress bar
- Kamera sentiasa menghadap utara
- Tamat dengan zoom keluar Selangor

## Fungsi teras

- Urban Explorer DPN2
- 2D dan 3D
- Split screen
- Middle mouse pan
- Layer Hierarki Bandar DPN2
- Kemudahan Kesihatan Negeri Selangor
- Dropdown legend
- Search
- Geolocation
- ChatGIS asas

Upload semua fail dan folder ke GitHub Pages. Oleh sebab v3.0 menggunakan ES modules, portal perlu dibuka melalui GitHub Pages atau web server, bukan terus melalui `file://`.


## Live Traffic

Sumber:

```text
mapbox://mapbox.mapbox-traffic-v1
```

Source layer:

```text
traffic
```

Kategori kesesakan:

- low — Lancar
- moderate — Sederhana
- heavy — Sesak
- severe — Sangat Sesak
- lain-lain — Tiada Maklumat

Layer ini dimuatkan pada peta utama dan split screen melalui modul `layers.js`.


## Keselamatan Awam

Layer ini hanya mengandungi:

- IPK: 2 lokasi
- IPD: 15 lokasi

Dikecualikan:

- Balai Polis
- Balai Trafik
- Pondok Polis Komuniti
- Rekod BALAI/UNIT lain

Fail data:

```text
data/keselamatan/ipk_ipd_selangor.geojson
```

Simbol:

- IPK — bangunan polis biru gelap dan lebih besar
- IPD — bangunan polis biru
