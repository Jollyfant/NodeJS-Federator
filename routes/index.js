/*
 * Federator route *
 *
 * Handles each incoming request to the Federator
 * and sets up a default request handler
 *
 */
const CONFIG = require("../Config");
const Path = require("path");
const FederatorError = require("../lib/FederatorError");
const RequestHandler = require("../lib/Handler");

module.exports = function(Service) {

  // For all incoming Federator requests
  Service.all(CONFIG.BASE_URL + "*", function(req, res, next) {

    // Create a new request handler
    req.RequestHandler = new RequestHandler();

    // Federator is closed for maintenance
    if(CONFIG.SERVICE_CLOSED) {
      return new FederatorError(req, res, ERROR.SERVICE_CLOSED);
    }

    // Client disconnected; kill the handler and propogate
    // kill signal to the threader
    req.on("close", function() {
      return req.RequestHandler.Kill();
    });

    // When the response has finished
    res.on("finish", function() {

      // Log the HTTP request
      req.RequestHandler.Logger.info({
        "id": req.RequestHandler.id,
        "code": res.statusCode,
        "path": Path.relative(CONFIG.BASE_URL, req.path),
        "client": req.headers["x-forwarded-for"] || req.connection.remoteAddress,
        "method": req.method,
        "nBytesTotal": req.RequestHandler.nBytes,
        "nRoutesFailed": req.RequestHandler.nRoutesFailed,
        "nRoutesSuccess": req.RequestHandler.nRoutesSuccess,
        "nRoutesEmpty": req.RequestHandler.nRoutesEmpty,
        "nRoutesTotal": req.RequestHandler.nRoutes,
        "msRequestTimeTotal": new Date() - req.RequestHandler.requestSubmitted
      }, "HTTP Request Summary");

    });

    // Proceed to the next route specific middleware
    next();

  });

}
