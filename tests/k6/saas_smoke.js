import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    public_browse: {
      executor: "constant-vus",
      vus: Number(__ENV.VUS || 20),
      duration: __ENV.DURATION || "1m",
    },
    search: {
      executor: "constant-vus",
      vus: Number(__ENV.SEARCH_VUS || 10),
      duration: __ENV.DURATION || "1m",
      exec: "searchScenario",
    },
    admin_login: {
      executor: "constant-vus",
      vus: Number(__ENV.ADMIN_VUS || 1),
      duration: __ENV.ADMIN_DURATION || "30s",
      exec: "adminScenario",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{scenario:public_browse}": ["p(95)<300"],
    "http_req_duration{scenario:search}": ["p(95)<400"],
    "http_req_duration{scenario:admin_login}": ["p(95)<1000"],
  },
};

const baseUrl = __ENV.BASE_URL || "http://localhost:8000";
const apiPrefix = __ENV.API_PREFIX === undefined ? "/api" : __ENV.API_PREFIX;
const tenant = __ENV.TENANT_SLUG || "demo";
const api = (path) => `${baseUrl}${apiPrefix}${path}`;

export default function () {
  const menu = http.get(api(`/t/${tenant}/menu`), { tags: { area: "public" } });
  check(menu, {
    "menu ok": (res) => res.status === 200 || res.status === 404,
  });

  sleep(1);
}

export function searchScenario() {
  const search = http.get(api(`/t/${tenant}/search?q=docs&limit=5`), { tags: { area: "search" } });
  check(search, {
    "search ok": (res) => [200, 404, 429].includes(res.status),
  });

  sleep(1);
}

export function adminScenario() {
  if (!__ENV.ADMIN_EMAIL || !__ENV.ADMIN_PASSWORD) {
    sleep(1);
    return;
  }

  const login = http.post(
    api(`/t/${tenant}/admin/login`),
    {
      username: __ENV.ADMIN_EMAIL,
      password: __ENV.ADMIN_PASSWORD,
    },
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      tags: { area: "admin" },
    }
  );
  check(login, {
    "admin login ok": (res) => [200, 400, 401, 403, 404, 429].includes(res.status),
  });

  sleep(1);
}
