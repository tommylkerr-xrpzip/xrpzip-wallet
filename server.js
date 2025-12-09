// server.js
const express = require("express");
const fetch = require("node-fetch"); // install this if not already
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());

// Proxy route for XRP price
app.get("/price", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd"
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch price" });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});