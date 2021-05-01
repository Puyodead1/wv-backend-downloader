import BaseModule from "./BaseModule";

export const TEST_URLS = {
  DRM: "https://www.youtube.com/watch?v=W_1FbCq9oL4",
  NO_DRM: "https://www.youtube.com/watch?v=hT_nvWreIhg",
};

export default class Youtube extends BaseModule {
  public requestOptions: object;

  constructor() {
    super("youtube", "Youtube");
    this.requestOptions = {
      headers: {
        cookie:
          "__Secure-3PSID=7ge2h6mx0OcDe_fmw9iZ5_Hf-uCE3aVsmDnMk8LZu-zM4PoE4nzcKUFnmCfnNvzAREnLJw.; __Secure-3PAPISID=la2bfC5tbmadXmWa/AVRZcHdAkqKMTlRvb; VISITOR_INFO1_LIVE=ZZUXr1HQumY; LOGIN_INFO=AFmmF2swRgIhAMDS1GN70UgBd8XLTtlnNpBHMytdCtcPdchWGl1iG7vbAiEA86xTq0gE2JCGmf1Dv-jq8gqaPCNatobZOHgUFBwbem0:QUQ3MjNmeEg4bDdkVVIxbEs5R3JTMlhCa3Bfd1lnS2pqVWt2SmZmTW12SWFJaFlZOFpwTTJ5dzN3SHA1aUFXZmVNVlQ2S1FXN3o4RnlXM1FvOTkyNUoyal9meGFUTTZLdjQ5NGNUSUw2MldaS1E0QVpva3IwdjFuX3I2c01nVUFJa0dmNHlBdGZLcTl6cUlNYkZRRDhkdU5aaUZ6VjNsZ3pB; PREF=tz=America.Indianapolis; CONSENT=PENDING+093; AWSALB=Zmuoi4fMUbiPJHW8oLLzcjKErE+BS+ai/5tYc0uIUXhNdyBR6/PIMtAIttt2nM/0uYjQ0hv2O2IccgfASchfCp25YCMLazwY3lpgM6Z9IXffmGU2qf+dqH20kKIY; AWSALBCORS=Zmuoi4fMUbiPJHW8oLLzcjKErE+BS+ai/5tYc0uIUXhNdyBR6/PIMtAIttt2nM/0uYjQ0hv2O2IccgfASchfCp25YCMLazwY3lpgM6Z9IXffmGU2qf+dqH20kKIY; YSC=GCvusQgCbOo; __Secure-3PSIDCC=AJi4QfFUJMagk30BVah0wARWO_0bktu2DeAIqCCaL0viLzwdil3yRSGQAC1ySlrsh0ekB_ua4A",
      },
    };
  }

  download(payload: any) {
    //
  }

  extract(...args: any[]) {
    return new Promise((resolve, reject) => {
      // ytdl
      //   .getInfo(url, {
      //     lang: "en",
      //     requestOptions: this.requestOptions,
      //   })
      //   .then((r) => {
      //     const formats = r.formats;
      //     const bestVideo = ytdl.chooseFormat(formats, {
      //       quality: "highestvideo",
      //       filter: "videoonly",
      //     });
      //     const bestAudio = ytdl.chooseFormat(formats, {
      //       quality: "highest",
      //       filter: (format) => format.audioQuality === "AUDIO_QUALITY_HIGH",
      //     });
      //     const info = {
      //       audio: {
      //         url: bestAudio.url,
      //         ext: bestAudio.container,
      //         codecs: bestAudio.codecs,
      //       },
      //       video: {
      //         url: bestVideo.url,
      //         width: bestVideo.width,
      //         height: bestVideo.height,
      //         ext: bestVideo.container,
      //       },
      //       title: r.videoDetails.title,
      //       type: r.videoDetails.category,
      //     };
      //     resolve(info);
      //   })
      //   .catch((e) => reject(e));
    });
  }
}
