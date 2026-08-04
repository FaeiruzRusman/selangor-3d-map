# Penerbitan Lot Kadaster Selangor 2023

## Kenapa Vector Tile diperlukan

Data asal mempunyai:

- 1,350,128 poligon lot
- SHP: kira-kira 186.49 MB
- DBF: kira-kira 767.40 MB
- CRS: GDM2000 Cassini Selangor

Memuatkan data ini sebagai GeoJSON dalam GitHub Pages akan menyebabkan masa
muat turun yang sangat lama dan penggunaan memori browser yang tinggi.

## Medan yang disyorkan untuk diterbitkan

Simpan hanya medan yang diperlukan untuk paparan dan popup:

```text
DAERAH
MUKIM
SEKSYEN
LOT
UPI
KELUASAN
KOD_KEGUNA
STATUS
NOFAILUKUR
TARIKH_KEM
```

Jangan terbitkan ke portal awam:

```text
NAMAPEMILI
ALAMATPEMI
```

Medan pemilik dan alamat perlu dikeluarkan sebelum penerbitan bagi menjaga
privasi serta kawalan akses data.

## Pilihan A — ArcGIS Online / ArcGIS Enterprise Vector Tile

1. Buka `NDCDB_SELANGOR.shp` dalam ArcGIS Pro.
2. Project data kepada WGS 1984 Web Mercator Auxiliary Sphere.
3. Buang medan pemilik dan alamat daripada layer penerbitan.
4. Tetapkan visibility range:
   - minimum sekitar zoom 11 atau 12;
   - label nombor lot sekitar zoom 16.
5. Gunakan `Share As Web Layer`.
6. Pilih jenis `Vector Tile`.
7. Terbitkan ke ArcGIS Online atau Portal for ArcGIS.
8. Dapatkan template tile PBF daripada service.
9. Masukkan template tersebut dalam:

```text
config/cadastral-layer.json
```

Contoh konfigurasi:

```json
{
  "enabled": true,
  "sourceType": "vectorTiles",
  "tiles": [
    "https://SERVER/arcgis/rest/services/NDCDB_SELANGOR_2023/VectorTileServer/tile/{z}/{y}/{x}.pbf"
  ],
  "sourceLayer": "NDCDB_SELANGOR",
  "minzoom": 11,
  "maxzoom": 22
}
```

Nama `sourceLayer` mesti sama dengan nama layer di dalam vector tile.

## Pilihan B — Mapbox Tileset

Selepas data diterbitkan sebagai Mapbox Tileset:

```json
{
  "enabled": true,
  "sourceType": "mapboxTileset",
  "url": "mapbox://USERNAME.TILESET_ID",
  "sourceLayer": "NDCDB_SELANGOR",
  "minzoom": 11,
  "maxzoom": 22
}
```

## Semakan dalam portal

Selepas URL dikonfigurasi:

1. Buka Layer Management.
2. Buka kategori `Lot Kadaster`.
3. Aktifkan `Lot Kadaster Selangor 2023`.
4. Zoom masuk sekurang-kurangnya ke zoom 11.
5. Klik lot untuk melihat popup.
6. Pada Compare Mode, aktifkan Lot Kadaster secara berasingan bagi Left atau
   Right Map.

## Susunan Layer Management

```text
Live Traffic
Lot Kadaster
Pentadbiran
  ├── Sempadan PBT
  └── Sempadan Daerah
Basemap & 3D
```
