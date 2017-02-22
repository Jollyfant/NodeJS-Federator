/*
 * NodeJS Federator Station Route
 *
 * Supported Request Types
 * :: GET
 *
 * Supported parameters
 * :: network, station, location, channel, starttime, endtime, level
 *
 */

const PARENT_DIR = "../../../";

const CONFIG = require(PARENT_DIR + "Config");

const ERROR = require(PARENT_DIR + "static/Errors");
const ALLOWED = require(PARENT_DIR + "static/Allowed");
const REGEX = require(PARENT_DIR + "static/Regex");

const RequestHandler = require(PARENT_DIR + "lib/Handler");
const FederatorError = require(PARENT_DIR + "lib/FederatorError");

module.exports = function(Federator) {

  // Handle GET Requests
  Federator.get(CONFIG.BASE_URL + "wfcatalog/query", function(req, res, next) {

    // Check the query string
    if(!req._parsedUrl.search) {
      return new FederatorError(req, res, ERROR.QUERY_EMPTY);
    }
    if(Buffer.byteLength(req._parsedUrl.search) > CONFIG.MAXIMUM_QUERYSTRING_BYTES) {
      return new FederatorError(req, res, ERROR.QUERY_LENGTH_EXCEEDED); 
    }
    if(!REGEX["query"].test(req._parsedUrl.search)) {
      return new FederatorError(req, res, ERROR.QUERYSTRING_INVALID); 
    }

    // GET query parameters
    var stream = {
      "net": req.query.net || req.query.network || null,
      "sta": req.query.sta || req.query.station || null,
      "loc": req.query.loc || req.query.location || null,
      "cha": req.query.cha || req.query.channel || null,
      "start": req.query.start || req.query.starttime || null,
      "end": req.query.end || req.query.endtime || null,
      "service": "wfcatalog",
      "format": "get",
      "extension": {
        "include": req.query.include || null,
        "quality": req.query.quality || null,
        "format": req.query.format || null,
        "granularity": req.query.gran || req.query.granularity || null,
        "minimumlength": req.query.minlen || req.query.minimumlength || null,
        "longestonly": req.query.longestonly || null,
        "csegments": req.query.csegments || null,
        "sample_rate": req.query.sample_rate || null,
        "record_length": req.query.record_length || null,
      }
    }

    // Check for allowed parameters from static allowed object
    // and check match the input against a valid regex
    for(var key in req.query) {

      // Key is metric or has extension
      if(ALLOWED.WFCATALOG_METRICS.hasOwnProperty(key) || /_eq$|_ne$|_gt$|_ge$|_lt$|_le$/.test(key)) {

        var metric = key.split("_")[0];

        // Confirm key is present
        if(!ALLOWED.WFCATALOG_METRICS.hasOwnProperty(metric)) {
          return new FederatorError(req, res, ERROR.INVALID_PARAMETER, key);
        }

        // Check the type
        if(!REGEX[ALLOWED.WFCATALOG_METRICS[metric]].test(req.query[key])) {
          return new FederatorError(req, res, ERROR.INVALID_REGEX, key);
        }

        // Add to the extension
        stream.extension[key] = req.query[key];

      } else {

        if(!ALLOWED.WFCATALOG.hasOwnProperty(key)) {
          return new FederatorError(req, res, ERROR.INVALID_PARAMETER, key);
        }

        if(ALLOWED.WFCATALOG[key] && !REGEX[ALLOWED.WFCATALOG[key]].test(req.query[key])) {
          return new FederatorError(req, res, ERROR.INVALID_REGEX, key);
        }

      }

    }

    // Confirm start and endtime 
    if(stream.start) {
      stream.start = new Date(stream.start);
      if(isNaN(stream.start)) {
        return new FederatorError(req, res, ERROR.INVALID_START);
      }
      stream.start = stream.start.toISOString();
    }

    if(stream.end) {
      stream.end = new Date(stream.end);
      if(isNaN(stream.end)) {
        return new FederatorError(req, res, ERROR.INVALID_END);
      }
      stream.end = stream.end.toISOString();
    }

    // Handle the stream
    // emitter is an event emitter used by the router and threader
    req.RequestHandler.Get(stream, function(threadEmitter) {

      // Callback to send the headers once
      threadEmitter.once("header", function() {

        res.setHeader("Content-Type", "application/json");
        res.setHeader('Content-Disposition', 'attachment; filename=' + req.RequestHandler.GenerateFilename());

        res.write("[");

      });

      // Callback fired when stationXML is flushed from a thread
      threadEmitter.on("dataBuffer", function(dataBuffer) {

        req.RequestHandler.nBytes += dataBuffer.length;

        // Cut off the start and end of buffer
        res.write(dataBuffer.slice(1, dataBuffer.length - 1));

      });

      // Callback when the emitter is exhausted or an error occured
      threadEmitter.on("end", function(error) {

        // If we ended with an error (e.g. in routing)
        if(error) {
          return res.status(error.code).send(error.message);
        }

        // No bytes shipped forward 204
        if(!req.RequestHandler.nBytes) {
          return res.status(204).end();
        }

        // Write the final FDSNStationXML footer and end the request
        res.write("]");
        res.end();

      });

    });

  });

}
