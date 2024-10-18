const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const express = require("express");
const timeout = require("connect-timeout");

class AppConfig {
  constructor(app) {
    dotenv.config();
    this.app = app;
  }
  includeConfig() {
    // Use a different name for your custom crypto module
    global.customCrypto = require("../utils/crypto");

    // You can log the decrypted value if needed
    // console.log(customCrypto.decrypt('UWRuejBBVlRwcm9xaEpoaFhoK2hEUT09'))

    // this.app.use(cors({ origin: "*" }));
    // Apply middleware globally or for a specific route
    app.use(timeout("10m"));
    const allowedOrigins = [
      "https://driptext-app.vercel.app",
      "https://driptext-admin-panel.vercel.app",
    ];
    this.app.use(
      cors({
        origin: function (origin, callback) {
          // allow requests with no origin (like mobile apps or curl requests)
          if (!origin) return callback(null, true);
          if (allowedOrigins.indexOf(origin) === -1) {
            const msg =
              "The CORS policy for this site does not allow access from the specified Origin.";
            return callback(new Error(msg), false);
          }
          return callback(null, true);
        },
      })
    );
    this.app.use(bodyParser.json({ limit: "5mb" }));
    this.app.use("/uploads", express.static("uploads"));

    this.app.use((req, res, next) => {
      console.log("__________________________________");
      console.log(`${new Date()} ${req.originalUrl}`);
      // console.log("Request Params: ", req.params);
      // console.log("Request Body: ", req.body);

      res.header("Access-Control-Allow-Origin", req.headers.origin);
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
      );
      return next();
    });
  }
}

module.exports = AppConfig;
