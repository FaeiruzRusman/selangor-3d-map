# SUO 3D GeoPortal v1.5 — DPN2 Urban Explorer

Versi ini menggunakan senarai bandar dan hierarki terus daripada fail:

```text
data/hierarki_bandar_selangor_dpn2.geojson
```

## Urban Explorer

Urban Explorer kini memaparkan bandar mengikut hierarki DPN2 yang terdapat dalam fail GeoJSON:

- Bandar Negeri: 1 bandar
- Bandar Utama: 8 bandar
- Bandar Tempatan: 9 bandar

Jumlah keseluruhan: **18 bandar**

Setiap butang bandar akan:

- Fly ke lokasi bandar
- Kekal menghadap utara (`bearing: 0`)
- Menggunakan pitch 3D apabila mod 3D aktif
- Boleh dipanggil melalui ChatGIS menggunakan nama bandar

## Fail konfigurasi

```text
config/urban-hierarchy.json
```

Fail ini telah dijana daripada data DPN2 dan kini menjadi sumber kepada:

- Urban Explorer
- Butang pilihan bandar
- Jumlah bandar dalam KPI
- Arahan bandar dalam ChatGIS

## Nota

Wording DPN3 telah ditukar kepada DPN2 dalam Urban Explorer kerana data sumber yang digunakan ialah layer DPN2 yang dibekalkan.
