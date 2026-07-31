# Selangor 3D GeoPortal

Laman web pemetaan 3D statik menggunakan **Mapbox GL JS**, sesuai diterbitkan melalui **GitHub Pages**.

## Fungsi

- Bangunan dan objek 3D Mapbox Standard
- Terrain 3D
- Mod siang/malam
- Carian lokasi di Malaysia
- Lokasi pilihan
- Paparan koordinat apabila peta diklik
- Kawalan zoom, pitch, putaran, skrin penuh dan geolokasi
- Susun atur responsif untuk desktop dan telefon

## Cara guna

1. Daftar atau log masuk ke Mapbox.
2. Salin **Public Access Token** yang bermula dengan `pk.`.
3. Buka `app.js` dan gantikan:

```js
const DEFAULT_TOKEN = "PASTE_YOUR_MAPBOX_PUBLIC_TOKEN_HERE";
```

4. Buka `index.html` menggunakan Live Server untuk ujian tempatan.

Token juga boleh dimasukkan melalui kotak tetapan ketika laman dibuka. Kaedah itu menyimpan token dalam `localStorage` pelayar.

## Terbitkan melalui GitHub Pages

1. Cipta repository baharu di GitHub, contohnya `selangor-3d-map`.
2. Muat naik `index.html`, `style.css`, `app.js` dan `README.md` ke root repository.
3. Pergi ke **Settings > Pages**.
4. Pilih sumber penerbitan daripada branch `main` dan folder `/root`, kemudian simpan.
5. Laman biasanya tersedia pada alamat:

```text
https://USERNAME.github.io/selangor-3d-map/
```

## Keselamatan token

Mapbox public token memang digunakan pada bahagian klien. Walau bagaimanapun, dalam Mapbox Account, hadkan token kepada URL GitHub Pages anda, contohnya:

```text
https://USERNAME.github.io/selangor-3d-map/*
```

## Ubah lokasi awal

Dalam `app.js`, ubah `START_VIEW`:

```js
const START_VIEW = {
  center: [101.5183, 3.0738],
  zoom: 12.5,
  pitch: 62,
  bearing: -20
};
```
