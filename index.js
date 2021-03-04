const fs = require("fs");
const { join } = require("path");
const { exec, spawn } = require("child_process");
const sanitize = require("./sanitize");
const sanitize2 = require("sanitize-filename");
// const progress = require("request-progress");
const parseXML = require("xml2js").parseStringPromise;
const fetch = require("node-fetch");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const notifier = require("node-notifier");

const app = express();
app.use(bodyParser.json({ limit: "100mb" }));
app.use(cors());

app.post("/rip", async (req, res) => {
  const { platform } = req.body;
  console.log(req.body);
  if (!platform) return res.status(400).send("Missing Platform");

  if (platform === "netflix") {
    res.sendStatus(200);
    await processNetflix(req.body);
  } else if (platform === "hulu") {
    res.sendStatus(200);
    await processHulu(req.body);
  } else {
    return res.status(400).send("Invalid Platform");
  }
});

app.listen(8088, () => {
  console.log(`Server listening on port 8088`);
});

// const dotRegex = new RegExp(/(?<=[a-zA-Z0-9])\.+(?=[a-zA-Z0-9])/);

function printProgress(progress) {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  process.stdout.write(progress);
}

// function indexOfMax(arr) {
//   if (arr.length === 0) {
//     return -1;
//   }

//   var max = arr[0];
//   var maxIndex = 0;

//   for (var i = 1; i < arr.length; i++) {
//     if (arr[i] > max) {
//       maxIndex = i;
//       max = arr[i];
//     }
//   }

//   return maxIndex;
// }

// function test(index, key, videoFileName) {
//   const decPath = join(__dirname, "tmp", `${videoFileName}.dectest`);
//   return new Promise((resolve, reject) => {
//     const child = exec(
//       `mp4decrypt --key ${index}:${key} "${join(
//         __dirname,
//         "tmp",
//         videoFileName
//       )}" "${decPath}"`
//     );
//     child.on("error", (err) => {
//       console.error(err);
//     });
//     child.on("message", (msg, _) => {
//       console.log(msg);
//     });
//     child.on("exit", (code) => {
//       const end = Date.now();
//       if (fs.existsSync(decPath)) {
//         fs.unlinkSync(decPath);
//       }
//       if (code !== 0) {
//         reject(code);
//       }

//       resolve(end);
//     });
//   });
// }

const downloadNew = (url, dir, file) => {
  return new Promise((resolve, reject) => {
    const child = spawn("aria2c", [
      "--auto-file-renaming=false",
      "-c",
      "-j3",
      "-x3",
      "-s3",
      "-d",
      dir,
      "-o",
      file,
      url,
    ]);
    child.stdout.on("data", (data) => {
      printProgress(data.toString());
    });
    child.stderr.on("data", (data) => {
      printProgress(data.toString());
    });
    child.on("error", (err) => printProgress(err.toString()));
    child.on("message", (msg, _) => printProgress(msg));
    child.on("exit", (code) => {
      if (code !== 0) {
        reject(`aria2c exited with code ${code}`);
      }

      // console.log(
      //   `${outFileName.replace(
      //     "%QUALITY%",
      //     `${video.$.height}p`
      //   )} has been successfully downloaded!`
      // );
      resolve();
    });
  });
};

function fetchMpd(url) {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then((r) => r.text())
      .then((r) => resolve(r))
      .catch((e) => reject(e));
  });
}

