const chargebee = require("chargebee");
chargebee.configure({
  site: "driptextapp-test",
  api_key: "test_eswb5pYvm5cuf87MYcdGyEcuTCiCJ5Uy6jk",
});

module.exports = chargebee;
