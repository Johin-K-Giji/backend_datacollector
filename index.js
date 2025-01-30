require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const userRoutes = require("./routes/userRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Allows JSON request bodies
app.use(morgan("dev")); // Logs requests

// Default route
app.get("/", (req, res) => {
  res.send("Data Collection App API is running...");
});

const pool = require("./config/db");


//routes

app.use("/api/users", userRoutes);



app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ message: "Database connected", time: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Server listening
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
