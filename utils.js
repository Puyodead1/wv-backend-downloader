// Use these to help sort formats, higher index is better.
const audioEncodingRanks = ["mp4a", "mp3", "vorbis", "aac", "opus", "flac"];
const videoEncodingRanks = [
  "mp4v",
  "avc1",
  "Sorenson H.283",
  "MPEG-4 Visual",
  "VP8",
  "VP9",
  "H.264",
];

const getVideoBandwidth = (format) => format.$.bandwidth || 0;
const getVideoEncodingRank = (format) =>
  videoEncodingRanks.findIndex(
    (enc) => format.$.codecs && format.$.codecs.includes(enc)
  );
const getAudioBandwidth = (format) => format.$.maxBandwidth || 0;
const getAudioEncodingRank = (format) =>
  audioEncodingRanks.findIndex(
    (enc) =>
      format.Representation[0].codecs &&
      format.Representation[0].codecs.includes(enc)
  );

/**
 * Sort formats by a list of functions.
 *
 * @param {Object} a
 * @param {Object} b
 * @param {Array.<Function>} sortBy
 * @returns {number}
 */
const sortFormatsBy = (a, b, sortBy) => {
  let res = 0;
  for (let fn of sortBy) {
    res = fn(b) - fn(a);
    if (res !== 0) {
      break;
    }
  }
  return res;
};

/**
 * Sort formats from highest quality to lowest.
 *
 * @param {Object} a
 * @param {Object} b
 * @returns {number}
 */
exports.sortFormats = (a, b) =>
  sortFormatsBy(a, b, [
    (format) => parseInt(format.$.height) || 0,
    getVideoBandwidth,
    getAudioBandwidth,
    getVideoEncodingRank,
    getAudioEncodingRank,
  ]);

/**
 * Sort formats from highest quality to lowest.
 *
 * @param {Object} a
 * @param {Object} b
 * @returns {number}
 */
exports.sortAdaptationSets = (a, b) =>
  sortFormatsBy(a, b, [getAudioBandwidth, getAudioEncodingRank]);

exports.getBaseURL = (url) => {
  const the_arr = url.split("/");
  the_arr.pop();
  return the_arr.join("/");
};
