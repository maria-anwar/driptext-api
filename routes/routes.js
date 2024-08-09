"use strict";
const jwt = require("../utils/jwt");

const authenticationRouteHandler = require("../modules/authentication/router");
const rolesRouteHandler = require("../modules/roles/router");
const usersRouteHandler = require("../modules/users/router");
const dashboardRouteHandler = require("../modules/dashboard/router");
const plansRouteHandler = require("../modules/plans/router");
const subPlansRouteHandler = require("../modules/subPlans/router");
const projectsRouteHandler = require("../modules/Project/router");
const projectTaskRouteHandler = require("../modules/projectTask/router");
const chargebeeRoutHandler = require("../modules/chargebee/router")

class Routes {
	constructor(app) {
		this.app = app;
	}
	appRoutes() {
		this.app.use("/api/auth", authenticationRouteHandler);
		this.app.use("/api/roles", rolesRouteHandler);
		this.app.use("/api/users", usersRouteHandler);
		this.app.use("/api/dashboard", jwt.protect, dashboardRouteHandler);
		this.app.use("/api/plans", plansRouteHandler);
		this.app.use("/api/sub/plans", subPlansRouteHandler);
		this.app.use("/api/projects", jwt.protect, projectsRouteHandler);
		this.app.use("/api/project/tasks", jwt.protect, projectTaskRouteHandler);
		this.app.use("/api/chargebee", chargebeeRoutHandler)
		// this.app.use("/api/classes", jwt.protect, classesRouteHandler);
	}
	routesConfig() {
		this.appRoutes();
	}
}
module.exports = Routes;
