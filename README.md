# SUO GeoPortal v4.3 — Modular Architecture

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


## Pentadbiran

Kategori Pentadbiran kini mengandungi:

- Sempadan PBT
- Sempadan Daerah

### Sempadan Daerah

Sumber asal:

```text
DAERAH_SELANGOR_2024.shp
```

Pemprosesan:

- CRS asal: EPSG:3375
- CRS portal: EPSG:4326
- Jumlah daerah: 9
- Field nama asal: `NAM`
- Field kod daerah: `daerah_id`
- Field keluasan: `Hektar`
- `ULU SELANGOR` dinormalkan kepada `Hulu Selangor`
- `ULU LANGAT` dinormalkan kepada `Hulu Langat`

Fail output:

```text
data/pentadbiran/sempadan_daerah_selangor.geojson
data/pentadbiran/label_daerah_selangor.geojson
```

Fungsi:

- Fill poligon ungu lutsinar
- Garisan sempadan ungu putus-putus
- Satu label bagi setiap daerah
- Toggle dan dropdown legend
- Popup nama, kod dan keluasan
- Peta utama dan split screen
- Arahan Ask Mr. TPr. SUO untuk buka/tutup Sempadan Daerah


## District Spatial Query

Ask Mr. TPr. SUO kini disambungkan terus kepada poligon sempadan daerah.

Pertanyaan yang disokong:

```text
Berapa daerah di Selangor?
Keluasan Daerah Klang
Tunjukkan Daerah Petaling
Zoom ke Daerah Gombak
Berapa hospital di Daerah Klang?
Berapa klinik kesihatan dalam Daerah Petaling?
Berapa IPD di Daerah Hulu Langat?
Tunjukkan semua sempadan daerah
Buka Sempadan Daerah
Matikan Sempadan Daerah
```

### Kaedah query

- Kiraan dan keluasan daerah membaca terus layer sempadan daerah.
- Query kesihatan mengikut daerah menggunakan point-in-polygon.
- Query IPK/IPD mengikut daerah menggunakan point-in-polygon.
- Jika poligon daerah gagal ditemui, sistem menggunakan atribut daerah sebagai fallback.
- Hasil query di-highlight dan peta dizum kepada hasil.

### Data

```text
data/pentadbiran/sempadan_daerah_selangor.geojson
data/pentadbiran/label_daerah_selangor.geojson
```


## Perbandingan Keluasan Antara Layer

Ask Mr. TPr. SUO kini boleh membandingkan keluasan antara:

- Sempadan Daerah
- Sempadan PBT

Contoh:

```text
Beza luas Daerah Sabak Bernam dan Majlis Daerah Sabak Bernam
```

Sistem akan:

1. Mengesan intent `compareArea`.
2. Membaca poligon Daerah Sabak Bernam.
3. Membaca poligon Majlis Daerah Sabak Bernam.
4. Mengambil atribut `web_area` daripada kedua-dua layer.
5. Mengira beza mutlak.
6. Mengira peratus perbezaan berbanding kawasan yang lebih kecil.
7. Highlight kedua-dua poligon.
8. Zoom kepada kawasan perbandingan.

Semakan data semasa:

```text
Daerah Sabak Bernam: 107,810.51 hektar
Majlis Daerah Sabak Bernam: 99,812.09 hektar
Perbezaan: 7,998.42 hektar
Peratus perbezaan: 8.01%
```


## Kemudahan Pendidikan

Layer baharu:

```text
Kemudahan
├── Kesihatan
├── Keselamatan
└── Pendidikan
```

Data sekolah:

```text
data/pendidikan/sekolah_negeri_selangor.geojson
```

Ringkasan:

- Jumlah sekolah: 945
- Sekolah Rendah: 664
- Sekolah Menengah: 281
- CRS asal: EPSG:4326
- Field nama asal: `Nama_Sekol`
- Field PPD: `PPD`
- Field PBT: `PBT`
- Field jenis warta: `JenisWarta`
- Field tahap: `Tahap_Seko`

Medan portal:

```text
web_name
web_type
web_level
web_ppd
web_district
web_pbt
```

Ask Mr. TPr. SUO kini menyokong:

```text
Berapa sekolah di Daerah Klang?
Berapa sekolah rendah di Daerah Petaling?
Berapa sekolah menengah dalam MBSA?
Tunjukkan semua sekolah rendah
Cari SEKOLAH MENENGAH KEBANGSAAN SEKSYEN 7
Buka Pendidikan
Matikan sekolah
```

Query daerah menggunakan point-in-polygon dengan layer sempadan daerah.
Query PBT menggunakan kod PBT pada atribut sekolah seperti `MBSA`, `MBPJ`
dan lain-lain. Hasil query akan di-highlight dan peta dizum kepada hasil.


## Smart Search

Carian lokasi biasa telah dinaik taraf kepada carian seluruh GeoPortal.

Modul:

```text
js/smart-search.js
```

Smart Search mengindeks:

- Bandar DPN2
- Sempadan PBT
- Sempadan Daerah
- Hospital dan klinik
- Sekolah
- IPK dan IPD

Jika hasil tempatan tidak mencukupi, carian akan turut menggunakan Mapbox
Geocoding untuk lokasi umum di Malaysia.

### Fungsi

- Carian semasa pengguna menaip
- Pengelompokan keputusan mengikut layer
- Skor padanan nama dan atribut
- Navigasi menggunakan anak panah atas/bawah
- Enter untuk memilih hasil
- Escape untuk menutup keputusan
- Highlight feature SUO
- Auto-zoom
- Popup atribut
- Butang kosongkan carian
- Sokongan geometri Point, Polygon dan MultiPolygon

### Contoh

```text
Shah Alam
MBSA
Daerah Klang
Hospital Shah Alam
Klinik Kesihatan Meru
SMK Seksyen 7
IPD Klang
Majlis Perbandaran Kajang
```


## Standardised Popup Theme

Semua popup Mapbox kini menggunakan satu tema SUO yang seragam:

- Latar putih
- Tajuk hampir hitam (`#111827`)
- Kandungan dark grey (`#374151`)
- Butang tutup dark grey
- Pointer popup putih
- Border dan shadow yang konsisten
- Saiz responsif untuk skrin kecil

Tema ini digunakan secara global kepada popup daripada:

- Bandar DPN2
- Sempadan PBT
- Sempadan Daerah
- Kesihatan
- Keselamatan
- Pendidikan
- Smart Search
- Flood Intelligence
- Hasil Ask Mr. TPr. SUO

CSS semantik untuk pembangunan seterusnya turut disediakan:

```text
.suo-popup
.suo-popup-title
.suo-popup-row
```
