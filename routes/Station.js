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

const StreamHandler = require("../lib/Handler");
const ERROR = require("../static/Errors");
const CONFIG = require("../Config");
const FederatorError = require("../lib/FederatorError");

const STATION_CONTENT_MIME_TYPE = "application/xml";

module.exports = function(Service) {

  // Handle GET Requests
  Service.get(CONFIG.BASE_URL + "station/query", function(req, res, next) {

    // GET query parameters
    var stream = {
      "net": req.query.net || req.query.network || null,
      "sta": req.query.sta || req.query.station || null,
      "loc": req.query.loc || req.query.location || null,
      "cha": req.query.cha || req.query.channel || null,
      "start": req.query.start || req.query.starttime || null,
      "end": req.query.end || req.query.endtime || null,
      "service": "station",
      "format": "get",
      "extension": {
        "level": req.query.level || null,
        "latitude": req.query.latitude || null,
        "longitude": req.query.longitude || null,
        "minradius": req.query.minradius || null,
        "maxradius": req.query.maxradius || null,
        "minlatitude": req.query.minlatitude || null,
        "maxlatitude": req.query.maxlatitude || null,
        "minlongitude": req.query.minlongitude || null,
        "maxlongitude": req.query.maxlongitude || null
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
    // emitter is an event emitter used by the router and threadr
    req.StreamHandler.Get(stream, function(threadEmitter) {

      // Callback fired when stationXML is flushed from a thread
      threadEmitter.on("data", function(thread) {

        req.StreamHandler.nBytes += thread.nBytes;

        // Set content-type and write the FDSN header once
        if(!req.StreamHandler.headersSent) {
          res.setHeader("Content-Type", STATION_CONTENT_MIME_TYPE);
          res.write(GenerateFDSNStationXMLHeaders());
          req.StreamHandler.headersSent = true;
        }

        // Write the payload
        res.write(GetBufferSlice(Buffer.concat(thread.dataBuffer)));

      });

      // Callback when the emitter is exhausted
      threadEmitter.on("end", function(error) {

        // If we ended with an error
        if(error) {
          return res.status(error.code).send(error.message);
        }

        // No bytes shipped forward 204
        if(!req.StreamHandler.nBytes) {
          return res.status(204).end();
        }

        // Write the final FDSNStationXML footer and end the request
        res.write("</FDSNStationXML>"); res.end();

      });

    });

  });

  /*
   * Function GetBufferSlice
   *
   * Slices a buffer from start to end
   */
  function GetBufferSlice(buffer) {

    // First and last appearance respectively
    var start = buffer.indexOf("<Network");
    var end = buffer.indexOf("</FDSNStationXML>", buffer.length - 25);

    return buffer.slice(start, end);

  }

  /*
   * Function GenerateFDSNStationXMLHeaders
   *
   * Generates the federated FDSNStationXML headers
   *
   */
  function GenerateFDSNStationXMLHeaders() {

    // The NodeJS Federator StationXML header
    return [
      '<FDSNStationXML xmlns="http://www.fdsn.org/xml/station/1" schemaVersion="1.0">',
      '<Source>' + CONFIG.SOURCE + '</Source>',
      '<Sender>' + CONFIG.SENDER + '</Sender>',
      '<Created>' + new Date().toISOString() + '</Created>'
    ].join("");

  }

}
