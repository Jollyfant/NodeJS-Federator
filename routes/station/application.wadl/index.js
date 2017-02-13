const CONFIG = require("../../../Config");
const Path = require("path");

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

module.exports = function(Federator) {

  Federator.get(CONFIG.BASE_URL + "station/application.wadl", function(req, res, next) {

    res.setHeader("Content-Type", "application/xml");
    res.status(200).sendFile(Path.join(__dirname, "..", "share/station.wadl"));

  });

}
