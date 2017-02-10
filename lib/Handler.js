"use strict";

const ERRORS = require("../static/Errors");
const RequestRouter = require("./Router");
const RequestThreader = require("./Threader");
const EventEmitter = require("events").EventEmitter;
const CONFIG = require("../Config");

const RequestHandler = function() {

  this.Router = null;
  this.Threader = null;

  this.id = this.AssignRequestId();
  this.headersSent = false;

  this.nBytes = 0;

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
  this.requestStart = new Date();
  this.stream = stream;

  // Create a new event emitter
  var emitter = new EventEmitter();

  // Create a new routing class
  this.Router = new RequestRouter(this);

  // Collect the routes from routing service
  // This callback is fired once
  this.Router.Get(this.Router.FormatQuery(stream), function(Thread) {

    // Point through callback
    requestEmitterCallback(emitter);

    // The request handler has stopped
    if(!self.running) {
      return;
    }

    // No content returned by the routing service
    if(Thread.statusCode === 204) {
      return emitter.emit("end", ERRORS.NO_CONTENT);
    }

    // Unrecoverable problem fetching the routes
    // Show routing error
    if(Thread.statusCode !== 200) {
      return emitter.emit("end", ERRORS.ROUTING_ERROR);
    }

    // Routing is OK!
    // Get the query extension for the routed requests
    var queryExtension = self.GetQueryExtension(stream.extension);

    // Get a list of the routes from the dataBuffer and extend
    var routes = Buffer.concat(Thread.dataBuffer).toString().split("\n").map(function(route) {
      return route + "&" + queryExtension;
    });

    // Create the Federator Threader
    // Get all routes and flush to the emitter
    self.Threader = new RequestThreader(self);
    self.Threader.Get(routes, emitter);

  });

}

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
    new Date().toISOString(),
    ".mseed"
  ].join("");

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

  return extensionArray.join("&");

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
