"use strict";
const Joi = require("@hapi/joi");
const mongoose = require("mongoose");
const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const emails = require("../../utils/emails");
const crypto = require("../../utils/crypto");
const fs = require("fs");
const handlebars = require("handlebars");
const { alternatives } = require("joi");
const dayjs = require("dayjs");
const {
  createFolder,
  createTaskFile,
  getFileCount,
} = require("../../utils/googleService/actions");

const Users = db.User;
const Roles = db.Role;
const UserPlan = db.UserPlan;
const Projects = db.Project;
const ProjectTask = db.ProjectTask;
const Company = db.Company;
const Plans = db.Plan;
const SubPlans = db.SubPlan;
// const Billing = db.Billing;
const Subscription = db.Subscription;
const Freelancers = db.Freelancer;

exports.create = async (req, res) => {
  try {
    const joiSchema = Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      projectName: Joi.string().required(),
      keywords: Joi.string().optional().allow("").allow(null),
      email: Joi.string().email().required(),
      roleId: Joi.string().required(),
      country: Joi.string().optional().allow(null).allow(""),
      vatId: Joi.string().optional().allow(null).allow(""),
      companyName: Joi.string().optional().allow(null).allow(""),
      planId: Joi.string().optional().allow(null).allow(""),
      subPlanId: Joi.string().optional().allow(null).allow(""),
      password: Joi.string().optional().allow(null).allow(""),
      isSubscribed: Joi.string().optional().allow("").allow(null),
      telNo: Joi.string().optional().allow("").allow(null),
      textPrice: Joi.string().optional().allow("").allow(null),
      response: Joi.object().optional().allow("").allow(null),
      vatType: Joi.object().optional().allow("").allow(null),
    });
    const { error, value } = joiSchema.validate(req.body);

    if (error) {
      // emails.errorEmail(req, error);

      const message = error.details[0].message.replace(/"/g, "");
      res.status(401).send({
        message: "Some Error" + message,
      });
    } else {
      const billResponse = req.body.response;
      const userObj = {
        firstName: req.body.firstName?.trim(),
        lastName: req.body.lastName?.trim(),
        email: req.body.email.trim(),
        country: req.body.country ? req.body.country : null,
        vatIdNo: req.body.vatId ? req.body.vatId : null,
        companyName: req.body.companyName ? req.body.companyName : null,
        password: req.body.password ? req.body.password : "123456@123456",
        role: req.body.roleId,
        isSubscribed: req.body.isSubscribed ? req.body.isSubscribed : "N",
      };
      const session = await mongoose.startSession();
      session.startTransaction();

      let alredyExist = await Users.findOne({ email: userObj.email }).populate(
        "role"
      );

      let userRole = await Roles.findOne({ _id: userObj.role });
      if (
        userRole.title == "Client" &&
        !req.body.planId &&
        !req.body.subPlanId
      ) {
        await session.commitTransaction();
        session.endSession();
        res.status(403).send({
          message: "Plan and SubPlan ID's are required for the client role",
        });
        return 1;
      }

      if (!alredyExist) {
        console.log("inside first if");
        Users.create(userObj)
          .then(async (user) => {
            console.log("user created....");
            var userPlanObj = {};
            var projectObj = {
              projectName: req.body.projectName,
              keywords: req.body.keywords ? req.body.keywords : null,
              user: user._id,
              tasks: 0,
            };

            if (req.body.planId) {
              userPlanObj = {
                user: user._id,
                // plan: req.body.planId,
                // subPlan: req.body.subPlanId,
              };
            } else {
              console.log("7");
              userPlanObj = {
                user: user._id,
              };
            }

            let subscriptionItems;
            let paymentMethod;
            let billingResponse;
            let createBilling = "";
            // let activatedAt = "";
            let startAt = "";
            let endAt = "";
            // let nextBillingAt = "";
            let subscription = "";
            if (req.body.response) {
              subscriptionItems = {
                item_price_id:
                  billResponse.subscription.subscription_items[0].item_price_id,
                item_type:
                  billResponse.subscription.subscription_items[0].item_type,
                quantity:
                  billResponse.subscription.subscription_items[0].quantity,
                unit_price:
                  billResponse.subscription.subscription_items[0].unit_price,
                amount: billResponse.subscription.subscription_items[0].amount,
                current_term_start:
                  billResponse.subscription.subscription_items[0]
                    .current_term_start,
                current_term_end:
                  billResponse.subscription.subscription_items[0]
                    .current_term_end,

                free_quantity:
                  billResponse.subscription.subscription_items[0].free_quantity,
              };

              paymentMethod = {
                type: billResponse.customer.payment_method.type,
                reference_id: billResponse.customer.payment_method.reference_id,
                gateway: billResponse.customer.payment_method.gateway,
                gateway_account_id:
                  billResponse.customer.payment_method.gateway_account_id,
                status: billResponse.customer.payment_method.status,
              };

              billingResponse = {
                userId: user._id,
                subscriptionId: billResponse.subscription.id,
                subscriptionStatus: billResponse.subscription.status,
                subscriptionItem: [subscriptionItems],
                customer_id: billResponse.customer.id,
                customer_first_name: billResponse.customer.first_name,
                customer_last_name: billResponse.customer.last_name,
                customer_email: billResponse.customer.email,
                payment_method: paymentMethod,
              };
              // createBilling = await Billing.create(billingResponse);
              // startAt = dayjs(
              //   billResponse.subscription.subscription_items[0]
              //     .current_term_start * 1000
              // );
              // endAt = dayjs(
              //   billResponse.subscription.subscription_items[0]
              //     .current_term_end * 1000
              // );
              startAt = dayjs(
                billResponse.subscription.current_term_start * 1000
              );
              endAt = dayjs(
                billResponse.subscription.current_term_end * 1000
              );
              subscription = await Subscription.create({
                startDate: dayjs(startAt).format("YYYY-MM-DD"),
                endDate: dayjs(endAt).format("YYYY-MM-DD"),
                subscriptionItem: subscriptionItems,
                paymentMethod: paymentMethod,
              });
            }

            let createProject = await Projects.create(projectObj);
            let nameChar = createProject.projectName.slice(0, 2).toUpperCase();
            let idChar = createProject._id.toString().slice(-4);
            let projectId = nameChar + "-" + idChar;

            await Users.findByIdAndUpdate(
              user._id,
              { $push: { projects: createProject._id } },
              { new: true }
            );

            userPlanObj.project = createProject._id;
            console.log("user plan obj: ", userPlanObj);
            let createUserPlan = "";
            if (subscription) {
              let plan = await Plans.findOne({ _id: req.body.planId });
              //   console.log("plan: ", plan);
              let subPlan = await SubPlans.findOne({ _id: req.body.subPlanId });
              // let endMonthDate = ""
              // let tempEndMonthDate = dayjs(subscription.startDate).add(1, "month")
              // if(dayjs(subscription))
              //   console.log("sub plan: ", subPlan);
              createUserPlan = await UserPlan.create({
                ...userPlanObj,
                plan: req.body.planId,
                subPlan: req.body.subPlanId,
                startDate: subscription.startDate,
                endDate: subscription.endDate,
                totalTexts: plan.texts * subPlan.duration,
                textsRemaining: plan.texts * subPlan.duration,
                duration: subPlan.duration,
                endMonthDate: dayjs(subscription.startDate).add(1, "month"),
                tasksPerMonth: plan.texts,
                subscription: subscription._id,
              });
            } else {
              createUserPlan = await UserPlan.create({
                ...userPlanObj,
                totalTexts: 1,
                textsRemaining: 1,
                tasksPerMonth: 1,
              });
            }

            console.log("create user plan: ", createUserPlan);
            const folderObj = await createFolder(projectId);

            await Projects.findByIdAndUpdate(
              createProject._id,
              {
                projectId: projectId,
                plan: createUserPlan._id,
                folderLink: folderObj.folderLink,
                folderId: folderObj.folderId,
              },
              { new: true }
            );

            emails
              .onBoardingRequest(user, createProject)
              .then((res) => {
                console.log("request on boarding sent");
              })
              .catch((err) => {
                console.log("could not sent on boarding email");
              });

            if (createUserPlan && createProject) {
              if (subscription !== "") {
                const clientData = {
                  clientName: `${req.body.firstName} ${req.body.lastName}`,
                  clientEmail: `${req.body.email}`,
                  subscriptionStatus: `${billResponse.subscription.status}`,
                  subscriptionStartDate: `${billResponse.subscription.subscription_items[0].current_term_start}`,
                  subscriptionEndDate: `${billResponse.subscription.subscription_items[0].current_term_end}`,
                  paymentMethodType: `${billResponse.customer.payment_method.type}`,
                  amount: `${billResponse.subscription.subscription_items[0].unit_price}`,
                };
                // Send email
                emails
                  .sendBillingInfo(
                    clientData.clientEmail,
                    "Your Billing Information",
                    clientData
                  )
                  .then((res) => {
                    console.log("billing email success: ", res);
                  })
                  .catch((err) => {
                    console.log("billing email error: ", err);
                  });
              }
              await emails.AwsEmailPassword(user);
              let getuser = await Users.findOne({ _id: user._id })
                .select("firstName lastName email role password")
                .populate({ path: "role", select: "title" });

              await session.commitTransaction();
              session.endSession();
              res.status(200).send({
                message: "User Added",
                data: getuser,
                project: createProject,
              });
              return;
            }
          })
          .catch(async (err) => {
            // emails.errorEmail(req, err);
            await session.abortTransaction();
            session.endSession();
            res.status(500).send({
              message:
                err.message || "Some error occurred while creating the Quiz.",
            });
          });
      } else if (
        alredyExist &&
        (alredyExist.role.title == "Leads" || alredyExist.role.title == "leads")
      ) {
        console.log("inside second if...");
        const userRole = await Roles.findOne({ _id: userObj.role });
        if (userRole.title !== "Client") {
          res
            .status(403)
            .send({ message: "You are a already registered user" });
        } else {
          if (!req.body.planId || !req.body.subPlanId) {
            res.status(500).send({ message: "User already exists" });
            return;
          }
          userObj.password = alredyExist.password;
          Users.findByIdAndUpdate(
            { _id: alredyExist._id.toString() },
            userObj,
            { new: true }
          )
            .then(async (user) => {
              //   console.log(user);

              //   if (req.body.planId) {
              //     userPlanObj = {
              //       user: user._id,
              //       plan: req.body.planId,
              //       subPlan: req.body.subPlanId,
              //     };
              //   } else {
              //     userPlanObj = {
              //       user: user._id,
              //     };
              //   }
              //   let createUserPlan = await UserPlan.findOneAndUpdate(
              //     { user: user._id },
              //     userPlanObj,
              //     { new: true }
              //   );

              //   var userPlanObj = {};
              //   let userPlan = await UserPlan.findOne({
              //     _id: createUserPlan._id,
              //   })
              //     .populate("plan")
              //     .populate("subPlan");

              var projectObj = {
                projectName: req.body.projectName,
                keywords: req.body.keywords ? req.body.keywords : null,
                user: user._id,
                //   duration: userPlan.subPlan.duration,
                //   numberOfTasks: userPlan.plan.texts,
                //   tasks: taskCount
              };

              const project = await Projects.findOne({
                user: user._id,
                projectName: req.body.projectName.trim(),
              }).populate({ path: "plan" });

              if (
                project &&
                project.plan &&
                project.plan.subscription &&
                (dayjs(new Date()).isSame(
                  dayjs(project.plan.subscription.endDate, "day")
                ) ||
                  dayjs(new Date()).isBefore(
                    dayjs(project.plan.subscription.endDate, "day")
                  ))
              ) {
                res.status(500).send({
                  message: "This Project's subscription already exists",
                });
                return;
              }

              let subscriptionItems;
              let paymentMethod;
              let billingResponse;
              let createBilling = "";
              let subscription = "";
              let startAt = "";
              let endAt = "";
              let projectStatus = "Free Trial";

              if (req.body.response) {
                subscriptionItems = {
                  item_price_id:
                    billResponse.subscription.subscription_items[0]
                      .item_price_id,
                  item_type:
                    billResponse.subscription.subscription_items[0].item_type,
                  quantity:
                    billResponse.subscription.subscription_items[0].quantity,
                  unit_price:
                    billResponse.subscription.subscription_items[0].unit_price,
                  amount:
                    billResponse.subscription.subscription_items[0].amount,
                  current_term_start:
                    billResponse.subscription.subscription_items[0]
                      .current_term_start,
                  current_term_end:
                    billResponse.subscription.subscription_items[0]
                      .current_term_end,
                  next_billing_at:
                    billResponse.subscription.subscription_items[0]
                      .next_billing_at,
                  free_quantity:
                    billResponse.subscription.subscription_items[0]
                      .free_quantity,
                };

                paymentMethod = {
                  type: billResponse.customer.payment_method.type,
                  reference_id:
                    billResponse.customer.payment_method.reference_id,
                  gateway: billResponse.customer.payment_method.gateway,
                  gateway_account_id:
                    billResponse.customer.payment_method.gateway_account_id,
                  status: billResponse.customer.payment_method.status,
                };

                billingResponse = {
                  userId: user._id,
                  subscriptionId: billResponse.subscription.id,
                  subscriptionStatus: billResponse.subscription.status,
                  subscriptionItem: [subscriptionItems],
                  customer_id: billResponse.customer.id,
                  customer_first_name: billResponse.customer.first_name,
                  customer_last_name: billResponse.customer.last_name,
                  customer_email: billResponse.customer.email,
                  payment_method: paymentMethod,
                };
                // createBilling = await Billing.create(billingResponse);
                // startAt = dayjs(
                //   billResponse.subscription.subscription_items[0]
                //     .current_term_start * 1000
                // );
                // endAt = dayjs(
                //   billResponse.subscription.subscription_items[0]
                //     .current_term_end * 1000
                // );
                 startAt = dayjs(
                   billResponse.subscription.current_term_start * 1000
                 );
                 endAt = dayjs(
                   billResponse.subscription.current_term_end * 1000
                 );
                subscription = await Subscription.create({
                  startDate: dayjs(startAt).format("YYYY-MM-DD"),
                  endDate: dayjs(endAt).format("YYYY-MM-DD"),
                  subscriptionItem: subscriptionItems,
                  paymentMethod: paymentMethod,
                });
                projectStatus = "Ready";
              }

              let final_project = "";
              if (project) {
                console.log("project already exists");
                let plan = await Plans.findOne({ _id: req.body.planId });
                console.log("plan: ", plan);
                let subPlan = await SubPlans.findOne({
                  _id: req.body.subPlanId,
                });
                console.log("sub plan: ", subPlan);
                const prevUserPlan = await UserPlan.findOne({
                  project: project._id,
                });

                const updatePlan = await UserPlan.findOneAndUpdate(
                  { project: project._id },
                  {
                    // ...projectObj,
                    plan: req.body.planId,
                    subPlan: req.body.subPlanId,
                    startDate: subscription.startDate,
                    endDate: subscription.endDate,
                    totalTexts:
                      project.plan.totalTexts + plan.texts * subPlan.duration,
                    textsRemaining:
                      project.plan.textsRemaining +
                      plan.texts * subPlan.duration,
                    duration: subPlan.duration,
                    endMonthDate: dayjs(subscription.startDate).add(1, "month"),
                    tasksPerMonth: plan.texts + prevUserPlan.tasksPerMonth,
                    subscription: subscription._id,
                    user: user._id,
                  },
                  { new: true }
                );
                if (project.onBoarding) {
                  const updateProject = await Projects.findOneAndUpdate(
                    { _id: project._id },
                    {
                      projectStatus: projectStatus,
                    },
                    { new: true }
                  );
                }

                final_project = project;
              } else {
                console.log("creating new project");
                let plan = await Plans.findOne({ _id: req.body.planId });
                // console.log("plan: ", plan);
                let subPlan = await SubPlans.findOne({
                  _id: req.body.subPlanId,
                });
                // console.log("sub plan: ", subPlan);
                console.log("project obj: ", projectObj);
                const newProject = await Projects.create({
                  ...projectObj,
                });
                const userPlan = await UserPlan.create({
                  plan: req.body.planId,
                  subPlan: req.body.subPlanId,
                  startDate: subscription.startDate,
                  endDate: subscription.endDate,
                  totalTexts: plan.texts * subPlan.duration,
                  textsRemaining: plan.texts * subPlan.duration,
                  duration: subPlan.duration,
                  endMonthDate: dayjs(subscription.startDate).add(1, "month"),
                  tasksPerMonth: plan.texts,
                  subscription: subscription._id,
                  user: user._id,
                  project: newProject._id,
                });

                const updatedProject = await Projects.findOneAndUpdate(
                  { _id: newProject._id },
                  {
                    plan: userPlan._id,
                  },
                  { new: true }
                );
                final_project = updatedProject;
                await Users.findByIdAndUpdate(
                  { _id: alredyExist._id },
                  { $push: { projects: final_project._id } },
                  { new: true }
                );
              }

              //   let createProject = await Projects.findOneAndUpdate(
              //     { user: user._id, projectName: projectObj.projectName },
              //     projectObj,
              //     {
              //       new: true,
              //     }
              //   );
              let nameChar = final_project.projectName
                .slice(0, 2)
                .toUpperCase();
              let idChar = final_project._id.toString().slice(-4);
              let projectId = nameChar + "-" + idChar;
              const folderObj = await createFolder(projectId);

              await Projects.findByIdAndUpdate(
                { _id: final_project._id },
                {
                  projectId: projectId,
                  folderLink: folderObj.folderLink,
                  folderId: folderObj.folderId,
                },
                { new: true }
              );

              // await Users.findByIdAndUpdate(
              //   { _id: alredyExist._id },
              //   { $push: { projects: final_project._id } },
              //   { new: true }
              // );
              if (subscription !== "") {
                const clientData = {
                  clientName: `${req.body.firstName} ${req.body.lastName}`,
                  clientEmail: `${req.body.email}`,
                  subscriptionStatus: `${billResponse.subscription.status}`,
                  subscriptionStartDate: `${billResponse.subscription.subscription_items[0].current_term_start}`,
                  subscriptionEndDate: `${billResponse.subscription.subscription_items[0].current_term_end}`,
                  paymentMethodType: `${billResponse.customer.payment_method.type}`,
                  amount: `${billResponse.subscription.subscription_items[0].unit_price}`,
                };
                // Send email
                emails
                  .sendBillingInfo(
                    clientData.clientEmail,
                    "Your Billing Information",
                    clientData
                  )
                  .then((res) => {
                    console.log("billing email success: ", res);
                  })
                  .catch((err) => {
                    console.log("billing email error: ", err);
                  });
              }
              if (final_project) {
                emails.AwsEmailPassword(user);

                let getuser = await Users.findOne({ _id: user._id })
                  .select("firstName lastName email role password")
                  .populate({ path: "role", select: "title" });

                await session.commitTransaction();
                session.endSession();
                res.status(200).send({
                  message: "User Added",
                  data: getuser,
                  project: final_project,
                });
                return;
              }
            })
            .catch(async (err) => {
              // emails.errorEmail(req, err);
              await session.abortTransaction();
              session.endSession();
              res.status(500).send({
                message:
                  err.message || "Some error occurred while creating the User.",
              });
            });
        }
      } else if (alredyExist && alredyExist.role.title === "Client") {
        //alreexist && client role
        console.log("inside 3rd if ....");

        const userRole = await Roles.findOne({ _id: userObj.role });
        if (userRole.title !== "Client") {
          res
            .status(403)
            .send({ message: "You are a already registered user" });
          return;
        }
        if (!req.body.planId || !req.body.subPlanId) {
          res.status(500).send({ message: "User already exists" });
          return;
        }
        userObj.password = alredyExist.password;
        Users.findByIdAndUpdate({ _id: alredyExist._id }, userObj, {
          new: true,
        })
          .then(async (user) => {
            var userPlanObj = {};

            var projectObj = {
              projectName: req.body.projectName,
              keywords: req.body.keywords ? req.body.keywords : null,
              user: user._id,
              //   task: 0,
            };

            if (req.body.planId) {
              userPlanObj = {
                user: user._id,
                // plan: req.body.planId,
                // subPlan: req.body.subPlanId,
              };
            } else {
              userPlanObj = {
                user: user._id,
              };
            }

            const project = await Projects.findOne({
              user: user._id,
              projectName: req.body.projectName.trim(),
            }).populate({ path: "plan" });

            //   console.log("before if", project.plan.subscription, "user id: ", user._id)
            //   console.log("project: ", project)

            if (
              project &&
              project.plan &&
              project.plan.subscription &&
              (dayjs(new Date()).isSame(
                dayjs(project.plan.subscription.endDate, "day")
              ) ||
                dayjs(new Date()).isBefore(
                  dayjs(project.plan.subscription.endDate, "day")
                ))
            ) {
              // console.log("inside check if")
              res.status(500).send({
                message: "This Project's subscription already exists",
              });
              return;
            }

            //   console.log("after if")

            let subscriptionItems;
            let paymentMethod;
            let billingResponse;
            let subscription = "";
            let startAt = "";
            let endAt = "";
            let projectStatus = "Free Trial"
            if (billResponse !== "" && billResponse !== null) {
              subscriptionItems = {
                item_price_id:
                  billResponse.subscription.subscription_items[0].item_price_id,
                item_type:
                  billResponse.subscription.subscription_items[0].item_type,
                quantity:
                  billResponse.subscription.subscription_items[0].quantity,
                unit_price:
                  billResponse.subscription.subscription_items[0].unit_price,
                amount: billResponse.subscription.subscription_items[0].amount,
                current_term_start:
                  billResponse.subscription.subscription_items[0]
                    .current_term_start,
                current_term_end:
                  billResponse.subscription.subscription_items[0]
                    .current_term_end,
                next_billing_at:
                  billResponse.subscription.subscription_items[0]
                    .next_billing_at,
                free_quantity:
                  billResponse.subscription.subscription_items[0].free_quantity,
              };

              paymentMethod = {
                type: billResponse.customer.payment_method.type,
                reference_id: billResponse.customer.payment_method.reference_id,
                gateway: billResponse.customer.payment_method.gateway,
                gateway_account_id:
                  billResponse.customer.payment_method.gateway_account_id,
                status: billResponse.customer.payment_method.status,
              };

              billingResponse = {
                userId: user._id,
                subscriptionId: billResponse.subscription.id,
                subscriptionStatus: billResponse.subscription.status,
                subscriptionItem: [{ subscriptionItems }],
                customer_id: billResponse.customer.id,
                customer_first_name: billResponse.customer.first_name,
                customer_last_name: billResponse.customer.last_name,
                customer_email: billResponse.customer.email,
                payment_method: paymentMethod,
              };
              // startAt = dayjs(
              //   billResponse.subscription.subscription_items[0]
              //     .current_term_start * 1000
              // );
              // endAt = dayjs(
              //   billResponse.subscription.subscription_items[0]
              //     .current_term_end * 1000
              // );
              startAt = dayjs(
                billResponse.subscription.current_term_start * 1000
              );
              endAt = dayjs(
                billResponse.subscription.current_term_end * 1000
              );
              subscription = await Subscription.create({
                startDate: dayjs(startAt).format("YYYY-MM-DD"),
                endDate: dayjs(endAt).format("YYYY-MM-DD"),
                subscriptionItem: subscriptionItems,
                paymentMethod: paymentMethod,
              });
              projectStatus = "Ready"

            }

            let final_project = "";
            if (project) {
              console.log("project already exists", project);
              let plan = await Plans.findOne({ _id: req.body.planId });
              //   console.log("plan: ", plan);
              let subPlan = await SubPlans.findOne({
                _id: req.body.subPlanId,
              });
              //   console.log("sub plan: ", subPlan);
              console.log(
                "test number: ",
                project.plan.totalTexts + Number(plan.texts * subPlan.duration)
              );
              const prevUserPlan = await UserPlan.findOne({
                project: project._id,
              });
              const updatePlan = await UserPlan.findOneAndUpdate(
                { project: project._id },
                {
                  // ...projectObj,
                  plan: req.body.planId,
                  subPlan: req.body.subPlanId,
                  startDate: subscription.startDate,
                  endDate: subscription.endDate,
                  totalTexts: Number(
                    project.plan.totalTexts +
                      Number(plan.texts * subPlan.duration)
                  ),
                  textsRemaining: Number(
                    project.plan.textsRemaining +
                      Number(plan.texts * subPlan.duration)
                  ),
                  duration: subPlan.duration,
                  endMonthDate: dayjs(subscription.startDate).add(1, "month"),
                  tasksPerMonth: plan.texts + prevUserPlan.tasksPerMonth,
                  subscription: subscription._id,
                  user: user._id,
                },
                { new: true }
              );
              // console.log("updated plan: ", updatePlan);
              if (project.onBoarding) {
                const updateProject = await Projects.findOneAndUpdate(
                  { _id: project._id },
                  {
                    projectStatus: projectStatus,
                  },
                  { new: true }
                );
              }
              final_project = project;
            } else {
              console.log("creating new project");
              let plan = await Plans.findOne({ _id: req.body.planId });
              // console.log("plan: ", plan);
              let subPlan = await SubPlans.findOne({
                _id: req.body.subPlanId,
              });
              // console.log("sub plan: ", subPlan);
              console.log("project obj: ", projectObj);
              const newProject = await Projects.create({
                ...projectObj,
              });
              const userPlan = await UserPlan.create({
                plan: req.body.planId,
                subPlan: req.body.subPlanId,
                startDate: subscription.startDate,
                endDate: subscription.endDate,
                totalTexts: plan.texts * subPlan.duration,
                textsRemaining: plan.texts * subPlan.duration,
                duration: subPlan.duration,
                endMonthDate: dayjs(subscription.startDate).add(1, "month"),
                tasksPerMonth: plan.texts,
                subscription: subscription._id,
                user: user._id,
                project: newProject._id,
              });
              console.log("userplan id: ", userPlan);
              const updatedProject = await Projects.findOneAndUpdate(
                { _id: newProject._id },
                {
                  plan: userPlan._id,
                },
                { new: true }
              );
              final_project = updatedProject;
              let pushProjectId = await Users.findByIdAndUpdate(
                { _id: alredyExist._id },
                { $push: { projects: final_project._id } },
                { new: true }
              );
            }

            // let createProject = await Projects.create(projectObj);

            let nameChar = final_project.projectName.slice(0, 2).toUpperCase();
            let idChar = final_project._id.toString().slice(-4);
            let projectId = nameChar + "-" + idChar;
            const folderObj = await createFolder(projectId);

            let updateProjectId = await Projects.findByIdAndUpdate(
              { _id: final_project._id },
              {
                projectId: projectId,
                folderLink: folderObj.folderLink,
                folderId: folderObj.folderId,
              },
              { new: true }
            );

            // let pushProjectId = await Users.findByIdAndUpdate(
            //   { _id: alredyExist._id },
            //   { $push: { projects: final_project._id } },
            //   { new: true }
            // );
            // userPlanObj.projectId = createProject._id;

            // let createUserPlan = await UserPlan.create(userPlanObj);
            // let createBilling = await Billing.create(billingResponse);

            if (final_project && subscription) {
              const clientData = {
                clientName: `${req.body.firstName} ${req.body.lastName}`,
                clientEmail: `${req.body.email}`,
                subscriptionStatus: `${billResponse.subscription.status}`,
                subscriptionStartDate: `${billResponse.subscription.subscription_items[0].current_term_start}`,
                subscriptionEndDate: `${billResponse.subscription.subscription_items[0].current_term_end}`,
                paymentMethodType: `${billResponse.customer.payment_method.type}`,
                amount: `${billResponse.subscription.subscription_items[0].unit_price}`,
              };
              // Send email
              emails
                .sendBillingInfo(
                  clientData.clientEmail,
                  "Your Billing Information",
                  clientData
                )
                .then((res) => {
                  console.log("billing email success: ", res);
                })
                .catch((err) => {
                  console.log("billing email error: ", err);
                });

              await emails.AwsEmailPassword(user);

              await session.commitTransaction();
              session.endSession();
              res.send({
                message: "User Added",
                data: user,
                project: final_project,
              });

              return;
            }
          })
          .catch(async (err) => {
            // emails.errorEmail(req, err);
            await session.abortTransaction();
            session.endSession();
            res.status(500).send({
              message:
                err.message || "Some error occurred while creating the User.",
            });
          });
      } else {
        res.status(401).send({ message: "UnAuthorized for this action." });
        return;
      }
    }
  } catch (err) {
    emails.errorEmail(req, err);
    res.status(500).send({
      message: err.message || "Some error occurred.",
    });
  }
};

