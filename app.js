const http = require("http");
const https = require("https");
const express = require("express");
const fs = require("fs");
const cron = require("node-cron");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

const appConfig = require("./config/app");
const routes = require("./routes/routes");
const db = require("./models/index"); // Ensure this is the modified Mongoose models index
// const cornJob = require("./utils/cornJob");
const cornJobs = require("./utils/cornJobs/cornJobs");

dotenv.config();

class Server {
  constructor() {
    this.app = express();
    // this.connectToDatabase();
  }
  // mongodb://localhost:27017/
  connectToDatabase() {
    const dbURI =
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/driptextdb";

    mongoose.connect(dbURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    mongoose.connection.on("connected", () => {
      console.log("Mongoose is connected to", dbURI);
    });

    mongoose.connection.on("error", (err) => {
      console.error("Mongoose connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("Mongoose is disconnected");
    });
  }

  appConfig() {
    new appConfig(this.app).includeConfig();
  }

  includeRoute() {
    new routes(this.app).routesConfig();
  }

  startCornJob() {
    cron.schedule("0 * * * *", () => {
      cornJobs.trafficLightDealineCheck();
    });
    cron.schedule("0 */2 * * *", () => {
      cornJobs.onBoardingReminder();
    });
    cron.schedule("0 0 * * *", () => {
      cornJobs.subscriptonCheck();
    });
    cron.schedule("0 */2 * * *", () => {
      cornJobs.taskDeadlineCheck();
    });
    // 0 0 1 * *
    cron.schedule("0 0 1 * *", () => {
      cornJobs.monthlyFreelancingInvoicing();
    });
    // 0 0 1 * *
    cron.schedule("0 0 1 * *", () => {
      cornJobs.clientMonthlyTasks();
    });
  }

  async appExecute() {
    const port = process.env.PORT || 8000;
    const ssl = process.env.SSL || "inactive";
    const ssl_key_path = process.env.SSL_KEY || null;
    const ssl_cert_path = process.env.SSL_CERT || null;
    let server = null;

    this.appConfig();
    this.includeRoute();

    if (ssl === "active") {
      const options = {
        key: fs.readFileSync(ssl_key_path),
        cert: fs.readFileSync(ssl_cert_path),
      };
      server = https.createServer(options, this.app);
      // server.timeout(600000);
      // server.timeout = 600000;
    } else {
      server = http.createServer(this.app);
      // server.timeout(600000);
      // server.timeout = 600000;
    }

    // server.timeout = 600000;

    server.listen(port, () => {
      console.log(`Server is listening on port ${port}`);
    });

    this.startCornJob();

    // if (process.env.CORN_JOB === 'true') {
    // 	cron.schedule("*/1 * * * *", () => {
    // 		cornJob.checkCourseCompletion();
    // 	});
    // }
  }
}

const app = new Server();
app.appExecute();
