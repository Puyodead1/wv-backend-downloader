const fs = require("fs");
const { join } = require("path");
const { exec, spawn } = require("child_process");

const dateDiffToString = (a, b) => {
  let diff = Math.abs(a - b);

  let ms = diff % 1000;
  diff = (diff - ms) / 1000;
  let s = diff % 60;
  diff = (diff - s) / 60;
  let m = diff % 60;
  diff = (diff - m) / 60;
  let h = diff;

  let ss = s <= 9 && s >= 0 ? `0${s}` : s;
  let mm = m <= 9 && m >= 0 ? `0${m}` : m;
  let hh = h <= 9 && h >= 0 ? `0${h}` : h;
  let mms = ms <= 9 && ms >= 0 ? `0${ms}` : ms;

  return hh + ":" + mm + ":" + ss + ":" + mms;
};

function test(index) {
  const decPath = join(__dirname, "..", "tmp", "69736855_video.dectest");
  return new Promise((resolve, reject) => {
    const child = exec(
      `mp4decrypt --key ${index}:fc384cea4f47e6188804716dd64222e4 "${join(
        __dirname,
        "..",
        "tmp",
        "69736855_video"
      )}" "${decPath}"`
    );
    child.on("error", (err) => {
      console.error(err);
    });
    child.on("message", (msg, _) => {
      console.log(msg);
    });
    child.on("exit", (code) => {
      const end = Date.now();
      if (fs.existsSync(decPath)) {
        fs.unlinkSync(decPath);
      }
      if (code !== 0) {
        reject(code);
      }

      resolve(end);
    });
  });
}

function indexOfMax(arr) {
  if (arr.length === 0) {
    return -1;
  }

  var max = arr[0];
  var maxIndex = 0;

  for (var i = 1; i < arr.length; i++) {
    if (arr[i] > max) {
      maxIndex = i;
      max = arr[i];
    }
  }

  return maxIndex;
}

(async () => {
  const results = [];
  for (var i = 0; i < 2; i++) {
    var index = i + 1;
    const start = Date.now();
    const end = await test(index);
    results[i] = end - start;
  }
  const trackIndex = indexOfMax(results);
  const trackID = trackIndex + 1;
  console.log(`Index: ${trackIndex}; Correct Track ID: ${trackID}`);
})();
