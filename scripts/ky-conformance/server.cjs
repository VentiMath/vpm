"use strict";
const http = require("node:http");
exports.server = (extra) => {
  const attempts = new Map();
  return http.createServer(async (req, res) => {
    if (extra?.(req, res)) return;
    const u = new URL(req.url, "http://localhost");
    if (u.pathname === "/redirect") {
      res.writeHead(302, { location: "/echo?redirected=1" });
      res.end();
      return;
    }
    if (u.pathname === "/body-slow") {
      res.writeHead(200, { "content-type": "application/json" });
      res.write('{"id":');
      const t = setTimeout(() => res.end("3}"), 500);
      res.on("close", () => clearTimeout(t));
      return;
    }
    if (u.pathname === "/slow") {
      const t = setTimeout(() => res.end("late"), 500);
      res.on("close", () => clearTimeout(t));
      return;
    }
    const chunks = [];
    for await (const part of req) chunks.push(part);
    const body = Buffer.concat(chunks).toString();
    res.setHeader("content-type", "application/json");
    if (u.pathname.startsWith("/status/")) {
      res.statusCode = Number(u.pathname.split("/").pop());
      res.end(
        JSON.stringify({ error: "denied", fields: { name: "required" } }),
      );
      return;
    }
    if (u.pathname === "/retry") {
      const n = (attempts.get(u.searchParams.get("key")) ?? 0) + 1;
      attempts.set(u.searchParams.get("key"), n);
      if (n < 3) {
        res.statusCode = 503;
        res.setHeader("retry-after", "0");
        res.end('{"busy":true}');
        return;
      }
      res.end(
        JSON.stringify({ attempts: n, body, header: req.headers["x-test"] }),
      );
      return;
    }
    res.end(
      JSON.stringify({
        path: u.pathname,
        query: [...u.searchParams],
        method: req.method,
        body,
        header: req.headers["x-test"] ?? null,
        type: req.headers["content-type"] ?? null,
      }),
    );
  });
};
