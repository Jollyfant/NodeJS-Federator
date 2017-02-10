/*
 * NodeJS Federator Version Implementation
 *
 * Supported Request Type:
 * > GET
 *
 * Path: /version
 *
 * Returns current service version number in text/plain
 *
 */

const VERSION_CONTENT_MIME_TYPE = "text/plain";
const CONFIG = require("../Config");

module.exports = function(Service) {

  Service.get(CONFIG.BASE_URL + "version", function(req, res, next) {

    res.setHeader("Content-Type", VERSION_CONTENT_MIME_TYPE);
    res.status(200).send(CONFIG.VERSION);

  });

}
