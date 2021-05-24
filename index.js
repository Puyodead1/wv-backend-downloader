const fs = require("fs");
const { join } = require("path");
const { exec, spawn } = require("child_process");
const sanitize = require("./sanitize");
const sanitize2 = require("sanitize-filename");
// const progress = require("request-progress");
const parseXML = require("xml2js").parseStringPromise;
const fetch = require("node-fetch").default;
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const notifier = require("node-notifier");
const { default: PQueue } = require("p-queue");
const m3u8parser = require("m3u8-parser");
const {
  sortFormats,
  sortAdaptationSets,
  getBaseURL,
  sortAudioRepresentationsSets,
} = require("./utils");
const { inspect } = require("util");
const queue = new PQueue({ concurrency: 1 });

queue.on("add", () => {
  console.log(
    `New task was added.  Size: ${queue.size}; Pending: ${queue.pending}`
  );
});

queue.on("idle", () => {
  console.log(
    `The queue is idle. Size: ${queue.size}; Pending: ${queue.pending}`
  );
});

const app = express();
app.use(bodyParser.json({ limit: "100mb" }));
app.use(cors());

app.post("/rip", async (req, res) => {
  const { platform } = req.body;
  console.log(req.body);
  if (!platform) return res.status(400).send("Missing Platform");

  if (platform === "netflix") {
    res.sendStatus(200);
    //    await processNetflix(req.body);
    await queue.add(async () => {
      await processNetflix(req.body);
    });
  } else if (platform === "hulu") {
    res.sendStatus(200);
    // await processHulu(req.body);
    await queue.add(async () => {
      await processHulu(req.body);
    });
  } else if (platform === "amazon") {
    res.sendStatus(200);
    await queue.add(async () => {
      await processAmazon(req.body);
    });
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

function fetchPlaylist(url) {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then(async (res) => {
        if (res.ok) {
          resolve(await res.text());
        } else {
          reject(res.statusText);
        }
      })
      .catch(reject);
  });
}

function parsePlaylist(text) {
  const parser = new m3u8parser.Parser();
  parser.push(text);
  parser.end();
  return parser;
}

function downloadSegments(segments) {
  return new Promise((resolve, reject) => {});
}

const downloadNew = (url, dir, file) => {
  return new Promise((resolve, reject) => {
    const child = spawn("aria2c", [
      "--auto-file-renaming=false",
      "-c",
      "-j16",
      "-x16",
      "-s16",
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

// TODO: make this function return a promise instead
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

  ///
  const episode =
    type === "series"
      ? metadata.seasons
          .find((x) => x.items.find((y) => y.id === parsed.id))
          .items.find((x) => x.id === parsed.id)
      : null;
  const episodeShortname =
    type === "series"
      ? episode.number.length === 1
        ? `E0${episode.number}`
        : `E${episode.number}`
      : null;
  const seasonShortname =
    type === "series"
      ? episode.season.length === 1
        ? `S0${episode.season}`
        : `S${episode.season}`
      : null;

  var outFileName;
  if (parsed.href_type === "series") {
    outFileName = sanitize(
      `${episode.series_name}.${seasonShortname}.${episodeShortname}.${episode.name}.WEB.%QUALITY%.mp4`
    );
  } else if (metadata.browse.target_type === "movie") {
    outFileName = `${metadata.details.entity.name}.mp4`;
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
  const tmpOutputFolderPath =
    type === "series"
      ? join(__dirname, "tmp", title, seasonShortname)
      : join(__dirname, "tmp");

  if (type === "series" && !fs.existsSync(finalOutputFolderPath)) {
    fs.mkdirSync(finalOutputFolderPath, { recursive: true });
  }

  if (type === "series" && !fs.existsSync(tmpOutputFolderPath)) {
    fs.mkdirSync(tmpOutputFolderPath, { recursive: true });
  }

  const decryptedAudioFilePath = join(
    tmpOutputFolderPath,
    `${audioID}_audio.decrypted`
  );
  const decryptedVideoFilePath = join(
    tmpOutputFolderPath,
    `${videoID}_video.decrypted`
  );

  console.debug(`Final output path: ${finalOutputPath}`);
  console.debug(`Temp output folder path: ${tmpOutputFolderPath}`);
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

  await downloadNew(audioUrl, tmpOutputFolderPath, audioFileName).catch((e) => {
    console.error(e);
  });
  console.log("Audio download complete, starting decryption...");

  const child = exec(
    `mp4decrypt --key 1:${audioKey} "${join(
      tmpOutputFolderPath,
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

  await downloadNew(videoUrl, tmpOutputFolderPath, videoFileName).catch((e) => {
    console.error(e);
  });

  console.log("Video download complete, starting decryption");
  // decrypt video file
  const child3 = exec(
    `mp4decrypt --key 1:${videoKey} "${join(
      tmpOutputFolderPath,
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
      fs.unlink(join(tmpOutputFolderPath, audioFileName), () =>
        console.log("Audio temp file deleted")
      );
      fs.unlink(join(tmpOutputFolderPath, videoFileName), () =>
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

// TODO: make this function return a promise instead
async function processNetflix(parsed) {
  const metadata = parsed.metadata;
  const manifest = parsed.manifest;
  const audioStream = manifest.audioStream;
  const videoStream = manifest.videoStream;
  const subtitleUrl = manifest.subtitleUrl;
  const decryptedContentKeys = parsed.keys;

  const title = sanitize(metadata.video.title);
  const type = metadata.video.type;

  const audioId = audioStream.downloadable_id;
  const videoId = videoStream.downloadable_id;

  // 0 should be the fastest
  const audioUrl = audioStream.urls[0].url;
  const videoUrl = videoStream.urls[0].url;

  const audioFileName = `${audioId}_audio`;
  const videoFileName = `${videoId}_video`;
  const subtitleFileName = `${videoId}_subtitles.xml`;
  const convertedSubtitleFileName = `${subtitleFileName}.srt`;

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

  const episode =
    type === "show"
      ? episodeSeason.episodes.find(
          (x) => x.id === metadata.video.currentEpisode
        )
      : null;

  const finalOutputPath =
    type === "show"
      ? join(
          __dirname,
          "output",
          title,
          seasonShortname,
          sanitize(parsed.outputFileName)
        )
      : join(__dirname, "output", sanitize(parsed.outputFileName));
  const finalOutputFolderPath =
    type === "show"
      ? join(__dirname, "output", title, seasonShortname)
      : join(__dirname, "output");

  const tmpOutputFolderPath =
    type === "show"
      ? join(__dirname, "tmp", title, seasonShortname, sanitize(episode.title))
      : join(__dirname, "tmp");

  const audioFilePath = join(tmpOutputFolderPath, audioFileName);
  const videoFilePath = join(tmpOutputFolderPath, videoFileName);
  const convertedSubtitleFilePath = join(
    tmpOutputFolderPath,
    convertedSubtitleFileName
  );

  const decryptedVideoFilePath = join(tmpOutputFolderPath, "video.decrypted");

  if (type === "show" && !fs.existsSync(finalOutputFolderPath)) {
    fs.mkdirSync(finalOutputFolderPath, { recursive: true });
  }

  if (type === "show" && !fs.existsSync(tmpOutputFolderPath)) {
    fs.mkdirSync(tmpOutputFolderPath, { recursive: true });
  }

  const fileData = `Output path: ${finalOutputPath}\nKeys: ${JSON.stringify(
    decryptedContentKeys
  )}`;
  fs.writeFileSync(join(tmpOutputFolderPath, "data.txt"), fileData);

  console.debug(`Final output path: ${finalOutputPath}`);
  console.debug(`Temp output folder path: ${tmpOutputFolderPath}`);

  if (subtitleUrl) {
    await downloadNew(subtitleUrl, tmpOutputFolderPath, subtitleFileName).catch(
      (e) => console.error(e)
    );
    console.log("Subtitle Download Complete, converting to srt...");

    const pythonchild = exec(
      `python to_srt.py -i "${tmpOutputFolderPath}" -o "${tmpOutputFolderPath}"`
    );
    pythonchild.on("error", (err) => {
      console.error(err);
    });
    pythonchild.on("message", (msg, _) => {
      console.log(msg);
    });
    pythonchild.on("exit", (code) => {
      if (code !== 0) {
        console.error(`to_srt exited with code ${code}`);
      }
    });
  }

  await downloadNew(audioUrl, tmpOutputFolderPath, audioFileName).catch((e) =>
    console.error(e)
  );
  console.log("Audio download complete");

  await downloadNew(videoUrl, tmpOutputFolderPath, videoFileName).catch((e) =>
    console.error(e)
  );
  console.log("Video download complete");

  console.debug("KID of video file is " + parsed.kid);
  const kidMatch = decryptedContentKeys.find((x) => x.kid === parsed.kid);
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
      "-f",
      "srt",
      "-i",
      convertedSubtitleFilePath,
      "-map",
      "0:0",
      "-map",
      "1:0",
      "-map",
      "2:0",
      "-c:v",
      "copy",
      "-c:a",
      "copy",
      "-c:s",
      "mov_text",
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

      console.log(`${parsed.outputFileName} has been successfully downloaded!`);
      fs.unlink(join(__dirname, "tmp", audioFileName), () =>
        console.log("Audio temp file deleted")
      );
      fs.unlink(join(__dirname, "tmp", videoFileName), () =>
        console.log("Video temp file deleted")
      );
      fs.unlink(decryptedVideoFilePath, () =>
        console.log("Decrypted video temp file deleted")
      );
      fs.unlink(convertedSubtitleFilePath, () =>
        console.log("Converted subtitle file deleted")
      );

      const notificationMsg =
        type === "show"
          ? `${metadata.video.title}: S${episodeSeason.seq} E${episode.seq} - ${episode.title}`
          : metadata.video.title;

      notifier.notify({
        title: "Download Complete",
        message: notificationMsg,
        sound: true,
        wait: false,
        time: 90000,
      });
    });
  });
}

// TODO: make this function return a promise instead
async function processAmazon(parsed) {
  const keys = parsed.keys;
  const asin = parsed.asin;

  const dataUrl = `https://atv-ps.amazon.com/cdp/catalog/GetPlaybackResources?deviceID=232fd6a8bec4c540fb035cdf83b90af96b3a899c899b6654932f8f7d&deviceTypeID=AOAGZA014O5RE&gascEnabled=false&marketplaceID=ATVPDKIKX0DER&uxLocale=en_US&firmware=1&clientId=f22dbddb-ef2c-48c5-8876-bed0d47594fd&deviceApplicationName=Chrome&playerType=xp&operatingSystemName=Windows&operatingSystemVersion=10.0&asin=${asin}&consumptionType=Streaming&desiredResources=PlaybackUrls,CatalogMetadata,SubtitleUrls&resourceUsage=CacheResources&videoMaterialType=Feature&userWatchSessionId=b3fe99dc-116c-4c8c-8d2b-23c4ae33ffd4deviceProtocolOverride=Https&deviceStreamingTechnologyOverride=DASH&deviceDrmOverride=CENC&deviceBitrateAdaptationsOverride=CVBR,CBR&deviceHdrFormatsOverride=None&deviceVideoCodecOverride=H264&deviceVideoQualityOverride=HD&audioTrackId=all&languageFeature=MLFv2&liveManifestType=patternTemplate,accumulating,live&supportedDRMKeyScheme=DUAL_KEY&titleDecorationScheme=primary-content&subtitleFormat=TTMLv2&playbackSettingsFormatVersion=1.0.0&playerAttributes={"middlewareName":"Chrome","middlewareVersion":"86.0.4240.75","nativeApplicationName":"Chrome","nativeApplicationVersion":"86.0.4240.75","supportedAudioCodecs":"AAC","frameRate":"HFR","H264.codecLevel":"4.2","H265.codecLevel":"0.0"}`;
  console.log(dataUrl);
  try {
    const data = await fetch(dataUrl, {
      headers: {
        cookie:
          'session-id=141-9351593-3439861; ubid-main=133-0720260-1437213; skin=noskin; session-token=gPHtHGTGtVTRHIO7LHl8kUUYm0J7Pq44mzOpMmS9tjNKFsaQ41ceBqzz0QuGRB8pTaDTORwR9wq6K5JNSz3iM+9SxJZ2hTR4zL702kqxGs/xWw3oEKZ9Wh+Ef6NSFFABX6TRc+uUbgP+EK261oMEhIXhl1s6zlAvZaSp2ygbSquzMxPDm7u0hs4J2jdZwXNGnhE2ecyt191cvI8nHfaKu24Gesredwrk0qw9nz9Qv8R+r1hy7HrGybWNaZkWDb/AjYTXJh49+1SS6wPJjI6eDdqFF7+oIW4h; x-main="R4rS264qZvFn27nbk7PtQ41KfCx@0pvf"; at-main=Atza|IwEBIBPyhpRiueOt2nG-7S_-XnUlqv8dgI4IKN1PNweFapCZeSzSrUMpxc-_a5jX4l_QEKssQdIzL1kQeE85GiBovt5PpIY2L27Ydn7u25V5Qay_Z49NIQL4E3UNuwQ2VK1mG1Tq65vQYfC8zf5R3rgOHOKI4_EtB65p3yarFzX0DUBMhCl4CIizwHBh3LSZdlj44aRv5iiIq_8kd3UmLHaqADko; sess-at-main="8g7N5MedWfvMnkN4E/NxXDhPdwpInyAxl5l0MCj0hIM="; sst-main=Sst1|PQFRFRiktbN9x3dXZIuQIIVXCR50sUdEOhaauve0GE8CGl2GzkE7BZZ7G6UugAUXt0eHLV-dNIdiO5G4D4b-QyY5itRbcD-xgxCh2L8s3pcri_hXEkw1sNl7JQzFznDST9j8Aas9-6RWphjAjkFy-hQEuyW1tmw6ov3vGATMfWIgiUVjj50ynaD4O_N1QapFam3_7MPJZWVEwSgvYf3mI7kgwFvECsvhgTjYbw9BzzAT5JS3IZzxIOgg6_WT_Gfv-MhrJlq-QGOuMeoY6DIPjT6sR-YJpCbqeLVkd7DuPV3XxHw; lc-main=en_US; session-id-time=2082787201l; i18n-prefs=USD',
      },
    }).then((r) => r.json());
    console.log(data);
    if (data.error) {
      console.error(`${data.error.errorCode}: ${data.error.message}`);
    } else {
      const catalog = data.catalogMetadata.catalog;
      const tvAncestors = data.catalogMetadata.family.tvAncestors;

      if (catalog.entityType === "TV Show") {
        const show = tvAncestors.find((x) => x.catalog.type === "SHOW");
        const season = tvAncestors.find((x) => x.catalog.type === "SEASON");

        const episodeNumber = catalog.episodeNumber;
        const episodeTitle = catalog.title;
        const seasonNumber = season.catalog.seasonNumber;
        const seriesTitle = show.catalog.title;
        const seriesTitleSafe = sanitize(show.catalog.title);

        const urlSet =
          data.playbackUrls.urlSets[data.playbackUrls.defaultUrlSetId];
        const manifestUrl = urlSet.urls.manifest.url;
        const subtitles = data.subtitleUrls.find(
          (x) => x.languageCode === "en-us"
        );
        const subtitleUrl = subtitles.url;

        const resolution = data.returnedTitleRendition.videoResolution; // ex: 720p

        console.debug(
          `${seriesTitle} - Season ${seasonNumber}, Episode ${episodeNumber}: ${episodeTitle}`
        );

        const mpdXml = await fetchMpd(manifestUrl);
        const mpdJson = await parseXML(mpdXml);

        const baseUrl = getBaseURL(manifestUrl);

        // some such as free videos have ads which are contained in multiple segments
        // we need to find the first period that contains encrypted media
        const period = mpdJson.MPD.Period.find(
          (x) => x.AdaptationSet[0].ContentProtection
        );

        // sorts all video representations and finds the best one
        const bestVideoRepresentation =
          period.AdaptationSet[0].Representation.sort(sortFormats).shift();

        // all audio adaptation sets in english
        const audioAdaptationSets = period.AdaptationSet.filter(
          (x) =>
            x.$.contentType &&
            x.$.contentType === "audio" &&
            x.$.lang &&
            x.$.lang === "en"
        );

        // sorts all audio adaptation sets and returns the best one
        const bestAudioAdaptationSet = audioAdaptationSets
          .sort(sortAdaptationSets)
          .shift();

        // var bestAudioRepresentation;
        // if (bestAudioAdaptationSet.Representation.length === 1) {
        //   bestAudioRepresentation = bestAudioAdaptationSet.Representation[0];
        // } else {
        //   console.debug(
        //     inspect(bestAudioAdaptationSet.Representation, false, 20, true)
        //   );
        //   console.error(
        //     "more than one representation in adaptation set! FIX THIS"
        //   );
        //   process.exit(1);
        // }
        const bestAudioRepresentation =
          bestAudioAdaptationSet.Representation.sort(
            sortAudioRepresentationsSets
          ).shift();

        if (!bestAudioRepresentation) {
          console.error("No audio representations found!");
          process.exit(1);
        }

        console.debug(bestAudioRepresentation);

        const videoUrl = baseUrl + "/" + bestVideoRepresentation.BaseURL[0];
        const audioUrl = baseUrl + "/" + bestAudioRepresentation.BaseURL[0];

        const audioFileName = `${asin}_audio`;
        const videoFileName = `${asin}_video`;

        const episodeShortname =
          episodeNumber.toString().length === 1
            ? `E0${episodeNumber}`
            : `E${episodeNumber}`;

        const seasonShortname =
          seasonNumber.toString().length === 1
            ? `S0${seasonNumber}`
            : `S${seasonNumber}`;
        const outfileName = sanitize(
          `${seriesTitleSafe}.${seasonShortname}.${episodeShortname}.${episodeTitle}.WEB.${bestVideoRepresentation.$.height}.mp4`
        );
        const finalOutputPath = join(
          __dirname,
          "output",
          seriesTitleSafe,
          seasonShortname,
          outfileName
        );
        const finalOutputFolderPath = join(
          __dirname,
          "output",
          seriesTitleSafe,
          seasonShortname
        );
        const tmpOutputFolderPath = join(
          __dirname,
          "tmp",
          seriesTitleSafe,
          seasonShortname
        );

        if (!fs.existsSync(finalOutputFolderPath)) {
          fs.mkdirSync(finalOutputFolderPath, { recursive: true });
        }

        if (!fs.existsSync(tmpOutputFolderPath)) {
          fs.mkdirSync(tmpOutputFolderPath, { recursive: true });
        }

        const decryptedAudioFilePath = join(
          tmpOutputFolderPath,
          `${asin}_audio.decrypted`
        );
        const decryptedVideoFilePath = join(
          tmpOutputFolderPath,
          `${asin}_video.decrypted`
        );
        console.debug(`Final output path: ${finalOutputPath}`);
        console.debug(`Temp output folder path: ${tmpOutputFolderPath}`);
        ///

        const videoKID = period.AdaptationSet[0].ContentProtection[0].$[
          "cenc:default_KID"
        ].replace(/-/g, "");
        const audioKID = bestAudioAdaptationSet.ContentProtection[0].$[
          "cenc:default_KID"
        ].replace(/-/g, "");

        console.debug("KID of audio file is " + audioKID);
        const audioKeyObj = keys.find((x) => x.kid.toUpperCase() === audioKID);
        if (!audioKeyObj)
          return console.error(
            "No KID Match. Manual intervention may be needed!\n" + keys
          );
        console.debug("Audio KID Match is " + JSON.stringify(audioKeyObj));
        const audioKey = audioKeyObj.key;
        if (!audioKey) return console.error("audio Key was undefined!");
        console.debug("audio decryption key is " + audioKey);

        console.debug("KID of video file is " + videoKID);
        const videoKeyObj = keys.find((x) => x.kid.toUpperCase() === videoKID);
        if (!videoKeyObj)
          return console.error(
            "No KID Match. Manual intervention may be needed!\n" + keys
          );
        console.debug("Video KID Match is " + JSON.stringify(videoKeyObj));
        const videoKey = videoKeyObj.key;
        if (!videoKey) return console.error("Video Key was undefined!");
        console.debug("video decryption key is " + videoKey);

        await downloadNew(audioUrl, tmpOutputFolderPath, audioFileName).catch(
          (e) => console.error(e)
        );
        console.log("Audio download complete, starting decryption...");

        const child = exec(
          `mp4decrypt --key 1:${audioKey} "${join(
            tmpOutputFolderPath,
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

        await downloadNew(videoUrl, tmpOutputFolderPath, videoFileName).catch(
          (e) => console.error(e)
        );
        console.log("Video download complete, starting decryption...");

        // download subtitles
        // await downloadNew(
        //   subtitleUrl,
        //   tmpOutputFolderPath,
        //   videoFileName.replace(".mp4", `.${subtitleUrl.split(".").pop()}`)
        // ).catch((e) => console.error(e));
        // console.log("Subtitle download complete, starting video decryption...");

        const child3 = exec(
          `mp4decrypt --key 1:${videoKey} "${join(
            tmpOutputFolderPath,
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

            console.log(`${outfileName} has been successfully downloaded!`);
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
    }
  } catch (e) {
    console.error(e);
  }
}

async function processTubi(parsed) {}
