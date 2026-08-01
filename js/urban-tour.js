import { wait } from "./utils.js";

export class UrbanTour {
  constructor(map, cities, onSelect) {
    this.map = map;
    this.cities = cities;
    this.onSelect = onSelect;
    this.index = 0;
    this.running = false;
    this.paused = false;
    this.stopRequested = false;

    this.panel = document.getElementById("tourPanel");
    this.cityName = document.getElementById("tourCityName");
    this.hierarchy = document.getElementById("tourHierarchy");
    this.district = document.getElementById("tourDistrict");
    this.counter = document.getElementById("tourCounter");
    this.status = document.getElementById("tourStatus");
    this.progress = document.getElementById("tourProgressBar");
    this.pauseBtn = document.getElementById("tourPauseBtn");

    document.getElementById("tourPrevBtn").addEventListener("click", () => this.previous());
    document.getElementById("tourNextBtn").addEventListener("click", () => this.next());
    document.getElementById("tourStopBtn").addEventListener("click", () => this.stop());
    document.getElementById("tourCloseBtn").addEventListener("click", () => this.stop());
    this.pauseBtn.addEventListener("click", () => this.togglePause());
  }

  async start() {
    if (!this.cities.length || this.running) return;

    this.panel.hidden = false;
    this.running = true;
    this.paused = false;
    this.stopRequested = false;
    this.index = 0;
    this.pauseBtn.textContent = "⏸ Pause";

    while (this.running && !this.stopRequested && this.index < this.cities.length) {
      await this.visit(this.index);

      while (this.paused && this.running) await wait(200);
      if (!this.running || this.stopRequested) break;

      await wait(2200);
      while (this.paused && this.running) await wait(200);

      this.index += 1;
    }

    if (this.running && !this.stopRequested) {
      this.status.textContent = "Tour selesai";
      await wait(1000);
      this.map.flyTo({
        center: [101.48, 3.18],
        zoom: 8.6,
        pitch: 42,
        bearing: 0,
        duration: 2600
      });
    }

    this.running = false;
  }

  async visit(index) {
    const city = this.cities[index];
    if (!city) return;

    this.index = index;
    this.cityName.textContent = city.name;
    this.hierarchy.textContent = city.hierarchy || "Hierarki";
    this.district.textContent = city.district || city.daerah || "Selangor";
    this.counter.textContent = `${index + 1} / ${this.cities.length}`;
    this.status.textContent = "Menuju bandar";
    this.progress.style.width = `${((index + 1) / this.cities.length) * 100}%`;

    this.onSelect?.(city);

    await new Promise((resolve) => {
      this.map.once("moveend", resolve);
      this.map.flyTo({
        center: city.center,
        zoom: city.zoom ?? 14.2,
        pitch: 64,
        bearing: 0,
        duration: 2600,
        essential: true
      });
    });

    this.status.textContent = "Hentian semasa";
  }

  togglePause() {
    if (!this.running) return;
    this.paused = !this.paused;
    this.pauseBtn.textContent = this.paused ? "▶ Sambung" : "⏸ Pause";
    this.status.textContent = this.paused ? "Dijeda" : "Disambung";
  }

  next() {
    if (!this.cities.length) return;
    this.index = Math.min(this.index + 1, this.cities.length - 1);
    return this.visit(this.index);
  }

  previous() {
    if (!this.cities.length) return;
    this.index = Math.max(this.index - 1, 0);
    return this.visit(this.index);
  }

  stop() {
    this.running = false;
    this.stopRequested = true;
    this.paused = false;
    this.panel.hidden = true;
  }
}