exports.update = async (req, res) => {
  try {
    const joiSchema = Joi.object({
      // userId: Joi.string().required(),
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
    });
    const { error, value } = joiSchema.validate(req.body);

    if (error) {
      emails.errorEmail(req, error);

      const message = error.details[0].message.replace(/"/g, "");
      res.status(401).send({
        message: message,
      });
    } else {
      const userId = req.userId;

      const user = {
        firstName: req.body.firstName?.trim(),
        lastName: req.body.lastName?.trim(),
      };

      var updateUser = await Users.findOneAndUpdate(
        { _id: userId, isActive: "Y" },
        user,
        { new: true }
      );
      if (updateUser) {
        res.status(200).send({
          message: "User updated successfully.",
          data: updateUser,
        });
      } else {
        res.status(500).send({
          message: "Failed to update user.",
        });
      }
    }
  } catch (err) {
    emails.errorEmail(req, err);
    res.status(500).send({
      message: err.message || "Some error occurred.",
    });
  }
};

exports.onboarding = async (req, res) => {
  console.log("on boarding api called ... !!");
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const joiSchema = Joi.object({
      speech: Joi.string().required(),
      prespective: Joi.string().required(),
      projectName: Joi.string().required(),
      projectId: Joi.string().required(),
      userId: Joi.string().required(),
      companyBackgorund: Joi.string().optional().allow("").allow(null),
      companyAttributes: Joi.string().optional().allow("").allow(null),
      comapnyServices: Joi.string().optional().allow("").allow(null),
      customerContent: Joi.string().optional().allow("").allow(null),
      customerIntrest: Joi.string().optional().allow("").allow(null),
      contentPurpose: Joi.string().optional().allow("").allow(null),
      contentInfo: Joi.string().optional().allow("").allow(null),
    });
    const { error, value } = joiSchema.validate(req.body);

    if (error) {
      // emails.errorEmail(req, error);

      const message = error.details[0].message.replace(/"/g, "");
      res.status(401).send({
        message: message,
      });
      return;
    } else {
      const userId = req.body.userId ? req.body.userId : null;
      const projectId = req.body.projectId;
      const projectName = req.body.projectName.trim();
      const speech = req.body.speech.trim();
      const prespective = req.body.prespective.trim();

      let companyInfoObj = {
        companyBackgorund: req.body.companyBackgorund,
        companyAttributes: req.body.companyAttributes,
        comapnyServices: req.body.comapnyServices,
        customerContent: req.body.customerContent,
        customerIntrest: req.body.customerIntrest,
        contentPurpose: req.body.contentPurpose,
        contentInfo: req.body.contentInfo,
      };

      const user = await Users.findOne({ _id: req.body.userId }).populate(
        "role"
      );
      let projectStatus = "";
      if (user.role.title.toLowerCase() === "leads") {
        projectStatus = "Free Trial";
      }
      if (user.role.title.toLowerCase() === "client") {
        projectStatus = "Ready";
      }

      const newOnBoarding = await Company.create({
        ...companyInfoObj,
        user: req.body.userId,
      });
      const updatedProject = await Projects.findOneAndUpdate(
        { _id: req.body.projectId },
        {
          projectStatus: projectStatus,
          speech: req.body.speech,
          prespective: req.body.prespective,
          onBoarding: true,
          onBoardingInfo: newOnBoarding._id,
        },
        { new: true }
      );

      await session.commitTransaction();
      session.endSession();
      res.status(200).send({ message: "success" });
    }
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).send({
      message: err.message || "Some error occurred.",
    });
  }
};

exports.findUserPlan = async (req, res) => {
  UserPlan.find({ user: "66b8c02ac454e13575527fee" })
    .then((response) => {
      res.send(response);
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.checkEmail = async (req, res) => {
  try {
    const joiSchema = Joi.object({
      // userId: Joi.string().required(),
      email: Joi.string().required(),
      // lastName: Joi.string().required(),
    });
    const { error, value } = joiSchema.validate(req.body);

    if (error) {
      emails.errorEmail(req, error);

      const message = error.details[0].message.replace(/"/g, "");
      res.status(401).send({
        message: message,
      });
      return;
    }
    const isFreelancer = await Freelancers.findOne({ email: req.body.email });
    if (isFreelancer) {
      res.status(500).json({ message: "This email exists as freelancer" });
      return;
    }
    const isUser = await Users.findOne({ email: req.body.email });
    if (isUser) {
      res.status(500).json({ message: "This email already exists" });
      return;
    }

    res.status(200).json({ message: "success" });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};
