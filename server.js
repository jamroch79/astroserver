import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// Clé N2YO
const N2YO_KEY = process.env.N2YO_KEY;

// Dossier des fichiers HTML (kp, iss_transits_*.html, etc.)
app.use(express.static("public"));

// Proxy ISS pour Vourles
app.get("/api/iss/vourles", async (req, res) => {
  const lat = 45.673;
  const lng = 4.793;
  const alt = 200;
  const days = 10;
  const minVisibility = 1;

  const url = `https://api.n2yo.com/rest/v1/satellite/visualpasses/25544/${lat}/${lng}/${alt}/${days}/${minVisibility}/&apiKey=${N2YO_KEY}`;

  try {
    const r = await fetch(url);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Erreur N2YO Vourles" });
  }
});

// Proxy ISS pour Lans-en-Vercors
app.get("/api/iss/lans", async (req, res) => {
  const lat = 45.126;
  const lng = 5.585;
  const alt = 1000;
  const days = 10;
  const minVisibility = 1;

  const url = `https://api.n2yo.com/rest/v1/satellite/visualpasses/25544/${lat}/${lng}/${alt}/${days}/${minVisibility}/&apiKey=${N2YO_KEY}`;

  try {
    const r = await fetch(url);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Erreur N2YO Lans" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

