const mongoose = require("mongoose");

exports.getTaskCounter = async () => {
  try {
    const counter = mongoose.connection.collection("counters");
    const counterData = await counter.findOne({ id: "taskId" });
    return counterData;
  } catch (error) {
    return null;
  }
};

exports.getProjectCounter = async () => {
  try {
    const counter = mongoose.connection.collection("counters");
    const counterData = await counter.findOne({ id: "id" });
    return counterData;
  } catch (error) {
    return null;
  }
};
