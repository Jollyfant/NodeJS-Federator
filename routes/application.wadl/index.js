const CONFIG = require("../../Config");
const Path = require("path");

const SHARE_DIR = Path.join(__dirname, "..", "..", "share")

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

  Federator.get(CONFIG.BASE_URL + "application.wadl", function(req, res, next) {

    res.setHeader("Content-Type", "application/xml");
    res.status(200).sendFile(Path.join(SHARE_DIR, "federator.wadl"));

  });

}
