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

interface NetflixMetadata {
  version: string;
  video: {
    artwork: NetflixArt[];
    boxart: NetflixArt[];
    cinematch: { value: number; type: string };
    currentEpisode: number;
    hiddenEpisodeNumbers: boolean;
    id: number;
    merchedVideoId: unknown;
    rating: string;
    requiresAdultVerification: boolean;
    requiresPin: boolean;
    requiresPreReleasePin: boolean;
    seasons: NetflixSeason[];
    skipMarkers: {
      content: NetflixSkipMarker[];
      credit: NetflixSkipMarker[];
      recap: NetflixSkipMarker[];
    };
    storyart: NetflixArt[];
    synopsis: string;
    title: string;
    type: NetflixType;
    userRating: {
      matchScore: unknown;
      tooNewForMatchScore: boolean;
      type: "thumb"; // FIXME: this is probably a few different possible types
      userRating: 2;
    };
  };
  trackIds: {
    episodeSelector: number;
    nextEpisode: number;
  };
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

interface NetflixAudioStream {
  audioKey: unknown;
  bitrate: number;
  channels: string;
  channelsFormat: string;
  content_profile: string;
  downloadable_id: string;
  isDrm: boolean;
  language: string;
  moov: { size: number; offset: number };
  new_stream_id: string;
  sidx: { size: number; offset: number };
  size: number;
  ssix: { size: number; offset: number };
  surroundFormatLabel: string;
  tags: unknown[];
  trackType: string;
  type: number;
  urls: NetflixStreamUrl[];
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

interface NetflixManifest {
  audioTextShortcuts: NetflixAudioTextShortcut[];
  audio_tracks: NetflixAudioTrack[];
  bookmark: number;
  cdnResponseData: {
    pbcid: string;
  };
  clientIpAddress: number;
  defaultTrackOrderList: NetflixTrackOrderTrack[];
  dpsid: unknown;
  drmContextId: string;
  drmVersion: number;
  duration: number;
  eligibleABTestMap: {};
  expiration: number;
  hasClearProfile: boolean;
  hasClearStreams: boolean;
  hasDrmProfile: boolean;
  hasDrmStreams: boolean;
  isBranching: boolean;
  isSupplemental: boolean;
  links: {
    events: NetflixLink;
    ldl: NetflixLink;
    license: NetflixLink;
  };
  locations: NetflixLocation[];
  manifestExpirationDuration: number;
  media: {
    id: string;
    tracks: { AUDIO: string; TEXT: string; VIDEO: string };
  }[];
  movieId: number;
  packageId: string;
  playbackContextId: string;
  servers: NetflixServer[];
}

interface NetflixPayload {
  metadata: NetflixMetadata;
  manifest: NetflixManifest;
  keys: ContentKeyPair[];
}
