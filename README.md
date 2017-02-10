# NodeJS-Federator
NodeJS Implementation of EIDA Federator.

## Configuration

* `PORT` - Port to expose the service on
* `HOST` - Host to expose the service on
* `NAME` - Name of the service
* `LOGPATH` - Path to where to save logfiles
* `MAXIMUM_NUMBER_OF_THREADS` - Number of simultaneous threads
* `MAXIMUM_BYTES_FLUSH` - Maximum number of bytes cached in memory for a single thread before flushing
* `VERISON` - Service version
* `SENDER` - Sender of FDSNStationXML document
* `SOURCE` - Source of FDSNStationXML document
* `THREAD_TIMEOUT_MS` - Number of miliseconds after which a thread is aborted
* `BASE_URL` - Base path to expose the Federator on
* `SERVICE_CLOSED` - Service closed for maintenance
