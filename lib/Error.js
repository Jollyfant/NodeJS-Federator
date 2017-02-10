/*
 * Class FederatorError
 *
 * Sends error to response
 *
 */

const CONFIG = require("../Config");

// Default HTTP status codes
const STATUS_CODES = {
  "200": "OK",
  "204": "No Content",
  "400": "Bad Request",
  "413": "Payload Too Large",
  "414": "URI Too Long",
  "500": "Internal Server Error",
  "503": "Service Unavailable"
}

/*
 * Class FederatorError
 *
 * Sends error to user
 *
 * :: req - express request object
 * :: res - express response object
 * :: error - static error object to be sent
 *
 */
var FederatorError = function(req, res, error) {

  // Create response body to send
  var responseBody = [
    "Error " + error.code + ": " + STATUS_CODES[error.code],
    error.message,
    "Usage details are available from " + CONFIG.DOCUMENTATION_URI,
    "Request:",
    req.url,
    "Request Submitted:",
    req.StreamHandler.requestSubmitted,
    "Service Version:",
    CONFIG.VERSION
  ].join("\n");

  res.setHeader('Content-Type', 'text/plain');
  res.status(error.code).send(responseBody);

}

module.exports = FederatorError;
