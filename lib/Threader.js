const CONFIG = require("../Config");
const Http = require("http");
const Thread = require("./Thread");

const MAXIMUM_RECORD_LENGTH_BYTES = 4096;

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
      if(response.statusCode === 200) {

        // Save the response to the buffer
        Thread.nBytesBuffered += data.length;
        Thread.dataBuffer.push(data);

        // Request is excessively large in memory (only for dataselect)
        // Flush the thread to the user
        if(self.Handler.stream.service === "dataselect" && Thread.nBytesBuffered > CONFIG.MAXIMUM_BYTES_FLUSH) {
          self.FlushThread(Thread);
        }

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
 * Flushes a given thread from memory to the user
 * and makes sure only full records are returned.
 * Flushing should rarely happen when a thread is not closed
 * and occupies an excessive amount of memory
 *
 * :: thread - thread to be flushed
 *
 */
Threader.prototype.FlushThread = function(thread) {

  // If there is data in the buffer to be flushed
  if(thread.dataBuffer.length) {

    thread.nBytesTotal += thread.nBytesBuffered;

    this.emitter.emit("header");

    // Concatenate the array buffer to a single buffer
    var dataBuffer = Buffer.concat(thread.dataBuffer);

    // Fully flush the buffer if thread is closed (not running)
    // Otherwise make sure we flush a multiple of the maximum record length
    // since we do not want to flush incomplete records!
    if(!thread.running) {

      // Flush entire buffer and reset
      this.emitter.emit("dataBuffer", dataBuffer);

      thread.dataBuffer = new Array();
      thread.nBytesBuffered = 0;

    } else {

      // Determine the byte index to slice the buffer from
      // Keep the remaining data in the buffer to be flushed later when the thread is re-flushed or closed
      var sliceIndex = MAXIMUM_RECORD_LENGTH_BYTES * Math.floor(dataBuffer.length / MAXIMUM_RECORD_LENGTH_BYTES);

      // Slice the part of the buffer that is surely complete
      this.emitter.emit("dataBuffer", dataBuffer.slice(0, sliceIndex));

      // Save the remaining data to be flushed later
      thread.dataBuffer = [dataBuffer.slice(sliceIndex)];
      thread.nBytesBuffered = dataBuffer.length - sliceIndex;

    }

  }

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
    "nBytes": thread.nBytesTotal,
    "host": thread.options.host,
    "msRequestTime": new Date() - thread.threadStart
  }, "Thread Closed");

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
