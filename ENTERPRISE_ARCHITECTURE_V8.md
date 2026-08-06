# SUO GeoPortal v8.0 Enterprise Refactor

## Struktur

```text
js/
├── app.js
├── core/
│   └── map-engine.js
├── ui/
│   └── workspace-controller.js
├── intelligence/
│   └── intelligence-hub.js
├── layers.js
├── compare.js
├── network-intelligence.js
├── weather.js
├── flood.js
├── executive-landuse.js
├── ai-assistant.js
└── spatial-tools.js
```

## Prinsip

1. `app.js` mengorkestrasi modul dan tidak lagi mendeklarasikan elemen UI yang sama dua kali.
2. Penciptaan Mapbox dipusatkan dalam `core/map-engine.js`.
3. Panel kiri dan kanan dikawal oleh `ui/workspace-controller.js`.
4. Modul Urban Intelligence dimulakan melalui `intelligence/intelligence-hub.js`.
5. Kegagalan satu intelligence module tidak menghentikan peta utama.
6. Susunan panel kanan dikawal melalui Component Registry.
7. Bootstrap Mapbox mempunyai CDN fallback dan paparan ralat yang jelas.
