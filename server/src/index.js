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
  "https://ikaristech.com",
  "https://www.ikaristech.com",
  "http://localhost:3000",
].filter(Boolean);


app.use(
  cors({
    origin: (origin, cb) => {
      // requests same-origin a veces vienen sin origin
      if (!origin) return cb(null, true);
      if (allowlist.includes(origin)) return cb(null, true);
      return cb(null, false); // bloquea sin reventar el server

    },
    credentials: true,
  })
);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/forms", formsRoutes);
app.use("/api/lookups", lookupsRoutes); // ✅ AÑADIDO

// ✅ NUEVO: SIEMPRE responder JSON en errores de /api (evita HTML <title>Error</title>)
app.use((err, req, res, next) => {
  console.error("API ERROR:", err);

  // Si es request a API, responde JSON
  if (req.path.startsWith("/api")) {
    const status = err.status || err.statusCode || 500;
    return res.status(status).json({
      message: err.message || "Internal Server Error",
      status,
      // opcional: si quieres más detalle mientras desarrollas
      details: err.details || err.error || null,
    });
  }

  // Si NO es API, deja que Express maneje lo demás
  return next(err);
});

// ✅ SERVIR FRONTEND (React build)
const buildPath = path.join(__dirname, "../build");
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
