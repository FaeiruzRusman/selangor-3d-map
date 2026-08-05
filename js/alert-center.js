const CONFIG_URL = "config/alerts.json";
const READ_STORAGE_KEY = "suoAlertReadStateV70";

const SEVERITY_META = {
  critical: {
    label: "Critical",
    icon: "●"
  },
  warning: {
    label: "Warning",
    icon: "●"
  },
  info: {
    label: "Info",
    icon: "●"
  },
  success: {
    label: "Success",
    icon: "●"
  }
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readState() {
  try {
    return JSON.parse(
      localStorage.getItem(READ_STORAGE_KEY) || "{}"
    );
  } catch (_) {
    return {};
  }
}

export class AlertCenter {
  constructor(map) {
    this.map = map;
    this.alerts = [];
    this.readState = readState();
    this.tickerIndex = 0;
    this.tickerTimer = null;

    this.feed = document.getElementById("alertFeed");
    this.count = document.getElementById("alertCount");
    this.tickerText = document.getElementById("alertTickerText");
    this.tickerDot = document.getElementById("alertTickerDot");
    this.viewAllButton = document.getElementById("viewAllAlertsBtn");
    this.drawer = document.getElementById("alertDrawer");
    this.drawerList = document.getElementById("alertDrawerList");
    this.drawerCloseButton = document.getElementById("alertDrawerCloseBtn");
    this.markAllButton = document.getElementById("markAllAlertsReadBtn");

    this.bind();
    this.load();
  }

  bind() {
    this.viewAllButton?.addEventListener("click", () => {
      this.openDrawer();
    });

    this.drawerCloseButton?.addEventListener("click", () => {
      this.closeDrawer();
    });

    this.markAllButton?.addEventListener("click", () => {
      this.alerts.forEach((alert) => {
        this.readState[alert.id] = true;
      });
      this.saveReadState();
      this.render();
    });

    this.drawer?.addEventListener("click", (event) => {
      if (event.target === this.drawer) {
        this.closeDrawer();
      }
    });
  }

  async load() {
    try {
      const response = await fetch(CONFIG_URL, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Gagal memuatkan konfigurasi alert.");
      }

      const config = await response.json();
      this.alerts = Array.isArray(config.alerts)
        ? config.alerts
        : [];

      this.render();
      this.startTicker();
    } catch (error) {
      this.feed.innerHTML = `
        <div class="alert-empty">
          Alert Center tidak dapat dimuatkan.
        </div>
      `;
      console.error(error);
    }
  }

  render() {
    const unread = this.alerts.filter(
      (alert) => !this.readState[alert.id]
    ).length;

    this.count.textContent = String(unread);
    this.count.hidden = unread === 0;

    const visibleAlerts = this.alerts.slice(0, 4);
    this.feed.innerHTML = visibleAlerts
      .map((alert) => this.alertCardHtml(alert, false))
      .join("");

    this.drawerList.innerHTML = this.alerts
      .map((alert) => this.alertCardHtml(alert, true))
      .join("");

    this.bindAlertActions(this.feed);
    this.bindAlertActions(this.drawerList);
  }

  alertCardHtml(alert, detailed) {
    const meta =
      SEVERITY_META[alert.severity] ||
      SEVERITY_META.info;

    const readClass = this.readState[alert.id]
      ? "read"
      : "unread";

    return `
      <article class="alert-item severity-${escapeHtml(alert.severity)} ${readClass}"
               data-alert-id="${escapeHtml(alert.id)}">
        <div class="alert-item-header">
          <span class="alert-severity-dot"
                title="${escapeHtml(meta.label)}">${meta.icon}</span>
          <div class="alert-item-copy">
            <strong>${escapeHtml(alert.title)}</strong>
            <span>${escapeHtml(alert.location)}</span>
          </div>
          <small>${escapeHtml(alert.timeLabel)}</small>
        </div>

        <p>${escapeHtml(alert.summary)}</p>

        <div class="alert-actions">
          <button type="button"
                  data-alert-action="zoom"
                  data-alert-id="${escapeHtml(alert.id)}">
            📍 Zoom
          </button>
          <button type="button"
                  data-alert-action="analysis"
                  data-alert-id="${escapeHtml(alert.id)}">
            📊 Analisis
          </button>
          <button type="button"
                  data-alert-action="assistant"
                  data-alert-id="${escapeHtml(alert.id)}">
            🤖 Tanya
          </button>
          ${detailed ? `
          <button type="button"
                  data-alert-action="read"
                  data-alert-id="${escapeHtml(alert.id)}">
            ${this.readState[alert.id] ? "Belum Baca" : "Tanda Dibaca"}
          </button>` : ""}
        </div>
      </article>
    `;
  }

  bindAlertActions(container) {
    container.querySelectorAll("[data-alert-action]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const alert = this.alerts.find(
            (item) => item.id === button.dataset.alertId
          );

          if (!alert) return;

          const action = button.dataset.alertAction;

          if (action === "zoom") {
            this.zoomToAlert(alert);
          } else if (action === "analysis") {
            this.openAnalysis(alert);
          } else if (action === "assistant") {
            this.askAssistant(alert);
          } else if (action === "read") {
            this.readState[alert.id] =
              !this.readState[alert.id];
            this.saveReadState();
            this.render();
          }

          if (action !== "read") {
            this.markRead(alert.id);
          }
        });
      });
  }

  zoomToAlert(alert) {
    if (!Array.isArray(alert.coordinates)) return;

    this.map.flyTo({
      center: alert.coordinates,
      zoom: alert.zoom || 12,
      pitch: 45,
      bearing: 0,
      duration: 1400
    });

    new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false
    })
      .setLngLat(alert.coordinates)
      .setHTML(`
        <strong>${escapeHtml(alert.title)}</strong><br>
        Lokasi: ${escapeHtml(alert.location)}<br>
        ${escapeHtml(alert.summary)}
      `)
      .addTo(this.map);
  }

  openAnalysis(alert) {
    const target = alert.analysisTarget;

    if (target === "flood") {
      document.getElementById("openFloodBtn")?.click();
      return;
    }

    if (target === "weather") {
      document.getElementById("openWeatherBtn")?.click();
      return;
    }

    if (target === "traffic") {
      const toggle = document.getElementById("trafficToggle");
      if (toggle && !toggle.checked) {
        toggle.click();
      }
      this.zoomToAlert(alert);
      return;
    }

    if (target === "schools") {
      const toggle = document.getElementById("schoolToggle");
      if (toggle && !toggle.checked) {
        toggle.click();
      }
      this.zoomToAlert(alert);
      return;
    }

    if (target === "cadastral") {
      const category = document.querySelector(
        '[data-layer-category="cadastral"]'
      );
      const content = document.querySelector(
        '[data-layer-category-content="cadastral"]'
      );

      if (
        category &&
        content &&
        content.hidden
      ) {
        category.click();
      }

      document.getElementById("cadastralLegendBtn")?.click();
      return;
    }

    this.zoomToAlert(alert);
  }

  askAssistant(alert) {
    const input = document.getElementById("chatInput");
    const form = document.getElementById("chatForm");

    if (!input || !form) return;

    input.value =
      alert.assistantPrompt ||
      `Terangkan alert ${alert.title} di ${alert.location}.`;

    input.dispatchEvent(
      new Event("input", { bubbles: true })
    );

    form.requestSubmit();
  }

  markRead(id) {
    this.readState[id] = true;
    this.saveReadState();
    this.render();
  }

  saveReadState() {
    try {
      localStorage.setItem(
        READ_STORAGE_KEY,
        JSON.stringify(this.readState)
      );
    } catch (_) {}
  }

  startTicker() {
    clearInterval(this.tickerTimer);

    const updateTicker = () => {
      if (!this.alerts.length) return;

      const alert = this.alerts[
        this.tickerIndex % this.alerts.length
      ];

      this.tickerText.textContent =
        `${alert.title} • ${alert.location}`;

      this.tickerDot.className =
        `alert-ticker-dot severity-${alert.severity}`;

      this.tickerIndex += 1;
    };

    updateTicker();
    this.tickerTimer = setInterval(updateTicker, 5000);
  }

  openDrawer() {
    this.drawer.hidden = false;
    document.body.classList.add("alert-drawer-open");
  }

  closeDrawer() {
    this.drawer.hidden = true;
    document.body.classList.remove("alert-drawer-open");
  }
}
