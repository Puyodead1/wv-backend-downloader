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
const { default: PQueue } = require("p-queue");
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
      `${episode.series_name}.${seasonShortname}.${episodeShortname}-${episode.name}.WEB.%QUALITY%.mp4`
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

  const decryptedAudioFilePath = join(tmpOutputFolderPath, "audio.decrypted");
  const decryptedVideoFilePath = join(tmpOutputFolderPath, "video.decrypted");

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

// TODO: make this function return a promise instead
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

  const audioUrl = audioStream.urls[1].url;
  const videoUrl = videoStream.urls[1].url;

  const audioFileName = `${audioId}_audio`;
  const videoFileName = `${videoId}_video`;

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
          sanitize(manifest.outFileName)
        )
      : join(__dirname, "output", sanitize(manifest.outFileName));
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

  await downloadNew(audioUrl, tmpOutputFolderPath, audioFileName).catch((e) =>
    console.error(e)
  );
  console.log("Audio download complete");

  await downloadNew(videoUrl, tmpOutputFolderPath, videoFileName).catch((e) =>
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

      console.log(`${manifest.outFileName} has been successfully downloaded!`);
      // fs.unlink(join(__dirname, "tmp", audioFileName), () =>
      //   console.log("Audio temp file deleted")
      // );
      // fs.unlink(join(__dirname, "tmp", videoFileName), () =>
      //   console.log("Video temp file deleted")
      // );
      // fs.unlink(decryptedVideoFilePath, () =>
      //   console.log("decrypted video temp file deleted")
      // );

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

  const dataUrl = `https://atv-ps.amazon.com/cdp/catalog/GetPlaybackResources?deviceID=232fd6a8bec4c540fb035cdf83b90af96b3a899c899b6654932f8f7d&deviceTypeID=AOAGZA014O5RE&gascEnabled=false&marketplaceID=ATVPDKIKX0DER&uxLocale=en_US&firmware=1&clientId=f22dbddb-ef2c-48c5-8876-bed0d47594fd&deviceApplicationName=Chrome&playerType=xp&operatingSystemName=Windows&operatingSystemVersion=10.0&asin=${asin}&consumptionType=Streaming&desiredResources=PlaybackUrls,CatalogMetadata,SubtitleUrls,ForcedNarratives&resourceUsage=CacheResources&videoMaterialType=Feature&userWatchSessionId=7fa43766-c4aa-441a-ac9c-fe9f125f3266&deviceProtocolOverride=Https&deviceStreamingTechnologyOverride=DASH&deviceDrmOverride=CENC&deviceBitrateAdaptationsOverride=CVBR,CBR&deviceHdrFormatsOverride=None&deviceVideoCodecOverride=H264&deviceVideoQualityOverride=HD&audioTrackId=all&languageFeature=MLFv2&liveManifestType=patternTemplate,accumulating,live&supportedDRMKeyScheme=DUAL_KEY&titleDecorationScheme=primary-content&subtitleFormat=TTMLv2&playbackSettingsFormatVersion=1.0.0&playerAttributes={"middlewareName":"Chrome","middlewareVersion":"86.0.4240.75","nativeApplicationName":"Chrome","nativeApplicationVersion":"86.0.4240.75","supportedAudioCodecs":"AAC","frameRate":"HFR","H264.codecLevel":"4.2","H265.codecLevel":"0.0"}`;
  console.log(dataUrl);
  try {
    const data = await fetch(dataUrl, {
      headers: {
        cookie:
          'session-id=141-9351593-3439861; ubid-main=133-0720260-1437213; x-main="ZPTqXEUrEesWUS2y7z?v?j9@XdfETsmST6Z8nY1aBr@nva5xAki6JYmgR?PyNHnC"; at-main=Atza|IwEBIGs-CpHo5suFdryTzdpkpDT58G2RyKODkTSum2akclsAtZE222GMYDWwrBjGpLvd2_Gfh_KJtvVtUNAhFsKC5oTVKlZypjLmmPdx3QVXbRuaaZqVB-7K5q6lFzEtHKNhB_Ju9cLoShKDzsMTnYK3tfNYcgx9WU2fag9aV2BEIb1d47gJVqRxSLCUHBQyg4uujG1wyZb2klhTSumj8G5NWmpgBGf6THOfFfToddP4Eolw2w; sess-at-main="eER7OrhaaObSnZo2PljZXmgsiFl3DxnqrZlz34dZ2dk="; sst-main=Sst1|PQErjbnZeO5VY_568Efi38RdCTeB9sVHWS3-TrN_RtjhgpvjOV58hj9sVn9xYTmSxqt-4-SRn54f4fCim2OKdx8Qu4iF_bQFGL8PKRixLQokMUpBQZ5iW4D8PeTZO_536Ql4Rhs7TlX7dlGLUFqLf6qdSz0u03iuSP63llZJvYWWySJEISaUw__ArUr_rWwq9oyVE_cWqcSAQsMjRg3LtJlC-RTDsl_dxOrtGzwjkRalpoBIOz4Dwtj76tJg7e-cfTbw_llopJ5uZvj-1r62qY6GR4kJl2r2lGOfKja6Lge1pyc; lc-main=en_US; i18n-prefs=USD; session-token="wog3OjXPIOG5asvhzsNYJAwUBW4Pis9mLWSIWdjdt/0UgPTQ0Is9rnkd53g0De3DpSnXWHYzQcs6mZxVm0plimDwaU6z/1wZgP0SsadOvauE+nA+gmImWPlrgSbbphDeM6ZTcbCldZRabEZjfZrfO5i+Ob+6u6NmSYgRMkyA8mlgVU/qTyzP17z6IDGY4q2h+PvmnxD+pnYkzC0wWDN3ng=="; scrly_token=NzAxMTFiYzU6emljcmlsMDcyMWFAbWlzY2hvb2xzLm9yZzpzZWN1cmx5QGpjaXNkLm9yZzpqY2lzZG9yZ0hvc3RlZFJlZ2lvbjJEVklTdHVVbnJlc3RyaWN0ZWREVklTdHVIUzEyOi06b3U6Mzg6MDo6; scrly_log_1=1; session-id-time=2082758401l',
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

        const urlSet =
          data.playbackUrls.urlSets[data.playbackUrls.defaultUrlSetId];
        const manifestUrl = urlSet.urls.manifest.url;
        const subtitleUrl = data.subtitleUrls.find(
          (x) => x.languageCode === "en-us"
        ).url;

        const resolution = data.returnedTitleRendition.videoResolution; // ex: 720p

        console.debug(
          `${seriesTitle} - Season ${seasonNumber}, Episode ${episodeNumber}: ${episodeTitle}`
        );
        console.debug(manifestUrl);
        console.debug(subtitleUrl);
        console.debug(resolution);

        // TODO: download
      } else {
        console.error(
          `Unsupported entity type: ${data.catalogMetadata.catalog.entityType}!`
        );
      }
    }
  } catch (e) {
    console.error(e);
  }
}
