const nodemailer = require("nodemailer");

function mustEnv(name) {
  if (!process.env[name]) throw new Error(`Missing env ${name}`);
  return process.env[name];
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getTransport() {
  const host = mustEnv("SMTP_HOST");
  const port = Number(mustEnv("SMTP_PORT"));
  const user = mustEnv("SMTP_USER");
  const pass = mustEnv("SMTP_PASS");

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },

    // ✅ CLAVE: evita “cuelgues”
    connectionTimeout: 8000, // ms
    greetingTimeout: 8000,   // ms
    socketTimeout: 12000,    // ms
  });
}


async function sendWelcomeEmail({ to, representativeName, companyName }) {
  const from = mustEnv("SMTP_FROM");
  const transporter = getTransport();

  const subject = `Bienvenido a IKARIS, ${companyName || "tu empresa"}`;

  const html = `
  <div style="font-family:Arial,sans-serif; line-height:1.5; color:#111;">
    <h2>Bienvenido a IKARIS</h2>
    <p>Hola <b>${escapeHtml(representativeName || "equipo")}</b>,</p>
    <p>Tu espacio de empresa <b>${escapeHtml(companyName || "IKARIS")}</b> ya está listo.</p>
    <p>Ya puedes crear formularios, gestionar roles y operar con trazabilidad.</p>
    <br/>
    <p style="font-size:12px; opacity:.7">— IKARIS TECH</p>
  </div>
  `;

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
}

module.exports = { sendWelcomeEmail };
