# SUO 3D GeoPortal v1.11 — Data Kesihatan Rasmi

Layer kesihatan telah diganti menggunakan shapefile rasmi yang dimuat naik.

## Sumber data

```text
Fasiliti_Kesihatan_Selangor_SHP(1).zip
```

## Proses

- CRS asal: `EPSG:3380`
- Ditukar ke: `EPSG:4326 (WGS84)`
- Jumlah feature: **87**
- Output GeoJSON:

```text
data/kesihatan/kemudahan_kesihatan_selangor.geojson
```

## Field asal yang dikesan

- Nama: `NAMA`
- Kategori: `KATEGORI`
- Daerah: `DAERAH`
- Operator: `OPERATOR`
- Sektor: `SEKTOR`
- Lokaliti: `LOKALITI`
- Status/Semakan: `SEMAKAN`

Portal menggunakan field normalisasi berikut supaya popup dan simbologi stabil:

```text
web_name
web_category
web_district
web_operator
web_sector
web_locality
web_status
```

Semua field asal shapefile masih dikekalkan dalam GeoJSON.
