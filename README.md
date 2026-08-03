# SUO GeoPortal v4.0A — Modular Architecture

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


## Weather Intelligence

Modul baharu:

```text
js/weather.js
```

Sumber ramalan:

```text
https://api.open-meteo.com/v1/forecast
```

Sumber amaran rasmi:

```text
https://api.data.gov.my/weather/warning
```

Maklumat yang dipaparkan:

- Keadaan cuaca semasa
- Suhu
- Suhu terasa
- Kelembapan
- Hujan
- Kelajuan angin
- UV
- Jarak penglihatan
- Tekanan udara
- Matahari terbit dan terbenam
- Ramalan 24 jam
- Ramalan 7 hari
- Pautan radar hujan METMalaysia
- Amaran cuaca rasmi METMalaysia
- Parameter suhu, hujan, angin dan kelembapan

Weather Intelligence akan berubah mengikut bandar yang dipilih dalam Urban Explorer
atau Urban Tour. Pengguna juga boleh memilih `Pusat Peta`.


## Flood Intelligence — Fasa 1

Modul baharu:

```text
js/flood.js
```

Komponen:

- Ramalan hujan 24 jam bagi semua bandar DPN2
- Layer titik ramalan hujan pada peta
- Ranking bandar mengikut jumlah hujan
- Amaran banjir masa nyata daripada data.gov.my
- Pautan operasi paras sungai dan hujan Public InfoBanjir JPS
- Pautan semakan PPS aktif JKM
- Pautan Portal Bencana NADMA
- Ruang risiko banjir statik yang menunggu layer hazard rasmi

### Penting

Ramalan hujan 24 jam ialah indikator meteorologi awal dan **bukan**
ramalan bahawa sesuatu kawasan pasti akan banjir.

### Sumber API

```text
https://api.open-meteo.com/v1/forecast
https://api.data.gov.my/flood-warning
```

### Sumber operasi

```text
https://publicinfobanjir.water.gov.my/
https://infobencanajkmv2.jkm.gov.my/
https://portalbencana.nadma.gov.my/
```

### Layer risiko statik akan datang

Apabila data rasmi dibekalkan, gunakan lokasi:

```text
data/banjir/risiko_banjir_selangor.geojson
```


## Sempadan PBT Negeri Selangor 2024

Sumber asal:

```text
Sempadan_PBT_Negeri_Selangor_2024.shp
```

Proses:

- CRS asal: EPSG:3380 — GDM2000 / Cassini Selangor
- CRS portal: EPSG:4326 — WGS84
- Jumlah feature: 12 PBT
- Field nama: `NAMA_PBT`
- Field kategori: `KATEGORI`

Fail output:

```text
data/pentadbiran/sempadan_pbt_selangor_2024.geojson
```

Fungsi:

- Fill poligon lutsinar
- Garisan sempadan biru
- Label nama PBT
- Toggle dalam Layer Management
- Dropdown legend
- Popup nama, kategori, keluasan dan tahun data
- Berfungsi pada peta utama serta split screen


## Layer Management Baharu

Susunan utama:

1. Hierarki Bandar DPN2
2. Kemudahan
   - Kesihatan
   - Keselamatan
3. Flood Intelligence Fasa 1
4. Live Traffic

Kategori tambahan dikekalkan selepas susunan utama:

- Pentadbiran
  - Sempadan PBT Selangor 2024
- Peta Asas
  - Terrain 3D
  - Bangunan 3D

Setiap kategori boleh dibuka atau ditutup secara berasingan.

## Ask Mr. TPr. SUO

Nama `AI CHATGIS` telah ditukar kepada:

```text
Ask Mr. TPr. SUO
```

Subtajuk:

```text
Pembantu AI Perancangan Bandar
```

Input turut ditukar kepada `Tanya Mr. TPr. SUO...`.


## Pembetulan Label PBT

Versi ini dibina semula daripada v3.6.

- Label asal Mapbox dikekalkan dan dihidupkan.
- Poligon PBT masih digunakan untuk fill, sempadan dan popup.
- Label PBT tidak lagi dijana terus daripada poligon.
- Satu `representative_point` dijana untuk setiap PBT.
- Jumlah label PBT SUO: tepat 12 label, satu bagi setiap PBT.
- Pembetulan turut digunakan pada split screen melalui modul `layers.js`.

Fail baharu:

```text
data/pentadbiran/label_pbt_selangor_2024.geojson
```

Struktur sumber:

```text
sempadan_pbt_selangor_2024.geojson   → fill, line dan popup
label_pbt_selangor_2024.geojson      → satu label bagi setiap PBT
```

Label Mapbox tidak dimatikan dalam versi ini.


## Collapsible Workspace

Kolum kiri dan kanan kini boleh dibuka atau disimpan secara berasingan.

### Kawalan

- `◀` pada kolum kiri — simpan kolum kiri
- `▶` pada kolum kanan — simpan kolum kanan
- Tab `Layer & Navigasi` — buka semula kolum kiri
- Tab `Intelligence` — buka semula kolum kanan
- `Focus Map` — simpan kedua-dua kolum
- `Restore Panels` — pulihkan keadaan sebelum Focus Map

### Penyimpanan keadaan

Keadaan panel disimpan dalam browser menggunakan:

```text
localStorage key:
suoWorkspacePanelStateV39
```

Apabila portal dibuka semula, keadaan terakhir kolum akan dipulihkan.

### Mapbox resize

Peta utama dan peta split screen memanggil `resize()` selepas perubahan
layout untuk memastikan canvas memenuhi ruang baharu.


## Ask Mr. TPr. SUO — Local Spatial Query Engine

Modul baharu:

```text
js/
├── intent-parser.js
├── spatial-query.js
├── map-actions.js
└── ai-assistant.js
```

### Fungsi v4.0A

- Kiraan kemudahan kesihatan mengikut kategori dan daerah
- Kiraan kemudahan kesihatan dalam sempadan PBT menggunakan point-in-polygon
- Filter hospital kerajaan dan swasta
- Kiraan IPK dan IPD
- Kiraan PBT dan bandar DPN2
- Keluasan PBT
- Highlight hasil query
- Zoom kepada hasil
- Popup keputusan PBT
- Buka dan tutup layer
- Arahan 2D dan 3D
- Buka split screen
- Kawal kolum kiri dan kanan
- Focus Map
- Navigasi bandar hanya digunakan sebagai fallback selepas query data diperiksa

### Contoh arahan

```text
Berapa hospital di daerah Klang?
Berapa hospital kerajaan di Petaling?
Berapa klinik kesihatan dalam MBSA?
Berapa IPD di Selangor?
Keluasan MBSA
Berapa PBT di Selangor?
Tunjukkan semua hospital
Buka Live Traffic
Matikan Flood Intelligence
Tukar ke 2D
Buka split screen
Tutup kolum kiri
```

### Data tempatan

Engine ini membaca terus GeoJSON portal dan tidak memerlukan API AI berbayar.

```text
data/kesihatan/kemudahan_kesihatan_selangor.geojson
data/keselamatan/ipk_ipd_selangor.geojson
data/pentadbiran/sempadan_pbt_selangor_2024.geojson
data/hierarki_bandar_selangor_dpn2.geojson
```

### Had v4.0A

- Pemahaman bahasa masih berasaskan parser arahan terkawal.
- Analisis daerah kesihatan menggunakan atribut `web_district`.
- Analisis dalam PBT menggunakan point-in-polygon.
- Buffer, radius, nearest facility dan query GTN1 akan dibangunkan dalam v4.0B.
