// ── YouTube Data API v3 response shapes ─────────────────────────────────────

/** Thumbnail object returned by YouTube API. */
export interface YTThumbnail {
  url: string;
  width?: number;
  height?: number;
}

/** Snippet portion of a search/video result. */
export interface YTSnippet {
  publishedAt: string;
  channelId: string;
  title: string;
  description: string;
  thumbnails: {
    default?: YTThumbnail;
    medium?: YTThumbnail;
    high?: YTThumbnail;
  };
  channelTitle: string;
  categoryId?: string;
}

/** Shape of a single item from search.list. */
export interface YTSearchItem {
  kind: string;
  id: {
    kind: string;
    videoId?: string;
    channelId?: string;
    playlistId?: string;
  };
  snippet: YTSnippet;
}

/** Shape of a single item from videos.list. */
export interface YTVideoItem {
  kind: string;
  id: string;
  snippet: YTSnippet;
}

/** Wrapper for paginated YouTube API responses. */
export interface YTListResponse<T> {
  kind: string;
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: T[];
}

// ── Plugin output shapes (returned to the agent) ───────────────────────────

export interface VideoResult {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
}

export interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
}

// ── Plugin config ───────────────────────────────────────────────────────────

export interface YouTubePluginConfig {
  apiKey: string;
  /** Directory where transcript JSON files are cached (default: "./transcripts"). */
  transcriptCacheDir?: string;
}
