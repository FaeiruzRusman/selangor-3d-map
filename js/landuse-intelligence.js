const CONFIG_URL = "config/landuse-intelligence.json";

function formatNumber(value, maximumFractionDigits = 2) {
  return Number(value).toLocaleString("en-MY", {
    minimumFractionDigits: 0,
    maximumFractionDigits
  });
}

export class LandUseIntelligence {
  constructor() {
    this.elements = {
      totalArea: document.getElementById("landuseTotalArea"),
      builtArea: document.getElementById("landuseBuiltArea"),
      builtPercent: document.getElementById("landuseBuiltPercent"),
      nonBuiltArea: document.getElementById("landuseNonBuiltArea"),
      nonBuiltPercent: document.getElementById("landuseNonBuiltPercent"),
      dominantName: document.getElementById("landuseDominantName"),
      dominantArea: document.getElementById("landuseDominantArea"),
      builtBar: document.querySelector(".landuse-share-built"),
      nonBuiltBar: document.querySelector(".landuse-share-non-built")
    };

    this.load();
  }

  async load() {
    try {
      const response = await fetch(CONFIG_URL, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Gagal memuatkan data Land Use Intelligence.");
      }

      const data = await response.json();
      this.render(data);
    } catch (error) {
      console.warn(error);
    }
  }

  render(data) {
    const built = data.built_up || {};
    const nonBuilt = data.non_built_up || {};
    const dominant = data.dominant_category || {};

    if (this.elements.totalArea) {
      this.elements.totalArea.textContent =
        formatNumber(data.total_area_ha);
    }

    if (this.elements.builtArea) {
      this.elements.builtArea.textContent =
        `${formatNumber(built.area_ha)} ha`;
    }

    if (this.elements.builtPercent) {
      this.elements.builtPercent.textContent =
        `${formatNumber(built.percent)}%`;
    }

    if (this.elements.nonBuiltArea) {
      this.elements.nonBuiltArea.textContent =
        `${formatNumber(nonBuilt.area_ha)} ha`;
    }

    if (this.elements.nonBuiltPercent) {
      this.elements.nonBuiltPercent.textContent =
        `${formatNumber(nonBuilt.percent)}%`;
    }

    if (this.elements.dominantName) {
      this.elements.dominantName.textContent =
        dominant.name || "-";
    }

    if (this.elements.dominantArea) {
      this.elements.dominantArea.textContent =
        `${formatNumber(dominant.area_ha)} ha`;
    }

    if (this.elements.builtBar) {
      this.elements.builtBar.style.width =
        `${Number(built.percent) || 0}%`;
    }

    if (this.elements.nonBuiltBar) {
      this.elements.nonBuiltBar.style.width =
        `${Number(nonBuilt.percent) || 0}%`;
    }
  }
}
