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

const StreamHandler = require(PARENT_DIR + "lib/Handler");
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

    // Check for allowed parameters from static allowed object
    // and check match the input against a valid regex
    for(var key in req.query) {
      if(!ALLOWED.WFCATALOG.hasOwnProperty(key)) {
        return new FederatorError(req, res, ERROR.INVALID_PARAMETER, key);
      }
      if(ALLOWED.WFCATALOG[key] && !REGEX[ALLOWED.WFCATALOG[key]].test(req.query[key])) {
        return new FederatorError(req, res, ERROR.INVALID_REGEX, key);
      }
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
        "num_samples": req.query.num_samples || null,
        "sample_max": req.query.sample_max || null,
        "sample_min": req.query.sample_min || null,
        "sample_rms": req.query.sample_rms || null,
        "sample_stdev": req.query.sample_stdev || null,
        "sample_mean": req.query.sample_mean || null,
        "sample_median": req.query.sample_median || null,
        "sample_lower_quartile": req.query.sample_lower_quartile || null,
        "sample_upper_quartile": req.query.sample_upper_quartile || null,
        "num_gaps": req.query.num_gaps || null,
        "num_overlaps": req.query.num_overlaps || null,
        "max_gap": req.query.max_gap || null,
        "max_overlap": req.query.max_overlap || null,
        "sum_gaps": req.query.sum_gaps || null,
        "sum_overlaps": req.query.sum_overlaps || null,
        "percent_availability": req.query.percent_availability || null,
        "timing_quality": req.query.timing_quality || null,
        "timing_quality_median": req.query.timing_quality_median || null,
        "timing_quality_mean": req.query.timing_quality_mean || null,
        "timing_quality_upper_quartile": req.query.timing_quality_upper_quartile || null,
        "timing_quality_lower_quartile": req.query.timing_quality_lower_quartile || null,
        "timing_quality_min": req.query.timing_quality_min || null,
        "timing_quality_max": req.query.timing_quality_max || null,
        "timing_correction": req.query.timing_correction || null,
        "amplifier_saturation": req.query.amplifier_saturation || null,
        "digitizer_clipping": req.query.digitizer_clipping || null,
        "spikes": req.query.spikes || null,
        "glitches": req.query.glitches || null,
        "missing_padded_data": req.query.missing_padded_data || null,
        "telemetry_sync_error": req.query.telemetry_sync_error || null,
        "digital_filter_charging": req.query.digital_filter_charging || null,
        "suspect_time_tag": req.query.suspect_time_tag || null,
        "calibration_signal": req.query.calibration_signal || null,
        "time_correction_applied": req.query.time_correction_applied || null,
        "event_begin": req.query.event_begin || null,
        "event_end": req.query.event_end || null,
        "positive_leap": req.query.positive_leap || null,
        "negative_leap": req.query.negative_leap || null,
        "event_in_progress": req.query.event_in_progress || null,
        "station_volume": req.query.station_volume || null,
        "long_record_read": req.query.long_record_read || null,
        "short_record_read": req.query.short_record_read || null,
        "start_time_series": req.query.start_time_series || null,
        "end_time_series": req.query.end_time_series || null,
        "clock_locked": req.query.clock_locked || null
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
    req.StreamHandler.Get(stream, function(threadEmitter) {

      // Callback to send the headers once
      threadEmitter.once("header", function() {

        res.setHeader("Content-Type", "application/json");
        res.write("[");

      });

      // Callback fired when stationXML is flushed from a thread
      threadEmitter.on("dataBuffer", function(dataBuffer) {

        req.StreamHandler.nBytes += dataBuffer.length;

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
        if(!req.StreamHandler.nBytes) {
          return res.status(204).end();
        }

        // Write the final FDSNStationXML footer and end the request
        res.write("]");
        res.end();

      });

    });

  });

}
