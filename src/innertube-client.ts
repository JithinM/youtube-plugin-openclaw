// ── InnerTube channel resolver + RSS feed video fetcher ─────────────────────
//
// Uses youtubei.js (InnerTube) to resolve channel names / handles / URLs
// to channel IDs, then fetches the latest videos via YouTube's public
// RSS feed (no API key or quota required).

import { Innertube } from "youtubei.js";

import type { VideoResult } from "./types.js";

// ── Singleton InnerTube instance ────────────────────────────────────────────

let _innertube: Innertube | null = null;

async function getInnertube(): Promise<Innertube> {
  if (!_innertube) {
    _innertube = await Innertube.create();
  }
  return _innertube;
}

// ── Channel ID resolution ───────────────────────────────────────────────────

/** Regex to detect a raw YouTube channel ID (starts with UC, 24 chars). */
const RE_CHANNEL_ID = /^UC[a-zA-Z0-9_-]{22}$/;

/**
 * Resolve a channel name, handle (@name), URL, or raw channel ID
 * into a canonical `UC…` channel ID using InnerTube.
 *
 * Returns `null` if the channel cannot be found.
 */
export async function resolveChannelId(
  input: string,
): Promise<string | null> {
  // Already a channel ID
  if (RE_CHANNEL_ID.test(input)) {
    return input;
  }

  const yt = await getInnertube();

  try {
    // If input looks like a URL, resolve it first
    if (input.startsWith("http://") || input.startsWith("https://")) {
      const endpoint = await yt.resolveURL(input);
      const browseId: string | undefined =
        endpoint.payload?.browseId ?? endpoint.payload?.browseEndpoint?.browseId;
      if (browseId && RE_CHANNEL_ID.test(browseId)) {
        return browseId;
      }
    }

    // Handles like @mkbhd or plain names – use getChannel which
    // accepts both channel IDs and handles via the browse endpoint.
    const channel = await yt.getChannel(input);

    // Extract channel ID from metadata
    const channelId =
      (channel.metadata as Record<string, any>)?.external_id ??
      (channel.metadata as Record<string, any>)?.url?.match(RE_CHANNEL_ID)?.[0] ??
      null;

    return channelId;
  } catch {
    return null;
  }
}

// ── RSS feed video fetcher ──────────────────────────────────────────────────

const RSS_FEED_URL =
  "https://www.youtube.com/feeds/videos.xml?channel_id=";

/** Maximum videos the YouTube RSS feed returns. */
export const RSS_MAX_VIDEOS = 15;

/**
 * Fetch the latest videos for a channel from YouTube's public RSS feed.
 *
 * The RSS feed returns up to 15 videos (YouTube's hard limit).
 * No API key or quota is consumed.
 *
 * @param channelId  YouTube channel ID (UC…)
 * @param maxResults Number of videos to return (1–15, default 15)
 */
export async function getChannelVideosFromRSS(
  channelId: string,
  maxResults: number = RSS_MAX_VIDEOS,
): Promise<VideoResult[]> {
  const feedUrl = `${RSS_FEED_URL}${channelId}`;
  const res = await fetch(feedUrl);

  if (!res.ok) {
    throw new Error(
      `YouTube RSS feed returned ${res.status} ${res.statusText} for channel "${channelId}"`,
    );
  }

  const xml = await res.text();
  return parseRSSFeed(xml, Math.min(maxResults, RSS_MAX_VIDEOS));
}

// ── RSS XML parser ──────────────────────────────────────────────────────────

/**
 * Parse the Atom XML returned by YouTube's RSS feed into VideoResult[].
 *
 * Each `<entry>` contains:
 *   <yt:videoId>…</yt:videoId>
 *   <title>…</title>
 *   <published>…</published>
 *   <media:group>
 *     <media:description>…</media:description>
 *     <media:thumbnail url="…" />
 *   </media:group>
 *   <author><name>…</name></author>
 */
function parseRSSFeed(xml: string, maxResults: number): VideoResult[] {
  const results: VideoResult[] = [];

  // Extract all <entry>…</entry> blocks
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let entryMatch: RegExpExecArray | null;

  while (
    (entryMatch = entryRegex.exec(xml)) !== null &&
    results.length < maxResults
  ) {
    const entry = entryMatch[1];

    const videoId = extractTag(entry, "yt:videoId");
    const title = decodeXmlEntities(extractTag(entry, "title") ?? "");
    const published = extractTag(entry, "published") ?? "";
    const description = decodeXmlEntities(
      extractTag(entry, "media:description") ?? "",
    );
    const channelTitle = decodeXmlEntities(
      extractNestedTag(entry, "author", "name") ?? "",
    );
    const thumbnailUrl = extractAttr(entry, "media:thumbnail", "url") ?? "";

    if (videoId) {
      results.push({
        videoId,
        title,
        description,
        channelTitle,
        publishedAt: published,
        thumbnailUrl,
      });
    }
  }

  return results;
}

// ── XML helpers ─────────────────────────────────────────────────────────────

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function extractNestedTag(
  xml: string,
  parentTag: string,
  childTag: string,
): string | null {
  const parent = extractTag(xml, parentTag);
  if (!parent) return null;
  return extractTag(parent, childTag);
}

function extractAttr(
  xml: string,
  tag: string,
  attr: string,
): string | null {
  const regex = new RegExp(`<${tag}[^>]*?${attr}="([^"]*)"`, "i");
  const match = xml.match(regex);
  return match ? match[1] : null;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCharCode(parseInt(code, 10)),
    );
}
