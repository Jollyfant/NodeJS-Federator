/*
 * Object of regex to check user input against
 */

module.exports = {
  "float":  /^(?:[1-9]\d*|0)?(?:\.\d+)?$/,
  "stringListWildcards": /^([0-9a-z_*?]+,){0,}([0-9a-z_*?]+)$/i,
  "level": /^(network|station|channel|response)$/i,
  "include": /^(default|sample|header|all)$/i,
  "query": /^\?([\w-?.:*,]+(=[\w-?.:*,]*)?(&[\w-?.:*,]+(=[\w-?.:*,]*)?)*)?$/
}
