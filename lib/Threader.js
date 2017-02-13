const CONFIG = require("../Config");
const Http = require("http");
const Thread = require("./Thread");

/*
 * Class Threader
 *
 * Main class for threading multiple requests
 *
 * :: handler - Parent Request Handler Class
 *
 */
var Threader = function(handler) {

  // Dataselect or station
  this.Handler = handler;

  this.running = false;

  // Keep references to all the individual threads in the threader
  this.threads = new Array();

}

/*
 * Threader.Get
 *
 * Parallel and asynchronous handling of multiple requests
 * forwards completed thread through the requestEmitter
 *
 * :: requests - array of URLs to be requested
 * :: requestEmitter - callback pointing to the emitter
 *
 */
Threader.prototype.Get = function(requests, requestEmitter) {

  // The threader is already active
  if(this.running) {
    return;
  }

  // Lock the threader
  this.running = true;

  this.threadingStart = new Date();

  // Point the emitter
  this.emitter = requestEmitter;
  this.requests = requests;

  // Determine the number of threads to run
  const nThreads = Math.min(requests.length, CONFIG.MAXIMUM_NUMBER_OF_THREADS);

  // Create threads
  for(var i = 0; i < nThreads; i++) {
    this.threads.push(new Thread(i));
  }

  // Open all the created threads
  for(var i = 0; i < this.threads.length; i++) {
    this.OpenThread(this.threads[i]);
  }

}

/*
 * Threader.NextRequest
 *
 * Returns the next request in the queue
 *
 */
Threader.prototype.NextRequest = function() {

  return this.requests.pop();

}

/*
 * Threader.OpenThread
 *
 * Opens a particular thread
 *
 * :: Thread - thread to be opened
 *
 */
Threader.prototype.OpenThread = function(Thread) {

  // Keep reference
  var self = this;

  // Open thread with the next request
  Thread.Open(this.NextRequest());

  // Make the request
  Thread.request = Http.get(Thread.options, function(response) {

    clearTimeout(threadRequestTimeout);

    Thread.statusCode = response.statusCode;

    // Data returned
    response.on("data", function(data) {

      // Only allow succesful requests
      if(response.statusCode !== 200) {
        return;
      }

      // Save the response to the buffer
      Thread.nBytes += data.length;
      Thread.dataBuffer.push(data);

      // Request is excessively large in memory (only for dataselect)
      // Flush the thread to the user
      if(self.Handler.stream.service === "dataselect" && Thread.nBytes > CONFIG.MAXIMUM_BYTES_FLUSH) {
        self.FlushThread(Thread);
      }

    });

    // HTTP response has finished
    response.on("end", function() {
      self.CloseThread(Thread);
    });

  });

  // Request was aborted or killed
  Thread.request.on("error", function(error) {
    clearTimeout(threadRequestTimeout);
    self.CloseThread(Thread);
  });

  // Set a timeout on each request
  var threadRequestTimeout = setTimeout(function() {
    Thread.request.abort();
  }, CONFIG.THREAD_TIMEOUT_MS);

  // End the request
  Thread.request.end();

}

/*
 * Threader.FlushThread
 *
 * Flushes a given thread from memory to user
 *
 * :: thread - thread to be flushed
 *
 */
Threader.prototype.FlushThread = function(thread) {

  // Flush thread to the user and add header (once)
  if(thread.dataBuffer.length) {
    this.emitter.emit("header");
    this.emitter.emit("data", thread);
  }

  // Reset the data buffer
  thread.dataBuffer = new Array();

}

/*
 * Threader.Kill
 *
 * Forced the threader to be killed and aborts
 * all running requests
 *
 */
Threader.prototype.Kill = function() {

  // Threader is not running
  if(!this.running) {
    return;
  }

  // First abort all running threads
  this.threads.forEach(function(thread) {
    if(thread.running && thread.request !== null) {
      thread.request.abort();
    }
  });

  // Close the threader
  this.Close();

}

/*
 * Threader.LogThread
 *
 * Logs thread trace to outfile
 *
 * :: thread - thread to be logged
 *
 */
Threader.prototype.LogThread = function(thread) {

  // Increment thread success counters
  if(thread.statusCode === 200) {
    this.Handler.nRoutesSuccess++;
  } else if(thread.statusCode === 204) {
    this.Handler.nRoutesEmpty++;
  } else {
    this.Handler.nRoutesFailed++;
  }

  // Call the request handler logging
  this.Handler.Logger.info({
    "id": this.Handler.id,
    "statusCode": thread.statusCode,
    "nBytes": thread.nBytes,
    "host": thread.options.host,
    "msRequestTime": new Date() - thread.threadStart
  }, "thread closed");

}

/*
 * Threader.CloseThread
 *
 * Closes thread and flushes the data buffer
 * and re-queues for another request
 *
 * :: thread - thread to be flushed and closed
 *
 */
Threader.prototype.CloseThread = function(thread) {

  // Log and close the thread
  this.LogThread(thread);

  thread.Close();

  // Do nothing if the threader has been killed
  if(!this.running) {
    return;
  }

  // Send the payload to be emitted
  this.FlushThread(thread);

  // Re-queue for another request
  if(this.requests.length) {
    return this.OpenThread(thread);
  }

  // Check if the threader is exhausted
  if(this.Exhausted()) {
    this.Close();
  }

}

/*
 * Threader.Close
 *
 * When the threader is exhausted close and
 * emit a stop event
 *
 * :: error - error to be propagated
 *
 */
Threader.prototype.Close = function(error) {

  // Set running to false
  this.running = false;

  // Emit the final end event
  this.emitter.emit("end", error);

}

/*
 * Threader.Exhausted
 *
 * Returns true if the thread has exhausted all requests
 * otherwise returns false
 *
 */
Threader.prototype.Exhausted = function() {

  // If every thread is sleeping
  return this.threads.every(function(thread) {
    return !thread.running;
  });

}

module.exports = Threader;
