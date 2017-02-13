const CONFIG = require("../Config");

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

  Federator.get(CONFIG.BASE_URL + "version", function(req, res, next) {

    res.setHeader("Content-Type", "text/plain");
    res.status(200).send(CONFIG.VERSION);

  });

}
