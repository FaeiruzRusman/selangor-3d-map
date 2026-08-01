export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function cameraFrom(map) {
  const center = map.getCenter();
  return {
    center: [center.lng, center.lat],
    zoom: map.getZoom(),
    pitch: map.getPitch(),
    bearing: 0
  };
}

export function applyCamera(map, camera) {
  map.jumpTo({
    center: camera.center,
    zoom: camera.zoom,
    pitch: camera.pitch,
    bearing: 0
  });
}

export async function loadSvgSdf(map, name, url) {
  if (map.hasImage(name)) return;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Gagal memuatkan ikon ${name}`);

  const svg = await response.text();
  const objectUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, 64, 64);

    map.addImage(name, context.getImageData(0, 0, 64, 64), { sdf: true });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function enableMiddleMousePan(map) {
  const canvas = map.getCanvas();
  let active = false;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener("mousedown", (event) => {
    if (event.button !== 1) return;
    event.preventDefault();
    event.stopPropagation();
    active = true;
    lastX = event.clientX;
    lastY = event.clientY;
    document.body.classList.add("map-middle-pan-active");
  }, true);

  canvas.addEventListener("auxclick", (event) => {
    if (event.button === 1) event.preventDefault();
  }, true);

  window.addEventListener("mousemove", (event) => {
    if (!active) return;
    event.preventDefault();
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    map.panBy([-dx, -dy], { duration: 0, animate: false });
  }, { capture: true, passive: false });

  window.addEventListener("mouseup", (event) => {
    if (event.button !== 1) return;
    active = false;
    document.body.classList.remove("map-middle-pan-active");
  }, true);
}
