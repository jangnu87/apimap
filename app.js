const fields = {
  origin: {
    input: document.querySelector("#origin-input"),
    button: document.querySelector('[data-search="origin"]'),
    status: document.querySelector("#origin-status"),
    results: document.querySelector("#origin-results"),
    place: null,
    searchQuery: "",
  },
  destination: {
    input: document.querySelector("#destination-input"),
    button: document.querySelector('[data-search="destination"]'),
    status: document.querySelector("#destination-status"),
    results: document.querySelector("#destination-results"),
    place: null,
    searchQuery: "",
  },
};

const form = document.querySelector("#distance-form");
const routeButton = document.querySelector("#route-button");
const formMessage = document.querySelector("#form-message");
const resultCard = document.querySelector("#result-card");
const mapCard = document.querySelector("#map-card");
let map;
let routeLayer;
let markersLayer;
let lastGeocodeStartedAt = 0;
let geocodeQueue = Promise.resolve();

function setFieldStatus(field, message, kind = "") {
  field.status.textContent = message;
  field.status.className = `field-status${kind ? ` ${kind}` : ""}`;
}

function clearRoute() {
  resultCard.hidden = true;
  mapCard.hidden = true;
  formMessage.textContent = "";
  if (routeLayer) routeLayer.clearLayers();
  if (markersLayer) markersLayer.clearLayers();
}

function clearPlace(field) {
  field.place = null;
  field.searchQuery = "";
  field.results.replaceChildren();
  clearRoute();
}

function makeResultOption(place, index) {
  const button = document.createElement("button");
  button.className = "result-option";
  button.type = "button";
  button.role = "option";
  button.setAttribute("aria-selected", "false");

  const mainName = document.createElement("strong");
  mainName.textContent = place.name || place.display_name.split(",")[0];
  const description = document.createElement("span");
  description.textContent = place.display_name;
  button.append(mainName, description);
  button.addEventListener("click", () => {
    const field = fields[index];
    field.place = place;
    field.searchQuery = "";
    field.input.value = place.name || place.display_name.split(",")[0];
    field.results.replaceChildren();
    setFieldStatus(field, "장소가 선택되었습니다.", "success");
    formMessage.textContent = "";
    clearRoute();
    const otherField = fields[index === "origin" ? "destination" : "origin"];
    if (otherField.place) {
      document.querySelector("#route-button").focus();
    }
  });
  return button;
}

async function fetchPlaces(query) {
  const wait = Math.max(0, 1100 - (Date.now() - lastGeocodeStartedAt));
  if (wait) await new Promise((resolve) => window.setTimeout(resolve, wait));
  lastGeocodeStartedAt = Date.now();

  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    limit: "5",
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
  if (!response.ok) throw new Error("장소 검색 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
  return response.json();
}

function searchPlaces(index) {
  const field = fields[index];
  const query = field.input.value.trim();
  field.results.replaceChildren();
  field.place = null;
  field.searchQuery = query;
  clearRoute();

  if (query.length < 2) {
    setFieldStatus(field, "두 글자 이상 입력해 주세요.", "error");
    field.input.focus();
    return;
  }

  field.button.disabled = true;
  setFieldStatus(field, "실제 장소를 찾고 있어요…");
  const request = geocodeQueue.then(() => fetchPlaces(query));
  geocodeQueue = request.catch(() => {});

  request
    .then((places) => {
      if (field.input.value.trim() !== query) return;
      if (!Array.isArray(places) || places.length === 0) {
        setFieldStatus(field, "검색 결과가 없어요. 다른 이름으로 검색해 주세요.", "error");
        return;
      }

      places.forEach((place) => {
        place.lat = Number(place.lat);
        place.lon = Number(place.lon);
      });
      const validPlaces = places.filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lon));
      validPlaces.forEach((place, placeIndex) => {
        field.results.append(makeResultOption(place, index, placeIndex));
      });
      if (validPlaces.length) {
        setFieldStatus(field, `${validPlaces.length}곳을 찾았어요. 목록에서 장소를 선택해 주세요.`, "success");
      } else {
        setFieldStatus(field, "위치 정보를 확인하지 못했어요. 다시 검색해 주세요.", "error");
      }
    })
    .catch((error) => {
      if (field.input.value.trim() === query) setFieldStatus(field, error.message, "error");
    })
    .finally(() => {
      field.button.disabled = false;
    });
}

