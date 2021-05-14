type NetflixType = "show" | "movie";

interface NetflixArt {
  h: number;
  w: number;
  url: string;
}

interface NetflixSkipMarker {
  start: number;
  end: number;
}

interface NetflixCinematch {
  value: number;
  type: string;
}

interface NetflixUserRating {
  type: string;
  matchScore: number;
  userRating: number;
  tooNewForMatchScore: boolean;
}

interface NetflixEpisode {
  autoplayable: boolean;
  bookmark: { offset: number; watchedDate: number };
  creditsOffset: number;
  displayRuntime: number;
  end: number;
  episodeId: number;
  hd: boolean;
  hiddenEpisodeNumbers: boolean;
  id: number;
  requiresAdultVerification: boolean;
  requiresPin: boolean;
  requiresPreReleasePin: boolean;
  runtime: number;
  seq: number;
  skipMarkers: {
    content: NetflixSkipMarker[];
    credit: NetflixSkipMarker[];
    recap: NetflixSkipMarker[];
  };
  start: number;
  stills: NetflixArt[];
  synopsis: string;
  thumbs: NetflixArt[];
  title: string;
  watchedToEndOffset: number;
}

interface NetflixSeason {
  episodes: NetflixEpisode[];
  hiddenEpisodeNumbers: boolean;
  id: number;
  longName: string;
  seq: number;
  shortName: string;
  title: string;
  year: number;
}

interface NetflixAudioTextShortcut {
  id: string;
  audioTrackId: string;
  textTrackId: string;
}

interface NetflixStreamUrl {
  cdn_id: number;
  url: string;
}

interface NetflixBox {
  size: number;
  offset: number;
}

interface NetflixMetadata {
  version: string;
  video: {
    type: string;
    id: number;
    merchedVideoId: unknown;
    title: string;
    synopsis: string;
    rating: string;
    cinematch: NetflixCinematch;
    userRating: NetflixUserRating;
    hiddenEpisodeNumbers: boolean;
    requiresPin: boolean;
    requiredPreReleasePin: boolean;
    requiresAdultVerification: boolean;
    artwork: NetflixArt[];
    storyart: NetflixArt[];
    boxart: NetflixArt[];
    skipMarkers: NetflixSkipMarker;

    // episode only
    currentEpisode?: number;
    seasons?: NetflixSeason[];

    // movie only
    year?: number;
    runtime?: number;
    displayRuntime?: number;
    creditsOffset?: number;
    autoplayable?: boolean;
    start?: number;
    end?: number;
    hd?: boolean;
    bookmark?: {
      offset: number;
      watchedDate: number;
    };
  };
  trackIds: {
    nextEpisode: number;
    episodeSelector: number;
  };
}

interface NetflixAudioStream {
  audioKey: unknown;
  bitrate: number;
  channels: string;
  channelsFormat: string;
  content_profile: string;
  downloadable_id: string;
  isDrm: boolean;
  language: string;
  moov: NetflixBox;
  new_stream_id: string;
  sidx: { size: number; offset: number };
  size: number;
  ssix: NetflixBox;
  surroundFormatLabel: string;
  tags: unknown[];
  trackType: string;
  type: number;
  urls: NetflixStreamUrl[];
}

interface NetflixVideoStream {
  trackType: string;
  content_profile: string;
  bitrate: number;
  peakBitrate: number;
  dimensionsCount: number;
  dimensionsLabel: string;
  drmHeaderId: string;
  pix_w: number;
  pix_h: number;
  res_w: number;
  res_h: number;
  framerate_value: number;
  framerate_scale: number;
  size: number;
  startByteOffset: number;
  isDrm: boolean;
  vmaf: number;
  segmentVmaf: unknown;
  crop_x: number;
  crop_y: number;
  crop_w: number;
  crop_h: number;
  downloadable_id: string;
  tags: string[];
  new_stream_id: string;
  type: number;
  urls: NetflixStreamUrl[];
  moov: NetflixBox;
  sidx: NetflixBox;
  ssix: NetflixBox;
}

interface NetflixAudioTrack {
  channels: string;
  channelsFormat: string;
  codecName: string;
  defaultTimedText: unknown;
  disallowedSubtitleTracks: unknown[];
  id: string;
  isNative: boolean;
  isNoneTrack: boolean;
  language: string;
  languageDescription: string;
  new_track_id: string;
  profile: string;
  profileType: string;
  rawTrackType: string;
  stereo: boolean;
  streams: NetflixAudioStream[];
  surroundFormatLabel: string;
  trackType: string;
  track_id: string;
  type: number;
}

interface NetflixTrackOrderTrack {
  audioTrackId: string;
  mediaId: string;
  preferenceOrder: number;
  subtitleTrackId: string;
  videoTrackId: string;
}

interface NetflixLink {
  href: string;
  ref: string;
}

interface NetflixLocation {
  key: string;
  rank: number;
  weight: number;
  level: number;
}

interface NetflixServer {
  dns: {
    forceLookup: boolean;
    host: string;
    ipv4: string;
    ipv6?: string;
  };
  id: number;
  key: string;
  lowgrade: boolean;
  name: string;
  rank: number;
  type: string;
}

// interface RawNetflixManifest {
//   audioTextShortcuts: NetflixAudioTextShortcut[];
//   audio_tracks: NetflixAudioTrack[];
//   bookmark: number;
//   cdnResponseData: {
//     pbcid: string;
//   };
//   clientIpAddress: number;
//   defaultTrackOrderList: NetflixTrackOrderTrack[];
//   dpsid: unknown;
//   drmContextId: string;
//   drmVersion: number;
//   duration: number;
//   eligibleABTestMap: {};
//   expiration: number;
//   hasClearProfile: boolean;
//   hasClearStreams: boolean;
//   hasDrmProfile: boolean;
//   hasDrmStreams: boolean;
//   isBranching: boolean;
//   isSupplemental: boolean;
//   links: {
//     events: NetflixLink;
//     ldl: NetflixLink;
//     license: NetflixLink;
//   };
//   locations: NetflixLocation[];
//   manifestExpirationDuration: number;
//   media: {
//     id: string;
//     tracks: { AUDIO: string; TEXT: string; VIDEO: string };
//   }[];
//   movieId: number;
//   packageId: string;
//   playbackContextId: string;
//   servers: NetflixServer[];
// }

interface NetflixManifest {
  audioStream: NetflixAudioStream;
  videoStream: NetflixVideoStream;
}

interface NetflixPayload {
  metadata: NetflixMetadata;
  manifest: NetflixManifest;
  keys: ContentKeyPair[];
  kid: string;
  outputFileName: string;
}
