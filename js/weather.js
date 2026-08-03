const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const MET_WARNING_URL = "https://api.data.gov.my/weather/warning";

const WEATHER_CODES = {
  0: ["Cerah", "☀"],
  1: ["Cerah berawan", "🌤"],
  2: ["Berawan", "⛅"],
  3: ["Mendung", "☁"],
  45: ["Berkabus", "🌫"],
  48: ["Kabut beku", "🌫"],
  51: ["Gerimis ringan", "🌦"],
  53: ["Gerimis", "🌦"],
  55: ["Gerimis lebat", "🌧"],
  61: ["Hujan ringan", "🌦"],
  63: ["Hujan", "🌧"],
  65: ["Hujan lebat", "🌧"],
  80: ["Hujan seketika", "🌦"],
  81: ["Hujan sederhana", "🌧"],
  82: ["Hujan lebat", "⛈"],
  95: ["Ribut petir", "⛈"],
  96: ["Ribut petir", "⛈"],
  99: ["Ribut petir kuat", "⛈"]
};

function weatherLabel(code) {
  return WEATHER_CODES[code] || ["Keadaan cuaca", "☁"];
}

function formatTime(value) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("ms-MY", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDate(value, options = {}) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("ms-MY", {
    weekday: options.short ? "short" : "long",
    day: "2-digit",
    month: "short"
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export class WeatherIntelligence {
  constructor(map) {
    this.map = map;
    this.location = {
      name: "Shah Alam",
      latitude: 3.0738,
      longitude: 101.5183
    };
    this.latestForecast = null;

    this.panel = document.getElementById("weatherPanel");
    this.loading = document.getElementById("weatherLoading");
    this.content = document.getElementById("weatherContent");
    this.error = document.getElementById("weatherError");

    document.getElementById("openWeatherBtn")
      .addEventListener("click", () => this.open());

    document.getElementById("weatherCloseBtn")
      .addEventListener("click", () => this.close());

    document.getElementById("weatherRefreshBtn")
      .addEventListener("click", () => this.load());

    document.getElementById("weatherUseMapCenterBtn")
      .addEventListener("click", () => {
        const center = this.map.getCenter();
        this.setLocation({
          name: "Pusat Peta",
          latitude: center.lat,
          longitude: center.lng
        });
      });

    document.querySelectorAll("[data-weather-focus]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          document.querySelectorAll("[data-weather-focus]")
            .forEach((item) => item.classList.remove("active"));
          button.classList.add("active");
        });
      });

    window.addEventListener("suo:location-change", (event) => {
      const detail = event.detail || {};
      if (!Array.isArray(detail.center)) return;

      this.setLocation({
        name: detail.name || "Lokasi dipilih",
        longitude: Number(detail.center[0]),
        latitude: Number(detail.center[1])
      });
    });

    this.load();
  }

  open() {
    this.panel.hidden = false;
    requestAnimationFrame(() => this.panel.classList.add("visible"));
  }

  close() {
    this.panel.classList.remove("visible");
    setTimeout(() => {
      this.panel.hidden = true;
    }, 180);
  }

  setLocation(location) {
    this.location = location;
    this.load();
  }

  buildForecastUrl() {
    const url = new URL(OPEN_METEO_URL);

    url.searchParams.set("latitude", this.location.latitude);
    url.searchParams.set("longitude", this.location.longitude);
    url.searchParams.set("timezone", "Asia/Kuala_Lumpur");
    url.searchParams.set("forecast_days", "7");

    url.searchParams.set(
      "current",
      [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "precipitation",
        "weather_code",
        "surface_pressure",
        "wind_speed_10m",
        "wind_direction_10m"
      ].join(",")
    );

    url.searchParams.set(
      "hourly",
      [
        "temperature_2m",
        "apparent_temperature",
        "relative_humidity_2m",
        "precipitation_probability",
        "precipitation",
        "weather_code",
        "visibility",
        "surface_pressure",
        "wind_speed_10m",
        "uv_index"
      ].join(",")
    );

    url.searchParams.set(
      "daily",
      [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_probability_max",
        "sunrise",
        "sunset",
        "uv_index_max",
        "wind_speed_10m_max"
      ].join(",")
    );

    return url.toString();
  }

  async load() {
    this.showLoading();

    document.getElementById("weatherLocationName").textContent =
      this.location.name;

    document.getElementById("weatherCoordinates").textContent =
      `${this.location.latitude.toFixed(4)}, ${this.location.longitude.toFixed(4)}`;

    document.getElementById("weatherQuickLocation").textContent =
      this.location.name;

    try {
      const [forecastResult, warningResult] = await Promise.allSettled([
        fetch(this.buildForecastUrl()).then((response) => {
          if (!response.ok) throw new Error("Ramalan cuaca tidak tersedia.");
          return response.json();
        }),
        fetch(`${MET_WARNING_URL}?limit=30`).then((response) => {
          if (!response.ok) throw new Error("Amaran METMalaysia tidak tersedia.");
          return response.json();
        })
      ]);

      if (forecastResult.status !== "fulfilled") {
        throw forecastResult.reason;
      }

      this.latestForecast = forecastResult.value;
      this.renderForecast(this.latestForecast);

      if (warningResult.status === "fulfilled") {
        this.renderWarnings(warningResult.value);
      } else {
        this.renderWarnings([]);
      }

      this.showContent();
    } catch (error) {
      this.showError(error?.message || "Weather Intelligence gagal dimuatkan.");
    }
  }

  showLoading() {
    this.loading.hidden = false;
    this.content.hidden = true;
    this.error.hidden = true;
  }

  showContent() {
    this.loading.hidden = true;
    this.content.hidden = false;
    this.error.hidden = true;
  }

  showError(message) {
    this.loading.hidden = true;
    this.content.hidden = true;
    this.error.hidden = false;
    this.error.textContent = message;
  }

  renderForecast(data) {
    const current = data.current || {};
    const daily = data.daily || {};
    const hourly = data.hourly || {};
    const [condition, icon] = weatherLabel(current.weather_code);

    const currentHourIndex = this.findNearestHourIndex(
      hourly.time || [],
      current.time
    );

    const visibilityKm = currentHourIndex >= 0
      ? Number(hourly.visibility?.[currentHourIndex] || 0) / 1000
      : null;

    const uv = currentHourIndex >= 0
      ? hourly.uv_index?.[currentHourIndex]
      : daily.uv_index_max?.[0];

    document.getElementById("weatherMainIcon").textContent = icon;
    document.getElementById("weatherCurrentTemp").textContent =
      `${Math.round(current.temperature_2m ?? 0)}°C`;
    document.getElementById("weatherCurrentCondition").textContent = condition;
    document.getElementById("weatherFeelsLike").textContent =
      `Terasa seperti ${Math.round(current.apparent_temperature ?? 0)}°C`;

    document.getElementById("weatherHumidity").textContent =
      `${Math.round(current.relative_humidity_2m ?? 0)}%`;
    document.getElementById("weatherRain").textContent =
      `${Number(current.precipitation ?? 0).toFixed(1)} mm`;
    document.getElementById("weatherWind").textContent =
      `${Math.round(current.wind_speed_10m ?? 0)} km/j`;
    document.getElementById("weatherUv").textContent =
      uv == null ? "--" : Number(uv).toFixed(1);
    document.getElementById("weatherVisibility").textContent =
      visibilityKm == null ? "--" : `${visibilityKm.toFixed(1)} km`;
    document.getElementById("weatherPressure").textContent =
      `${Math.round(current.surface_pressure ?? 0)} hPa`;
    document.getElementById("weatherSunrise").textContent =
      formatTime(daily.sunrise?.[0]);
    document.getElementById("weatherSunset").textContent =
      formatTime(daily.sunset?.[0]);

    document.getElementById("weatherUpdatedAt").textContent =
      `Dikemas kini ${formatTime(current.time)}`;

    document.getElementById("weatherQuickTemp").textContent =
      `${Math.round(current.temperature_2m ?? 0)}°C`;
    document.getElementById("weatherQuickCondition").textContent = condition;
    document.getElementById("weatherQuickUpdated").textContent =
      `Dikemas kini ${formatTime(current.time)}`;

    this.renderHourly(hourly, current.time);
    this.renderDaily(daily);
  }

  findNearestHourIndex(times, currentTime) {
    if (!times.length) return -1;

    const target = new Date(currentTime || Date.now()).getTime();
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    times.forEach((time, index) => {
      const distance = Math.abs(new Date(time).getTime() - target);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    return nearestIndex;
  }

  renderHourly(hourly, currentTime) {
    const container = document.getElementById("weatherHourlyList");
    const times = hourly.time || [];
    const start = Math.max(0, this.findNearestHourIndex(times, currentTime));
    const end = Math.min(times.length, start + 12);

    container.innerHTML = "";

    for (let index = start; index < end; index += 1) {
      const [label, icon] = weatherLabel(hourly.weather_code?.[index]);
      const card = document.createElement("article");
      card.className = "weather-hour-card";
      card.innerHTML = `
        <span>${escapeHtml(formatTime(times[index]))}</span>
        <strong class="weather-hour-icon">${icon}</strong>
        <b>${Math.round(hourly.temperature_2m?.[index] ?? 0)}°</b>
        <small>💧 ${Math.round(hourly.precipitation_probability?.[index] ?? 0)}%</small>
        <em>${escapeHtml(label)}</em>
      `;
      container.appendChild(card);
    }
  }

  renderDaily(daily) {
    const container = document.getElementById("weatherDailyList");
    container.innerHTML = "";

    (daily.time || []).forEach((time, index) => {
      const [label, icon] = weatherLabel(daily.weather_code?.[index]);
      const card = document.createElement("article");
      card.className = "weather-day-card";
      card.innerHTML = `
        <span>${escapeHtml(formatDate(time, { short: true }))}</span>
        <strong>${icon}</strong>
        <b>${Math.round(daily.temperature_2m_max?.[index] ?? 0)}° /
           ${Math.round(daily.temperature_2m_min?.[index] ?? 0)}°</b>
        <small>Hujan ${Math.round(daily.precipitation_probability_max?.[index] ?? 0)}%</small>
        <em>${escapeHtml(label)}</em>
      `;
      container.appendChild(card);
    });
  }

  renderWarnings(payload) {
    const container = document.getElementById("weatherWarningList");
    const records = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

    if (!records.length) {
      container.innerHTML = `
        <div class="weather-warning-empty">
          Tiada amaran aktif yang diterima daripada API pada masa ini.
        </div>
      `;
      return;
    }

    container.innerHTML = records.slice(0, 5).map((record) => {
      const title =
        record.warning_type ||
        record.heading_en ||
        record.heading_bm ||
        record.title ||
        "Amaran Cuaca";

      const description =
        record.text_bm ||
        record.text_en ||
        record.description ||
        record.warning_text ||
        "Rujuk maklumat rasmi METMalaysia.";

      const issued =
        record.issued_at ||
        record.issue_date ||
        record.created_at ||
        record.datetime;

      return `
        <article class="weather-warning-card">
          <div class="weather-warning-icon">!</div>
          <div>
            <strong>${escapeHtml(title)}</strong>
            <p>${escapeHtml(description)}</p>
            <small>${issued ? `Dikeluarkan ${escapeHtml(formatDate(issued))}` : "METMalaysia"}</small>
          </div>
        </article>
      `;
    }).join("");
  }
}
