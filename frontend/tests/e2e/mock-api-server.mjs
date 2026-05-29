import http from "node:http";

const port = Number(process.env.MOCK_API_PORT || 8765);

const docsIndex = [
  {
    id: "cat-1",
    name: "Getting Started",
    slug: "getting-started",
    sort_order: 1,
    headings: [
      {
        id: "h1-intro",
        title: "Introduction",
        slug: "intro",
        sort_order: 1,
        children: [
          { id: "h2-install", title: "Install the SDK", slug: "install", sort_order: 1, children: [] },
          { id: "h2-config", title: "Configure project", slug: "configure", sort_order: 2, children: [] },
        ],
      },
      {
        id: "h1-deploy",
        title: "Deployment",
        slug: "deployment",
        sort_order: 2,
        children: [{ id: "h2-prod", title: "Production checklist", slug: "production", sort_order: 1, children: [] }],
      },
    ],
  },
  {
    id: "cat-2",
    name: "API Reference",
    slug: "api-reference",
    sort_order: 2,
    headings: [
      {
        id: "h1-auth",
        title: "Authentication",
        slug: "authentication",
        sort_order: 1,
        children: [{ id: "h2-cookies", title: "Cookie sessions", slug: "cookie-sessions", sort_order: 1, children: [] }],
      },
    ],
  },
];

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendText(res, status, body) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(body);
}

function searchHits(query) {
  const text = query || "install";
  return [
    {
      source_type: "content",
      source_id: "content-install",
      matched_text: "Install the SDK",
      context: `Use the install command, configure environment variables, and verify the public documentation page.`,
      url: "/d/demo/getting-started/intro/install",
      category: "Getting Started",
      category_slug: "getting-started",
      h1: "Introduction",
      h1_slug: "intro",
      h2: "Install the SDK",
      h2_slug: "install",
      highlight: {},
      similarity_score: text.length,
    },
  ];
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const path = url.pathname;

  if (req.method === "OPTIONS") return sendText(res, 204, "");
  if (path === "/__health") return sendJson(res, 200, { ok: true });

  if (path === "/t/demo/settings") {
    return sendJson(res, 200, { site_title: "Demo Docs", site_logo: "", primary_color: "#10b981" });
  }

  if (path === "/t/demo/docs-index") {
    return sendJson(res, 200, docsIndex);
  }

  if (path === "/t/demo/categories/getting-started/headings") {
    return sendJson(res, 200, docsIndex[0].headings.map(({ children, ...heading }) => heading));
  }

  if (path === "/t/demo/categories/getting-started/intro/headings") {
    return sendJson(res, 200, docsIndex[0].headings[0].children);
  }

  if (path === "/t/demo/public/contents") {
    return sendJson(res, 200, [
      {
        id: "content-intro",
        heading_id: url.searchParams.get("heading_id") || "h1-intro",
        description: "Start here",
        body: "## Welcome\n\nThis introduction helps teams find the right documentation quickly.\n\n```bash\nnpm install demo-docs\n```",
      },
    ]);
  }

  if (path === "/t/demo/page/getting-started/intro/install") {
    return sendJson(res, 200, {
      category: "getting-started",
      h1: "Introduction",
      h2: "install",
      title: "Install the SDK",
      description: "Install and verify the SDK in a production-ready project.",
      body: "## Install\n\nRun the install command below.\n\n```bash\nnpm install demo-docs\n```\n\n| Step | Status |\n| --- | --- |\n| Install | Required |\n\n![Demo diagram](/placeholder.svg)",
    });
  }

  if (path === "/t/demo/search") {
    return sendJson(res, 200, searchHits(url.searchParams.get("q") || ""));
  }

  if (path === "/t/demo/search/suggest") {
    return sendJson(res, 200, ["Install the SDK", "Installation guide", "Production checklist"]);
  }

  if (path === "/t/demo/seo/pages") {
    return sendJson(res, 200, {
      limit: 25,
      urls: ["/d/demo", "/d/demo/getting-started/intro", "/d/demo/getting-started/intro/install"],
    });
  }

  if (path === "/t/demo/feedback" && req.method === "POST") {
    req.resume();
    return sendJson(res, 201, { ok: true });
  }

  if (path === "/t/demo/admin/me") {
    return sendJson(res, 401, { detail: "Not authenticated" });
  }

  sendJson(res, 404, { detail: "Not found" });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`mock api listening on http://127.0.0.1:${port}`);
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));
