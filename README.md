# NodeJS-Federator
NodeJS Implementation of EIDA Federator. Only support for GET requests. The WFCatalog queries are not being routed and will not work.

## Installation and Running

`npm install` followed by `npm start`

## Routes

* `/version`
* `/application.wadl`
* `/station/query`
* `/station/application.wadl`
* `/dataselect/query`
* `/dataselect/application.wadl`
* `/wfcatalog/query`
* `/wfcatalog/application.wadl`

## Configuration

* `PORT` - Port to expose the service on
* `HOST` - Host to expose the service on
* `NAME` - Name of the service
* `DOCUMENTATION_URI` - URL for document of service description
* `LOGPATH` - Path to where to save logfiles
* `MAXIMUM_NUMBER_OF_THREADS` - Number of simultaneous threads
* `MAXIMUM_BYTES_FLUSH` - Maximum number of bytes cached in memory for a single thread before flushing
* `MAXIMUM_QUERYSTRING_BYTES` - Maximum URI length allowed
* `VERSION` - Service version
* `SENDER` - Sender of FDSNStationXML document
* `SOURCE` - Source of FDSNStationXML document
* `THREAD_TIMEOUT_MS` - Number of miliseconds after which a thread is aborted
* `BASE_URL` - Base path to expose the Federator on
* `ROUTING_HOST` - Host of the routing service
* `SERVICE_CLOSED` - Service closed for maintenance
