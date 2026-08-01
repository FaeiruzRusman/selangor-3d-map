# SUO 3D GeoPortal v2.1 — Middle Mouse Pan

## Pembetulan sebenar

Mapbox GL JS tidak menyediakan middle mouse drag sebagai pan secara lalai.
Versi ini menambah handler khas untuk butang tengah tetikus.

## Cara guna

1. Tekan dan tahan roda tetikus.
2. Gerakkan tetikus.
3. Lepaskan roda untuk tamatkan pan.

## Pelaksanaan

- Mengesan `mousedown` dengan `button === 1`.
- Menghalang auto-scroll browser.
- Menggunakan `map.panBy()` secara terus.
- Berfungsi pada peta utama dan peta kanan split screen.
- Tidak mengganggu left-click drag, scroll zoom atau sync selepas `moveend`.
- Cursor bertukar kepada `grabbing` semasa middle-mouse pan.
