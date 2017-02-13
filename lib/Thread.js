const Url = require("url");

/*
 * Public Class Thread
 * 
 * Thread class for running multiple
 * HTTP requests in parallel
 *
 */
const Thread = function(id) {

  // Keep a thread ID
  this.id = id || 0;
  this.running = false;

  return this;

}

/*
 * Thread.GetRequestOptions
 *
 * returns request options
 *
 * :: url - url to be converted to request options
 *
 */
Thread.prototype.GetRequestOptions = function(url) {

  // Parse the request URL
  var parsed = Url.parse(url);

  // NodeJS HTTP Options
  // We fake the user-agent for RESIF
  var options = {
    "host": parsed.host,
    "path": parsed.path,
    "headers": {
      "user-agent": "Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:49.0) Gecko/20100101 Firefox/49.0"
    }
  }

  return options;

}

/*
 * Thread.Open
 *
 * Opens and resets a thread
 *
 * :: requestUrl - url to be handled by the thread
 *
 */
Thread.prototype.Open = function(requestUrl) {

  // Lock thread
  this.running = true;

  this.threadStart = new Date();

  // Create empty data buffer
  this.dataBuffer = new Array();

  this.request = null;
  this.statusCode = 0;
  this.nBytesBuffered = 0;
  this.nBytesTotal = 0;

  // Set the request URL and options
  this.requestUrl = requestUrl;
  this.options = this.GetRequestOptions(requestUrl);

}

/*
 * Thread.Close
 *
 * Closes a thread by setting running to false
 * Keep thread integrity until it is reopened
 *
 */
Thread.prototype.Close = function() {

  this.running = false;

}

module.exports = Thread;
