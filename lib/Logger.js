/*
 * NodeJS Federator Logger
 *
 * Sets up a single logger for the service
 *
 */
const Bunyan = require("bunyan");
const CONFIG = require("../Config");

/*
 * IIFE Logger
 *
 * Returns a Bunyan logger that is
 * used by all request handlers
 *
 */
const Logger = (function() {

  // Streams to be logged
  var streams = [{
    "level": "trace",
    "path": CONFIG.LOGPATH + CONFIG.NAME + "-Trace.log"
  }];

  return Bunyan.createLogger({ 
    "name": CONFIG.NAME,
    "streams": streams
  });

})();

module.exports = Logger;
