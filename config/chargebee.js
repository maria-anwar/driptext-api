const chargebee = require("chargebee");
chargebee.configure({
  site: "malhoc-test",  
  api_key: "test_cd3amhfCG9p0aORToc1SOFysuhFs1Hiei"  
});

module.exports = chargebee;
