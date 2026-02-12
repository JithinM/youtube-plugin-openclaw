import type {
  YTListResponse,
  YTSearchItem,
  YTVideoItem,
  VideoResult,
} from "./types.js";

const BASE_URL = "https://www.googleapis.com/youtube/v3";

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a URL with query parameters, filtering out undefined values.
 */
function buildUrl(
  path: string,
  params: Record<string, string | number | undefined>,
): string {
  const url = new URL(`${BASE_URL}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/**
 * Perform a GET request against the YouTube Data API and return parsed JSON.
 * Throws a descriptive error for non-2xx responses.
 */
async function ytFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 403) {
      throw new Error(
        `YouTube API forbidden (403). Check your API key and quota. ${body}`,
      );
    }
    if (res.status === 400) {
      throw new Error(`YouTube API bad request (400): ${body}`);
    }
    throw new Error(
      `YouTube API error ${res.status} ${res.statusText}: ${body}`,
    );
  }
  return res.json() as Promise<T>;
}

/**
 * Map a YTSearchItem to a VideoResult.
 */
function searchItemToVideoResult(item: YTSearchItem): VideoResult {
  return {
    videoId: item.id.videoId ?? "",
    title: item.snippet.title,
    description: item.snippet.description,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    thumbnailUrl:
      item.snippet.thumbnails.high?.url ??
      item.snippet.thumbnails.medium?.url ??
      item.snippet.thumbnails.default?.url ??
      "",
  };
}

/**
 * Map a YTVideoItem to a VideoResult.
 */
function videoItemToVideoResult(item: YTVideoItem): VideoResult {
  return {
    videoId: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    thumbnailUrl:
      item.snippet.thumbnails.high?.url ??
      item.snippet.thumbnails.medium?.url ??
      item.snippet.thumbnails.default?.url ??
      "",
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Resolve a channel name / handle to its channel ID by searching.
 * Returns the first matching channel ID, or null if not found.
 */
export async function resolveChannelId(
  query: string,
  apiKey: string,
): Promise<string | null> {
  const url = buildUrl("search", {
    part: "snippet",
    type: "channel",
    q: query,
    maxResults: 1,
    key: apiKey,
  });
  const data = await ytFetch<YTListResponse<YTSearchItem>>(url);
  const first = data.items[0];
  return first?.id.channelId ?? null;
}

/**
 * Get the most recent videos from a channel.
 */
export async function getChannelVideos(
  channelId: string,
  maxResults: number,
  apiKey: string,
): Promise<VideoResult[]> {
  const url = buildUrl("search", {
    part: "snippet",
    type: "video",
    channelId,
    order: "date",
    maxResults,
    key: apiKey,
  });
  const data = await ytFetch<YTListResponse<YTSearchItem>>(url);
  return data.items.map(searchItemToVideoResult).slice(0, maxResults);
}

/**
 * Get trending (most popular) videos for a region.
 */
export async function getTrendingVideos(
  regionCode: string,
  maxResults: number,
  apiKey: string,
  categoryId?: string,
): Promise<VideoResult[]> {
  const url = buildUrl("videos", {
    part: "snippet",
    chart: "mostPopular",
    regionCode,
    maxResults,
    videoCategoryId: categoryId,
    key: apiKey,
  });
  const data = await ytFetch<YTListResponse<YTVideoItem>>(url);
  return data.items.map(videoItemToVideoResult);
}

/**
 * Search for videos by a free-text query (topic).
 */
export async function searchVideos(
  query: string,
  maxResults: number,
  apiKey: string,
  order: string = "relevance",
): Promise<VideoResult[]> {
  const url = buildUrl("search", {
    part: "snippet",
    type: "video",
    q: query,
    order,
    maxResults,
    key: apiKey,
  });
  const data = await ytFetch<YTListResponse<YTSearchItem>>(url);
  return data.items.map(searchItemToVideoResult).slice(0, maxResults);
}
