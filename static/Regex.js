/*
 * Object of regex to check user input against
 */

module.exports = {
  "float":  /^(?:[1-9]\d*|0)?(?:\.\d+)?$/,
  "int": /^\d+$/,
  "stringListWildcards": /^([0-9a-z_*?]+,){0,}([0-9a-z_*?]+)$/i,
  "level": /^(network|station|channel|response)$/i,
  "include": /^(default|sample|header|all)$/i,
  "quality": /^(D|R|Q|M|B)$/i,
  "boolean": /^(true|false)$/i,
  "formatWFCatalog": /^json$/i,
  "granularity": /^day$/i,
  "query": /^\?([\w-?.:*,]+(=[\w-?.:*,]*)?(&[\w-?.:*,]+(=[\w-?.:*,]*)?)*)?$/
}
