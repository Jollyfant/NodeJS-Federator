/*
 * NodeJS EIDA Federator Dataselect Implementation
 *
 * Supported Request Type:
 * > GET
 *
 * path: /dataselect/query
 *
 */

const StreamHandler = require("../lib/Handler");

const ERROR = require("../static/Errors");
const ALLOWED = require("../static/Allowed");
const REGEX = require("../static/Regex");

const CONFIG = require("../Config");
const FederatorError = require("../lib/FederatorError");

module.exports = function(Federator) {

  // Dataselect path
  Federator.get(CONFIG.BASE_URL + "dataselect/query", function(req, res, next) {

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

    // Check allowed parameters from static allowed object
    for(var key in req.query) {
      if(!ALLOWED.DATASELECT.hasOwnProperty(key)) {
        return new FederatorError(req, res, ERROR.INVALID_PARAMETER, key);
      }
      if(ALLOWED.DATASELECT[key] && !REGEX[ALLOWED.DATASELECT[key]].test(req.query[key])) {
        return new FederatorError(req, res, ERROR.INVALID_REGEX, key);
      }
    }

    // Parse request body
    const stream = {
      "net": req.query.net || req.query.network || null,
      "sta": req.query.sta || req.query.station || null,
      "loc": req.query.loc || req.query.location || null,
      "cha": req.query.cha || req.query.channel || null,
      "start": req.query.start || req.query.starttime || null,
      "end": req.query.end || req.query.endtime || null,
      "service": "dataselect",
      "format": "get"
    }

    // Check required start and end time
    if(stream.start === null) {
      return new FederatorError(req, res, ERROR.START_REQUIRED);
    }

    if(stream.end === null) {
      return new FederatorError(req, res, ERROR.END_REQUIRED);
    }

    stream.start = new Date(stream.start);
    stream.end = new Date(stream.end);

    // Check validity of start and end time
    if(isNaN(stream.start)) {
      return new FederatorError(req, res, ERROR.INVALID_START);
    }

    if(isNaN(stream.end)) {
      return new FederatorError(req, res, ERROR.INVALID_END);
    }

    // Convert start and end to ISOString for routing service
    stream.start = stream.start.toISOString();
    stream.end = stream.end.toISOString();

    // Handle a single stream request
    // Streams are automatically routed and federated between nodes
    // the "data" event is fired when a node answered with data and
    // we pipe the result to the user.
    // the "end" event is fired when all federated requests have been
    // exhausted.
    req.StreamHandler.Get(stream, function(threadEmitter) {

      // Send the headers once
      threadEmitter.once("header", function() {

        res.setHeader("Content-Type", "application/vnd.fdsn.mseed");
        res.setHeader("Content-Disposition", "attachment; filename=" + req.StreamHandler.GenerateFilename());

      });

      // Callback when data is flushed from a thread
      threadEmitter.on("data", function(thread) {

        req.StreamHandler.nBytes += thread.nBytes;
        res.write(Buffer.concat(thread.dataBuffer));

      });

      // Callback when the data emitter is exhausted
      threadEmitter.on("end", function(error) {

        // If the streamHandler returned an error
        // e.g. in routing the requests
        if(error) {
          return res.status(error.code).send(error.message);
        }

        // No bytes shipped end with 204
        if(!req.StreamHandler.nBytes) {
          return res.status(204).end();
        }

        res.end();

      });

    });

  });

}
