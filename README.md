# SUO 3D GeoPortal v1.3 — DPN3 Ready + 2D/3D

Versi ini menukar modul lokasi bandar kepada **Urban Explorer berasaskan konfigurasi**.

## Prinsip utama

- Hanya bandar yang disahkan dalam **Dasar Perbandaran Negara Ketiga (DPN3)** boleh dimasukkan.
- Tiada bandar andaian atau senarai DPN2 dimasukkan sebagai ganti.
- Orientasi peta sentiasa menghadap utara (`bearing: 0`).
- Bandar, hierarki, koordinat dan tahap zoom dibaca daripada:

```text
config/urban-hierarchy.json
```

## Status semasa

Fail konfigurasi bandar sengaja dikosongkan kerana senarai bandar rasmi DPN3 belum dimasukkan ke dalam projek ini. Portal akan memaparkan notis dan tidak menghasilkan butang bandar palsu.

## Format konfigurasi selepas senarai rasmi diperoleh

```json
{
  "metadata": {
    "title": "Hierarki Bandar Selangor - DPN3",
    "policy": "Dasar Perbandaran Negara Ketiga (DPN3)",
    "status": "official",
    "official_only": true
  },
  "groups": [
    {
      "name": "Nama hierarki rasmi DPN3",
      "cities": [
        {
          "key": "nama-bandar",
          "name": "Nama Bandar",
          "center": [101.0000, 3.0000],
          "zoom": 14,
          "pitch": 62,
          "aliases": ["nama alternatif"]
        }
      ]
    }
  ]
}
```

## Fail utama

```text
index.html
styles.css
app.js
config/urban-hierarchy.json
data/
```

## GitHub Pages

Upload semua fail dan folder, kemudian aktifkan:

```text
Settings → Pages → Deploy from a branch → main → /root
```

## Nota

Apabila dokumen rasmi DPN3 dan senarai bandar Selangor diperoleh, hanya `config/urban-hierarchy.json` perlu dikemas kini. `app.js`, Urban Explorer, KPI bandar dan arahan ChatGIS akan berubah secara automatik.


## Pilihan paparan 2D dan 3D

Portal menyediakan dua mod paparan:

- **3D** — mod default, pitch 60°, terrain dan objek bangunan 3D mengikut tetapan layer.
- **2D** — pitch 0°, bearing utara, terrain dimatikan dan objek bangunan 3D disembunyikan.

Butang pilihan berada di bahagian atas peta bersebelahan pemilih basemap.

Arahan ChatGIS yang turut disokong:

```text
paparan 2D
paparan 3D
mod 2D
mod 3D
```
