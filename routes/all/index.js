const CONFIG = require("../../Config");
const Path = require("path");
const FederatorError = require("../../lib/FederatorError");
const StreamHandler = require("../../lib/Handler");

module.exports = function(Service) {

  // For all incoming Federator requests
  Service.all(CONFIG.BASE_URL + "*", function(req, res, next) {

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
        "path": Path.relative(CONFIG.BASE_URL, req.path),
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

}
