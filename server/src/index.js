require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");


const authRoutes = require("./routes/auth");
const formsRoutes = require("./routes/forms");
const lookupsRoutes = require("./routes/lookups"); // ✅ AÑADIDO

const app = express();

app.use(express.json({ limit: "2mb" }));

const allowlist = [
  process.env.WEB_ORIGIN, // e.g. https://ikaristech.com
  "http://localhost:3000",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // requests same-origin a veces vienen sin origin
      if (!origin) return cb(null, true);
      if (allowlist.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/forms", formsRoutes);
app.use("/api/lookups", lookupsRoutes); // ✅ AÑADIDO

// ✅ SERVIR FRONTEND (React build)
// index.js está en: /server/src/index.js
// build está en: /web/build
const buildPath = path.join(__dirname, "../../web/build");
app.use(express.static(buildPath));

// ✅ Fallback SPA: cualquier ruta que NO sea /api -> index.html
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API route not found" });
  }
  return res.sendFile(path.join(buildPath, "index.html"));
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`IKARIS server running on http://localhost:${port}`);
});
