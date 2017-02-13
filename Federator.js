/*
 * Simple NodeJS Implementation of EIDA Federator
 *
 * Copyright Mathijs Koymans, 2016
 *
 * Only supports GET requests.
 *
 * Dataselect allowed parameters:
 * >>> Network, Station, Location, Channel, Starttime & Endtime
 *
 * Station allowed parameters:
 * >>> Network, Station, Location, Channel, Starttime & Endtime
 * >>> latitude, longitude, minradius, maxradius
 * >>> minlatitude, maxlatitude, minlongitude, maxlontigude
 *
 */

"use strict";

// Federator is powered by NodeJS Express
const Federator = require("express")();

const ERROR = require("./static/Errors");

const FederatorError = require("./lib/FederatorError");
const StreamHandler = require("./lib/Handler");

// Wrap the federator in a module
module.exports = function(CONFIG, federatorCallback) {

  // For all incoming Federator requests
  Federator.all(CONFIG.BASE_URL + "*", function(req, res, next) {

    // Create a new request handler
    req.StreamHandler = new StreamHandler();

    // Federator is closed for maintenance
    if(CONFIG.SERVICE_CLOSED) {
      return new FederatorError(req, res, ERROR.SERVICE_CLOSED);
    }

    // Client disconnected; kill the handler and propogate
    // kill signal to the threader
    req.on("close", function() {
      return req.StreamHandler.Kill();
    });

    // When the response has finished
    res.on("finish", function() {

      // Log the HTTP request
      req.StreamHandler.Logger.info({
        "id": req.StreamHandler.id,
        "code": res.statusCode,
        "path": req.path,
        "client": req.headers["x-forwarded-for"] || req.connection.remoteAddress,
        "method": req.method,
        "nBytesTotal": req.StreamHandler.nBytes,
        "nRoutesFailed": req.StreamHandler.nRoutesFailed,
        "nRoutesSuccess": req.StreamHandler.nRoutesSuccess,
        "nRoutesEmpty": req.StreamHandler.nRoutesEmpty,
        "nRoutesTotal": req.StreamHandler.nRoutes,
        "msRequestTimeTotal": new Date() - req.StreamHandler.requestSubmitted
      }, "HTTP Request Summary");

    });

    // Proceed to the next route specific middleware
    next();

  });

  /*
   * Require the Federator Routes:
   *
   * > version
   * > dataselect/query
   * > station/query
   *
   */

  require("./routes/Version")(Federator);
  require("./routes/Dataselect")(Federator);
  require("./routes/Station")(Federator);

  require("./routes/StationWADL")(Federator);
  require("./routes/DataselectWADL")(Federator);

  // Listen to incoming HTTP requests
  var server = Federator.listen(CONFIG.PORT, CONFIG.HOST, function() {

    // If a callback function was passed
    if(federatorCallback instanceof Function) {
      federatorCallback("Single Federator has been started.");
    }

  });

  // Disable server timeouts
  server.timeout = 0;

}

// Called directly
if(require.main === module) {

  const CONFIG = require("./Config");

  // Start a single federator
  new module.exports(CONFIG, function(message) {
    console.log(message);
  });

}
