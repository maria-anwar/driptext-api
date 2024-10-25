const chargebee = require("../../config/chargebee.js");

exports.getSubscriptionInvoice = async (invoiceId) => {
//   let response = null;
  const response = chargebee.invoice.pdf(invoiceId).request(function (error, result) {
    if (error) {
      //handle error
      // console.log(error);
    //   response = null;
      return null;
    } else {
      //   console.log(result.download);
    //   response = result.download;
      return result;
    }
  });

  return response;
};
