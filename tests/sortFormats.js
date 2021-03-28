const data = require("./testManifest.json");
const { sortFormats, sortAdaptationSets } = require("../utils");
// all audio adaptation sets in english
const audioAdaptationSets = data.MPD.Period[0].AdaptationSet.filter(
  (x) =>
    x.$.contentType &&
    x.$.contentType === "audio" &&
    x.$.lang &&
    x.$.lang === "en"
);

// sorts all audio adaptation sets and returns the best one
const bestAudioRepresentation = audioAdaptationSets
  .sort(sortAdaptationSets)
  .shift().Representation;

console.log(bestAudioRepresentation);
