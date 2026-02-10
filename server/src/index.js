require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const formsRoutes = require("./routes/forms");
const lookupsRoutes = require("./routes/lookups"); // ✅ AÑADIDO

const app = express();

app.use(express.json({ limit: "2mb" }));

app.use(
  cors({
    origin: process.env.WEB_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/forms", formsRoutes);
app.use("/api/lookups", lookupsRoutes); // ✅ AÑADIDO

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`IKARIS server running on http://localhost:${port}`);
});
