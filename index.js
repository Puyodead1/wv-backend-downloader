const WebSocket = require("ws");
const fetch = require("node-fetch");
const http = require("http");
const fs = require("fs");
const { join } = require("path");

const wss = new WebSocket.Server({ port: 8080 });

var download = function (url, dest, cb) {
  var file = fs.createWriteStream(dest);
  var request = http
    .get(url, function (response) {
      response.pipe(file);
      file.on("finish", function () {
        file.close(cb); // close() is async, call cb after close completes.
      });
    })
    .on("error", function (err) {
      // Handle errors
      fs.unlinkSync(dest); // Delete the file async. (But we don't check the result)
      if (cb) cb(err.message);
    });
};

wss.on("connection", function connection(ws) {
  console.log("connection");
  ws.on("message", async function incoming(message) {
    console.log("received msg");
    const parsed = JSON.parse(message);
    const audioStream = parsed.audioStream;
    const videoStream = parsed.videoStream;
    const key = parsed.key;

    const audioId = audioStream.downloadable_id;
    const videoId = videoStream.downloadable_id;

    const audioUrl = audioStream.urls[0].url;
    const videoUrl = videoStream.urls[0].url;

    const audioFilePath = join(__dirname, "tmp", audioId);
    const videoFilePath = join(__dirname, "tmp", videoId);

    download(audioUrl, audioFilePath, function (err) {
      if (err) console.error(err);
      console.log("Audio download complete?");
    });
  });
});