async function processHulu(parsed) {
  const metadata = parsed.metadata;
  const manifest = parsed.manifest;
  // const outFileName = sanitize2(parsed.outFileName);
  const keys = parsed.keys;

  const mpdUrl = manifest.stream_url;
  const mpdXml = await fetchMpd(mpdUrl);

  const mpdJson = await parseXML(mpdXml);
  const adaptationset = mpdJson.MPD.Period[0].AdaptationSet;
  const audio = adaptationset[0].Representation.pop();
  console.debug(audio);
  console.debug(`Audio metadata: ${JSON.stringify(audio.$)}`);
  // const audioCodec = audio.$.codecs.replace(dotRegex, " ");
  const audioUrl = audio.BaseURL[0];
  const audioID = audio.$.id.split(".")[0];

  const video = adaptationset[1].Representation.pop();
  console.debug(video);
  // const videoCodec=video.$.codecs.replace(dotRegex, " ")
  const videoUrl = video.BaseURL[0];
  console.debug(`Video metadata: ${JSON.stringify(video.$)}`);
  const videoID = video.$.id.split(".")[0];

  const title = sanitize2(metadata.name);
  const type = parsed.href_type;

  const audioFileName = `${audioID}_audio`;
  const videoFileName = `${videoID}_video`;

  const decryptedAudioFilePath = join(__dirname, "tmp", "audio.decrypted");
  const decryptedVideoFilePath = join(__dirname, "tmp", "video.decrypted");

  ///
  const episode =
    type === "series"
      ? metadata.seasons
          .find((x) => x.items.find((y) => y.id === parsed.id))
          .items.find((x) => x.id === parsed.id)
      : null;
  const episodeShortname =
    episode.number.length === 1 ? `E0${episode.number}` : `E${episode.number}`;
  const seasonShortname =
    type === "series"
      ? episode.season.length === 1
        ? `S0${episode.season}`
        : `S${episode.season}`
      : null;

  var outFileName;
  if (parsed.href_type === "series") {
    outFileName = sanitize(
      `${episode.series_name}.${seasonShortname}.${episodeShortname}-${episode.name}.WEB.%QUALITY%.mp4`
    );
  } else if (metadata.video.type === "movie") {
    outFileName = `${metadata.video.title}.mp4`;
  } else {
    console.warn("unknown video type: " + parsed.href_type);
    outFileName = `unknown.mp4`;
  }

  const finalOutputPath =
    type === "series"
      ? join(
          __dirname,
          "output",
          title,
          seasonShortname,
          outFileName.replace("%QUALITY%", `${video.$.height}p`)
        )
      : join(
          __dirname,
          "output",
          outFileName.replace("%QUALITY%", `${video.$.height}p`)
        );
  const finalOutputFolderPath =
    type === "series"
      ? join(__dirname, "output", title, seasonShortname)
      : join(__dirname, "output");

  if (type === "series" && !fs.existsSync(finalOutputFolderPath)) {
    fs.mkdirSync(finalOutputFolderPath, { recursive: true });
  }

  console.debug(`Final output path: ${finalOutputPath}`);
  ///

  const audioKID = adaptationset[0].ContentProtection[0].$["cenc:default_KID"];
  const videoKID = adaptationset[1].ContentProtection[0].$["cenc:default_KID"];

  console.debug("KID of audio file is " + audioKID);
  const audioKeyObj = keys.find((x) => x.kid === audioKID);
  if (!audioKeyObj)
    return console.error(
      "No KID Match. Manual intervention may be needed!\n" + keys
    );
  console.debug("Audio KID Match is " + JSON.stringify(audioKeyObj));
  const audioKey = audioKeyObj.key;
  if (!audioKey) return console.error("audio Key was undefined!");
  console.debug("audio decryption key is " + audioKey);

  console.debug("KID of video file is " + videoKID);
  const videoKeyObj = keys.find((x) => x.kid === videoKID);
  if (!videoKeyObj)
    return console.error(
      "No KID Match. Manual intervention may be needed!\n" + keys
    );
  console.debug("Video KID Match is " + JSON.stringify(videoKeyObj));
  const videoKey = videoKeyObj.key;
  if (!videoKey) return console.error("Video Key was undefined!");
  console.debug("video decryption key is " + videoKey);

  await downloadNew(audioUrl, "tmp", audioFileName).catch((e) => {
    console.error(e);
  });
  console.log("Audio download complete, starting decryption...");

  const child = exec(
    `mp4decrypt --key 1:${audioKey} "${join(
      __dirname,
      "tmp",
      audioFileName
    )}" "${decryptedAudioFilePath}"`
  );
  child.on("error", (err) => {
    console.error(err);
  });
  child.on("message", (msg, _) => {
    console.log(msg);
  });
  child.on("exit", (code) => {
    if (code !== 0) {
      console.error(`mp4decrypt exited with code ${code}`);
      process.exit(code);
    }

    console.log(`Audio decryption complete`);
  });

  await downloadNew(videoUrl, "tmp", videoFileName).catch((e) => {
    console.error(e);
  });

  console.log("Video download complete, starting decryption");
  // decrypt video file
  const child3 = exec(
    `mp4decrypt --key 1:${videoKey} "${join(
      __dirname,
      "tmp",
      videoFileName
    )}" "${decryptedVideoFilePath}"`
  );
  child3.on("error", (err) => {
    console.error(err);
  });
  child3.on("message", (msg, _) => {
    console.log(msg);
  });
  child3.on("exit", (code) => {
    if (code !== 0) {
      console.error(`mp4decrypt exited with code ${code}`);
      process.exit(code);
    }

    console.log(`Video decryption complete`);
    console.log("Merging audio and video...");

    // const child2 = exec(
    //   `ffmpeg -i "${decryptedVideoFilePath}" -i "${audioFilePath}" -c:v copy -c:a aac "${finalOutputPath}"`
    // );
    const child2 = spawn("ffmpeg", [
      "-i",
      decryptedVideoFilePath,
      "-i",
      decryptedAudioFilePath,
      "-c",
      "copy",
      finalOutputPath,
    ]);
    console.log(child2.spawnargs.join(" "));
    child2.stdout.on("data", (data) => {
      console.log(data.toString());
    });
    child2.stderr.on("data", (data) => {
      console.error(data.toString());
    });
    child2.on("error", (err) => console.error(err));
    child2.on("message", (msg, _) => console.log(msg));
    child2.on("exit", (code) => {
      if (code !== 0) {
        console.error(`ffmpeg exited with code ${code}`);
        process.exit(code);
      }

      console.log(
        `${outFileName.replace(
          "%QUALITY%",
          `${video.$.height}p`
        )} has been successfully downloaded!`
      );
      fs.unlink(join(__dirname, "tmp", audioFileName), () =>
        console.log("Audio temp file deleted")
      );
      fs.unlink(join(__dirname, "tmp", videoFileName), () =>
        console.log("Video temp file deleted")
      );
      fs.unlink(decryptedAudioFilePath, () =>
        console.log("decrypted audio temp file deleted")
      );
      fs.unlink(decryptedVideoFilePath, () =>
        console.log("decrypted video temp file deleted")
      );
    });
  });
}

