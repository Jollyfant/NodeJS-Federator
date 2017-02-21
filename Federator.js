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

// Wrap the federator in a module
module.exports = function(CONFIG, federatorCallback) {

  /*
   * Require the Federator Routes:
   *
   * > version
   * > dataselect/query
   * > station/query
   *
   */

  // Default request handler
  require("./routes")(Federator);

  // Require the paths
  require("./routes/version")(Federator);
  require("./routes/dataselect/query")(Federator);
  require("./routes/station/query")(Federator);
  require("./routes/wfcatalog/query")(Federator);

  // Require the .wadls
  require("./routes/application.wadl")(Federator);
  require("./routes/dataselect/application.wadl")(Federator);
  require("./routes/station/application.wadl")(Federator);
  require("./routes/wfcatalog/application.wadl")(Federator);

  // Listen to incoming HTTP requests
  var server = Federator.listen(CONFIG.PORT, CONFIG.HOST, function() {

    // If a callback function was passed
    if(federatorCallback instanceof Function) {
      federatorCallback("NodeJS Federator has been started");
    }

  });

  // Disable server timeouts
  server.timeout = CONFIG.FEDERATOR_TIMEOUT;

}

// Called directly
if(require.main === module) {

  const CONFIG = require("./Config");

  // Start a single federator
  new module.exports(CONFIG, function(message) {
    console.log(message);
  });

}
