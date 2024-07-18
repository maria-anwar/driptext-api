"use strict";
const jwt = require("../utils/jwt");

const authenticationRouteHandler = require("../modules/authentication/router");
const rolesRouteHandler = require("../modules/roles/router");
const usersRouteHandler = require("../modules/users/router");
const dashboardRouteHandler = require("../modules/dashboard/router");
const plansRouteHandler = require("../modules/plans/router");
const subPlansRouteHandler = require("../modules/subPlans/router");

class Routes {
	constructor(app) {
		this.app = app;
	}
	appRoutes() {
		this.app.use("/api/auth", authenticationRouteHandler);
		this.app.use("/api/roles", rolesRouteHandler);
		this.app.use("/api/users", jwt.protect, usersRouteHandler);
		this.app.use("/api/dashboard", jwt.protect, dashboardRouteHandler);
		this.app.use("/api/plans", plansRouteHandler);
		this.app.use("/api/sub/plans", subPlansRouteHandler);
		// this.app.use("/api/classes", jwt.protect, classesRouteHandler);
	}
	routesConfig() {
		this.appRoutes();
	}
}
module.exports = Routes;