async function processNetflix(parsed) {
  const metadata = parsed.metadata;
  const manifest = parsed.manifest;
  const audioStream = manifest.audioStream;
  const videoStream = manifest.videoStream;
  const decryptedContentKeys = manifest.keys;
  console.log("Manifest:", manifest);
  console.log("Metadata:", metadata);

  const title = sanitize(metadata.video.title);
  const type = metadata.video.type;

  const audioId = audioStream.downloadable_id;
  const videoId = videoStream.downloadable_id;

  const audioUrl = audioStream.urls[0].url;
  const videoUrl = videoStream.urls[0].url;

  const audioFileName = `${audioId}_audio`;
  const videoFileName = `${videoId}_video`;

  const audioFilePath = join(__dirname, "tmp", audioFileName);
  const videoFilePath = join(__dirname, "tmp", videoFileName);

  const decryptedVideoFilePath = join(__dirname, "tmp", "video.decrypted");

  const episodeSeason =
    type === "show"
      ? metadata.video.seasons.find((x) =>
          x.episodes.find((y) => y.id === metadata.video.currentEpisode)
        )
      : null;

  const seasonShortname =
    type === "show"
      ? episodeSeason.seq.toString().length === 1
        ? `S0${episodeSeason.seq}`
        : `S${episodeSeason.seq}`
      : null;

  const episode = episodeSeason.episodes.find(
    (x) => x.id === metadata.video.currentEpisode
  );

  const finalOutputPath =
    type === "show"
      ? join(
          __dirname,
          "output",
          title,
          seasonShortname,
          sanitize(manifest.outFileName)
        )
      : join(__dirname, "output", sanitize(manifest.outFileName));
  const finalOutputFolderPath =
    type === "show"
      ? join(__dirname, "output", title, seasonShortname)
      : join(__dirname, "output");

  if (type === "show" && !fs.existsSync(finalOutputFolderPath)) {
    fs.mkdirSync(finalOutputFolderPath, { recursive: true });
  }

  console.debug(`Final output path: ${finalOutputPath}`);

  await downloadNew(audioUrl, "tmp", audioFileName).catch((e) =>
    console.error(e)
  );
  console.log("Audio download complete");

  await downloadNew(videoUrl, "tmp", videoFileName).catch((e) =>
    console.error(e)
  );
  console.log("Video download complete");

  console.debug("KID of video file is " + manifest.kid);
  const kidMatch = decryptedContentKeys.find((x) => x.kid === manifest.kid);
  if (!kidMatch)
    return console.error(
      "No KID Match. Manual intervention may be needed!\n" +
        decryptedContentKeys
    );
  console.debug("KID Match is " + JSON.stringify(kidMatch));
  const key = kidMatch.key;
  if (!key) return console.error("Key was undefined!");
  console.debug("Video file key is " + key);

  // we need to find the correct track to decrypt, sometimes its 1, other times its 2
  // const results = [];
  // for (var i = 0; i < 2; i++) {
  //   var index = i + 1;
  //   const start = Date.now();
  //   const end = await test(index, key, videoFileName);
  //   results[i] = end - start;
  // }
  // const trackIndex = indexOfMax(results);
  // const trackID = trackIndex + 1;

  // console.debug(
  //   `We have determined that the correct track to decrypt is ${trackID}; the results of the test were: `,
  //   results
  // );

  console.debug(JSON.stringify(decryptedContentKeys));

  // now we can attempt to decrypt the video file :D
  const child = exec(
    `mp4decrypt --key 2:${key} "${videoFilePath}" "${decryptedVideoFilePath}"`
  );
  child.on("error", (err) => {
    console.error(err);
  });
  child.on("message", (msg, _) => {
    console.log(msg);
  });
  child.on("exit", (code) => {
    if (code !== 0) {
      console.error(`mp4decrypt exited with code ${code}`);
      process.exit(code);
    }

    console.log(`Video decryption complete`);
    console.log("Merging audio and video...");

    const child2 = spawn("ffmpeg", [
      "-i",
      decryptedVideoFilePath,
      "-i",
      audioFilePath,
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      finalOutputPath,
    ]);
    console.log(child2.spawnargs.join(" "));
    child2.stdout.on("data", (data) => {
      console.log(data.toString());
    });
    child2.stderr.on("data", (data) => {
      console.error(data.toString());
    });
    child2.on("error", (err) => console.error(err));
    child2.on("message", (msg, _) => console.log(msg));
    child2.on("exit", (code) => {
      if (code !== 0) {
        console.error(`ffmpeg exited with code ${code}`);
        process.exit(code);
      }

      console.log(`${manifest.outFileName} has been successfully downloaded!`);
      fs.unlink(join(__dirname, "tmp", audioFileName), () =>
        console.log("Audio temp file deleted")
      );
      fs.unlink(join(__dirname, "tmp", videoFileName), () =>
        console.log("Video temp file deleted")
      );
      fs.unlink(decryptedVideoFilePath, () =>
        console.log("decrypted video temp file deleted")
      );

      notifier.notify({
        title: "Download Complete",
        message: `${metadata.video.title}: S${episodeSeason.seq} E${episode.seq} - ${episode.title}`,
        sound: true,
        wait: false,
        time: 90000,
      });
    });
  });
}
