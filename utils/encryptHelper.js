const crypto = require("./crypto");
function encryptHelper(toEncrypt) {
	function objIDsEnc(obj) {
		Object.keys(obj).forEach(function (key) {
			if (Array.isArray(obj[key])) {
				obj[key].forEach(function (item) {
					encryptHelper(item);
				});
			} else if (
				typeof obj[key] === "object" &&
				obj[key] !== null &&
				!(key.endsWith("At") || key.endsWith("Date") || key.endsWith("date"))
			) {
				encryptHelper(obj[key]);
			} else {
				if (key.endsWith("id") || key.endsWith("Id") || key === "_id") {
					if (obj[key] == null || obj[key] == 0) {
						obj[key] = null;
					} else {
						obj[key] = crypto.encrypt(obj[key].toString());
					}
				}
			}
		});
	}

	if (Array.isArray(toEncrypt)) {
		toEncrypt.forEach(function (obj) {
			objIDsEnc(obj);
		});
	} else if (toEncrypt != null) {
		objIDsEnc(toEncrypt);
	}

	return toEncrypt;
}

module.exports = encryptHelper;
