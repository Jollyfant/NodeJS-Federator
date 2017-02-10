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

const WADL_CONTENT_MIME_TYPE = "application/xml";
const CONFIG = require("../Config");
const Path = require("path");

module.exports = function(Service) {

  Service.get(CONFIG.BASE_URL + "dataselect/application.wadl", function(req, res, next) {

    res.setHeader("Content-Type", WADL_CONTENT_MIME_TYPE);
    res.status(200).sendFile(Path.join(__dirname, "..", "share/dataselect.wadl"));

  });

}
