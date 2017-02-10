const Http = require("http");
const Thread = require("./Thread");

/*
 * Class RequestRouter
 *
 * Routes the request between EIDA nodes
 * and returns an array of URLs to be visited
 *
 */
const RequestRouter = function(handler) {

  // Use RESIF routing service
  this.ROUTING_PROTOCOL = "http://";
  this.ROUTING_HOST = "eidaws.ipgp.fr";
  this.ROUTING_PATH = "/eidaws/routing/1/query";

  this.Handler = handler;

}

/*
 * RequestRouter.GetRequestOptions
 *
 * Converts routing query to URL
 *
 * :: routingQuery - query string to be appended
 *
 */
RequestRouter.prototype.GetRequestOptions = function(routingQuery) {

  return [
    this.ROUTING_PROTOCOL,
    this.ROUTING_HOST,
    this.ROUTING_PATH,
    routingQuery
  ].join("");

}

/*
 * RequestRouter.Get
 *
 * Gets the routes from the EIDA routing service
 *
 * :: routingQuery - URL to be queried
 * :: routingCallback - callback to fire when HTTP request is done
 *
 */
RequestRouter.prototype.Get = function(routingQuery, routingCallback) {

  var self = this;

  // Reference the callback
  if(!routingCallback instanceof Function) {
    throw("PANIC RequestRouter.Get: passed callback is not a function.");
  }

  this.routingStart = new Date();
  this.routingCallback = routingCallback;

  // Create a single request thread and open with the routing request
  var thread = new Thread();
  thread.Open(this.GetRequestOptions(routingQuery));

  // Run HTTP request on thread
  thread.request = Http.get(thread.options, function(response) {

    // Save thread status code
    thread.statusCode = response.statusCode;

    // Data was returned; collect
    response.on("data", function(data) {
      thread.dataBuffer.push(data);  
    });

    // Response has ended; close the thread
    response.on("end", function() {
      self.CloseThread(thread);
    });

  });

  // End the request and wait for response callbacks to fire
  thread.request.end();
 
}

/*
 * RequestRouter.CloseThread
 *
 * Closes the single routing thread and
 * fires the routing callback
 *
 */
RequestRouter.prototype.CloseThread = function(thread) {

  // Forwards the statusCode and dataBuffer
  return this.routingCallback(thread);

}

/*
 * RequestHandler.FormatRoutedQuery
 *
 * Converts query object to query string
 *
 * :: queryObject - object to be converted
 *
 */
RequestRouter.prototype.FormatQuery = function(queryObject) {

  var routingQuery = new Array();

  // Go over the query object and skip any null
  // and convert to a query string
  for(var key in queryObject) {

    if(key !== "extension" && queryObject[key] !== null && queryObject[key] !== "") {
      routingQuery.push(key + "=" + queryObject[key]);
    }

  }

  return "?" + routingQuery.join("&");

}


module.exports = RequestRouter;
