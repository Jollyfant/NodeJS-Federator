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
const StreamHandler = require("./lib/Handler");

const ERROR = require("./static/Errors");

// Wrap the federator in a module
module.exports = function(CONFIG, federatorCallback) {

  // For all incoming Federator requests
  Federator.all(CONFIG.BASE_URL + "*", function(req, res, next) {

    // Create a new request handler
    req.StreamHandler = new StreamHandler();

    // Federator is closed for maintenance
    if(CONFIG.SERVICE_CLOSED) {
      return res.status(503).send(ERROR.SERVICE_CLOSED);
    }

    // Client disconnected; kill the handler and propogate
    // kill signal to the threader
    req.on("close", function() {
      return req.StreamHandler.Kill();
    });

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

  require("./routes/Version")(Federator, CONFIG);
  require("./routes/Dataselect")(Federator, CONFIG);
  require("./routes/Station")(Federator, CONFIG);

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
