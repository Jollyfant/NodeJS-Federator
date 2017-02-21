/*
 * Runs a cluster of webserver processes
 *
 */

const cluster = require("cluster");

const Service = require("./Federator");
const CONFIG = require("./Config");

const numWorkers = Math.min(require("os").cpus().length, CONFIG["MAXIMUM_NUMBER_OF_WORKERS"]);

// Start the cluster
if(cluster.isMaster) {

  // Create N forks
  for(var i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  // Worker has died, restart if required
  cluster.on("exit", function(worker, code, signal) {

    if(CONFIG.RESPAWN) {
      console.log("[Worker " + worker.process.pid + "] killed with code: " + code + ", and signal: " + signal + ". Respawning.");
      cluster.fork();
    }

  });

} else {

  // Create the Services
  // Wrap in closure to pass worker.id
  new Service(function() {
    console.log("[Worker " + cluster.worker.id + "] Service has been started on " + CONFIG.HOST + ":" + CONFIG.PORT);
  });

}