for (const [index, field] of Object.entries(fields)) {
  field.button.addEventListener("click", () => searchPlaces(index));
  field.input.addEventListener("input", () => {
    if (field.place && field.input.value.trim() !== (field.place.name || field.place.display_name.split(",")[0])) {
      clearPlace(field);
      setFieldStatus(field, "장소 이름을 입력하고 검색해 주세요.");
    } else if (field.searchQuery && field.input.value.trim() !== field.searchQuery) {
      field.searchQuery = "";
      field.results.replaceChildren();
      setFieldStatus(field, "장소 이름을 입력하고 검색해 주세요.");
    }
  });
  field.input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchPlaces(index);
    }
  });
}

document.querySelector("#swap-button").addEventListener("click", () => {
  const originValue = fields.origin.input.value;
  fields.origin.input.value = fields.destination.input.value;
  fields.destination.input.value = originValue;
  const originPlace = fields.origin.place;
  fields.origin.place = fields.destination.place;
  fields.destination.place = originPlace;
  for (const field of Object.values(fields)) {
    field.results.replaceChildren();
    setFieldStatus(field, field.place ? "장소가 선택되었습니다." : "장소 이름을 입력하고 검색해 주세요.", field.place ? "success" : "");
  }
  clearRoute();
});

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters).toLocaleString("ko-KR")} m`;
  const kilometers = meters / 1000;
  const digits = kilometers < 10 ? 1 : 0;
  return `${kilometers.toLocaleString("ko-KR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} km`;
}

function formatDuration(seconds) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `예상 운전 시간 약 ${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `예상 운전 시간 약 ${hours}시간 ${remainder}분` : `예상 운전 시간 약 ${hours}시간`;
}

function showRoute(route) {
  const origin = fields.origin.place;
  const destination = fields.destination.place;
  const coordinates = route.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]);

  document.querySelector("#distance-value").textContent = formatDistance(route.distance);
  document.querySelector("#route-summary").textContent = formatDuration(route.duration);
  document.querySelector("#origin-name").textContent = origin.display_name;
  document.querySelector("#destination-name").textContent = destination.display_name;

  const routeUrl = new URL("https://www.openstreetmap.org/directions");
  routeUrl.searchParams.set("engine", "fossgis_osrm_car");
  routeUrl.searchParams.set("route", `${origin.lat},${origin.lon};${destination.lat},${destination.lon}`);
  document.querySelector("#map-link").href = routeUrl.toString();
  resultCard.hidden = false;
  mapCard.hidden = false;

  if (!map) {
    map = L.map("map", { scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    routeLayer = L.layerGroup().addTo(map);
    markersLayer = L.layerGroup().addTo(map);
  }

  routeLayer.clearLayers();
  markersLayer.clearLayers();
  L.polyline(coordinates, { color: "#277653", weight: 5, opacity: 0.85, lineCap: "round" }).addTo(routeLayer);

  const pin = (kind) => L.divIcon({
    className: "",
    html: `<span class="route-pin ${kind}"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
  L.marker([origin.lat, origin.lon], { icon: pin("origin"), title: "출발지" }).addTo(markersLayer);
  L.marker([destination.lat, destination.lon], { icon: pin("destination"), title: "도착지" }).addTo(markersLayer);
  map.fitBounds(L.latLngBounds(coordinates).pad(0.12), { maxZoom: 14 });
  window.requestAnimationFrame(() => map.invalidateSize());
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formMessage.textContent = "";
  clearRoute();

  const origin = fields.origin.place;
  const destination = fields.destination.place;
  if (!origin || !destination) {
    formMessage.textContent = "출발지와 도착지를 검색한 뒤 결과 목록에서 각각 선택해 주세요.";
    const missingField = !origin ? fields.origin : fields.destination;
    missingField.input.focus();
    return;
  }

  routeButton.disabled = true;
  routeButton.querySelector("span").textContent = "경로를 찾고 있어요…";
  try {
    const coordinates = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`,
    );
    if (!response.ok) throw new Error("경로 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    const data = await response.json();
    if (data.code !== "Ok" || !data.routes?.length) {
      throw new Error("두 장소 사이의 자동차 경로를 찾을 수 없어요. 다른 장소를 선택해 주세요.");
    }
    showRoute(data.routes[0]);
    resultCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    formMessage.textContent = error.message || "경로를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
  } finally {
    routeButton.disabled = false;
    routeButton.querySelector("span").textContent = "거리 확인하기";
  }
});
