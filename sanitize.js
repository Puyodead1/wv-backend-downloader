var truncate = require("truncate-utf8-bytes");

var illegalRe = /[\/\?<>\\:\*\|":]/g;
var controlRe = /[\x00-\x1f\x80-\x9f]/g;
var reservedRe = /^\.+$/;
var windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;

function sanitize(input, replacement) {
  var sanitized = input
    .replace(/\s+/g, "_")
    .replace(illegalRe, replacement)
    .replace(controlRe, replacement)
    .replace(reservedRe, replacement)
    .replace(windowsReservedRe, replacement);
  return truncate(sanitized, 255);
}

module.exports = function (input, options) {
  var replacement = (options && options.replacement) || "";
  var output = sanitize(input, replacement);
  if (replacement === "") {
    return output;
  }
  return sanitize(output, "");
};
