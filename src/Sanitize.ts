import truncate from "truncate-utf8-bytes";

const illegalRe = /[\/\?<>\\:\*\|":]/g;
const controlRe = /[\x00-\x1f\x80-\x9f]/g;
const reservedRe = /^\.+$/;
const windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;

function sanitize(
  input: string,
  replacement: string = "",
  replaceSpaces: boolean = true
) {
  let sanitized = replaceSpaces
    ? input
        .replace(/\s+/g, ".")
        .replace(illegalRe, replacement)
        .replace(controlRe, replacement)
        .replace(reservedRe, replacement)
        .replace(windowsReservedRe, replacement)
    : input
        .replace(illegalRe, replacement)
        .replace(controlRe, replacement)
        .replace(reservedRe, replacement)
        .replace(windowsReservedRe, replacement);

  return truncate(sanitized, 255);
}

export default function (
  input: string,
  options?: { replacement?: string; replaceSpaces?: boolean }
) {
  return sanitize(input, options?.replacement, options?.replaceSpaces);
}
