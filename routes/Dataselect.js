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
const CONFIG = require("../Config");
const FederatorError = require("../lib/FederatorError");

const DATASELECT_CONTENT_MIME_TYPE = "application/vnd.fdsn.mseed";

module.exports = function(Service) {

  // Dataselect path
  Service.get(CONFIG.BASE_URL + "dataselect/query", function(req, res, next) {

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

      // Callback when data is flushed from a thread
      threadEmitter.on("data", function(thread) {

        req.StreamHandler.nBytes += thread.nBytes;

        // Write headers once
        if(!req.StreamHandler.headersSent) {
          res.setHeader("Content-Type", DATASELECT_CONTENT_MIME_TYPE);
          res.setHeader("Content-Disposition", "attachment; filename=" + req.StreamHandler.GenerateFilename());
          req.StreamHandler.headersSent = true;
        }

        // Pipe mseed response to user
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
