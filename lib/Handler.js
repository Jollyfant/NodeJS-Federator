const CONFIG = require("../Config");
const ERRORS = require("../static/Errors");
const Logger = require("./Logger");

const RequestRouter = require("./Router");
const RequestThreader = require("./Threader");
const EventEmitter = require("events").EventEmitter;

/*
 * Class RequestHandler
 * 
 * Handles single request by routing
 * and threading all requests across EIDA nodes
 *
 */
const RequestHandler = function() {

  // Set logger and placeholders for
  // router and threader
  this.Logger = Logger;
  this.Router = null;
  this.Threader = null;

  this.id = this.AssignRequestId();
  this.requestSubmitted = new Date();

  // Some numbers to keep track of for this request
  this.nBytes = 0;
  this.nRoutesTotal = 0;
  this.nRoutesFailed = 0;
  this.nRoutesSuccess = 0;
  this.nRoutesEmpty = 0;

}

/*
 * RequestHandler.Shuffle
 *
 * Shuffles request list in place to reduce simultaneous load on one node
 * https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
 *
 * :: array - array to be shuffled in place
 *
 */
RequestHandler.prototype.Shuffle = function(array) {

  var j, x, i;
  for (i = array.length; i; i--) {
    j = Math.floor(Math.random() * i);
    x = array[i - 1];
    array[i - 1] = array[j];
    array[j] = x;
  }

}

/*
 * RequestHandler.Get
 *
 * Gets requests for stream
 *
 */
RequestHandler.prototype.Get = function(stream, requestEmitterCallback) {

  // Save reference
  var self = this;

  this.running = true;
  this.stream = stream;

  // Create a new event emitter
  var emitter = new EventEmitter();

  // Create a new routing class
  this.Router = new RequestRouter(this);

  // Collect the routes from routing service
  // This callback is fired once
  this.Router.Get(this.Router.FormatQuery(stream), function(thread) {

    // The request handler has stopped
    if(!self.running) {
      return;
    }

    // Point through callback
    requestEmitterCallback(emitter);

    // No content returned by the routing service
    if(thread.statusCode === 204) {
      return emitter.emit("end", ERRORS.NO_CONTENT);
    }

    // Unrecoverable problem fetching the routes
    // Show routing error
    if(thread.statusCode !== 200) {
      return emitter.emit("end", ERRORS.ROUTING_ERROR);
    }

    // Routing is OK!
    // Get the query extension for the routed requests
    var queryExtension = self.GetQueryExtension(stream.extension);

    // Get a list of the routes from the dataBuffer and extend
    var routes = Buffer.concat(thread.dataBuffer).toString().split("\n").map(function(route) {
      return route + queryExtension;
    });

    self.nRoutes = routes.length;

    // Shuffle the routes to reduce simultaneous load on one node
    self.Shuffle(routes);

    // Create the Federator Threader
    // Get all routes and flush to the emitter
    self.Threader = new RequestThreader(self);
    self.Threader.Get(routes, emitter);

  });

}

/*
 * Function RequestHandler.AssignRequestId
 *
 * Assigns a unique request ID to each handled request
 *
 */
RequestHandler.prototype.AssignRequestId = function() {

  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();

}

/*
 * Function RequestHandler.GenerateFilename
 *
 * Generates filename based on current ISO-time and 
 * configured service name
 *
 */
RequestHandler.prototype.GenerateFilename = function() {

  return [
    CONFIG.NAME,
    "-",
    this.stream.service,
    "-",
    new Date().toISOString(),
    this.GetExtension()
  ].join("");

}

/*
 * Function RequestHandler.GetExtension
 *
 * Returns data extension based on the
 * requested service
 *
 */
RequestHandler.prototype.GetExtension = function() {

  switch(this.stream.service) {
    case "dataselect":
      return ".mseed";
    case "wfcatalog":
      return ".json";
  }

}

/*
 * Function RequestHandler.GetQueryExtension
 *
 * Creates string representation of additional query parameters
 *
 */
RequestHandler.prototype.GetQueryExtension = function(extension) {

  var extensionArray = new Array();

  for(var key in extension) {
    if(extension[key] !== null && extension[key] !== "") {
      extensionArray.push(key + "=" + extension[key]);
    }
  }

  if(extensionArray.length) {
    return "&" + extensionArray.join("&");
  }

  return "";

}

/*
 * RequestHandler.Kill
 *
 * Kills the requestHandler and subsequent threader
 *
 */
RequestHandler.prototype.Kill = function() {

  // Check if the handler is still running
  if(!this.running) {
    return;
  }

  // Stop the request handler
  this.running = false;

  // Propagate the kill to the threader
  if(this.Threader && this.Threader.running) {
    this.Threader.Kill();
  }

}

module.exports = RequestHandler;
