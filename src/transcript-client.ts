import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TranscriptSegment } from "./types.js";

// ── InnerTube transcript fetcher ────────────────────────────────────────────
//
// Uses YouTube's InnerTube player API (ANDROID client) to obtain caption
// track URLs, then fetches the XML transcript. This approach does NOT
// require a YouTube Data API key and avoids the broken scraper libraries.

const INNERTUBE_PLAYER_URL =
  "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";

const ANDROID_CLIENT_CONTEXT = {
  clientName: "ANDROID",
  clientVersion: "19.29.37",
  androidSdkVersion: 30,
};

/** Regex for video ID extraction from URLs. */
const RE_VIDEO_ID =
  /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i;

/**
 * Normalise a video ID or URL into a plain 11-char video ID.
 */
function resolveVideoId(videoIdOrUrl: string): string {
  if (/^[a-zA-Z0-9_-]{11}$/.test(videoIdOrUrl)) return videoIdOrUrl;
  const m = videoIdOrUrl.match(RE_VIDEO_ID);
  if (m) return m[1];
  throw new Error(`Cannot extract a YouTube video ID from "${videoIdOrUrl}"`);
}

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  name?: { simpleText?: string };
  vssId?: string;
}

/**
 * Call the InnerTube player API and extract caption tracks.
 */
async function getCaptionTracks(videoId: string): Promise<CaptionTrack[]> {
  const res = await fetch(INNERTUBE_PLAYER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      context: { client: ANDROID_CLIENT_CONTEXT },
      videoId,
      contentCheckOk: true,
      racyCheckOk: true,
    }),
  });

  if (!res.ok) {
    throw new Error(
      `InnerTube player API returned ${res.status} ${res.statusText}`,
    );
  }

  const data = (await res.json()) as Record<string, any>;

  // Check playability
  const status = data?.playabilityStatus?.status;
  if (status === "UNPLAYABLE" || status === "LOGIN_REQUIRED") {
    throw new Error(
      `Video "${videoId}" is unavailable (${status}). It may be private, deleted, or region-locked.`,
    );
  }
  if (status === "ERROR") {
    throw new Error(
      `Video "${videoId}" returned an error: ${data?.playabilityStatus?.reason ?? "unknown"}`,
    );
  }

  const tracks: CaptionTrack[] | undefined =
    data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!tracks || tracks.length === 0) {
    throw new Error(
      `No caption tracks found for video "${videoId}". Transcripts may be disabled.`,
    );
  }

  return tracks;
}

/**
 * Parse the InnerTube timedtext XML (format 3) which uses `<p t="" d="">` tags.
 * Also handles the legacy `<text start="" dur="">` format as a fallback.
 */
function parseTimedTextXml(xml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];

  // Format 3: <p t="milliseconds" d="milliseconds">text</p>
  const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  let match: RegExpExecArray | null;

  while ((match = pRegex.exec(xml)) !== null) {
    const text = decodeXmlEntities(stripTags(match[3])).trim();
    if (!text) continue;
    segments.push({
      text,
      offset: parseInt(match[1], 10) / 1000, // ms -> seconds
      duration: parseInt(match[2], 10) / 1000,
    });
  }

  // Fallback: legacy <text start="" dur=""> format
  if (segments.length === 0) {
    const textRegex = /<text\s+start="([\d.]+)"\s+dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
    while ((match = textRegex.exec(xml)) !== null) {
      const text = decodeXmlEntities(stripTags(match[3])).trim();
      if (!text) continue;
      segments.push({
        text,
        offset: parseFloat(match[1]),
        duration: parseFloat(match[2]),
      });
    }
  }

  return segments;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

// ── File-backed transcript cache ────────────────────────────────────────────

/** In-memory index: cacheKey -> absolute file path. */
const pathIndex = new Map<string, string>();

/** Default cache directory (relative to cwd) when none is configured. */
const DEFAULT_CACHE_DIR = "transcripts";

/** Resolved cache directory (set once via `initCacheDir`). */
let cacheDir: string = DEFAULT_CACHE_DIR;

/**
 * Set (and create) the directory where transcript JSON files are stored.
 * Call this once at plugin startup. Defaults to `./transcripts`.
 */
export function initCacheDir(dir?: string): void {
  cacheDir = dir || DEFAULT_CACHE_DIR;
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
}

function cacheKey(videoId: string, lang: string): string {
  return `${videoId}_${lang}`;
}

function filePath(videoId: string, lang: string): string {
  const safeId = videoId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return join(cacheDir, `${safeId}_${lang}.json`);
}

function readFromDisk(
  videoId: string,
  lang: string,
): TranscriptSegment[] | null {
  const fp = filePath(videoId, lang);
  if (!existsSync(fp)) return null;
  try {
    const raw = readFileSync(fp, "utf-8");
    const data = JSON.parse(raw) as TranscriptSegment[];
    pathIndex.set(cacheKey(videoId, lang), fp);
    return data;
  } catch {
    return null;
  }
}

function writeToDisk(
  videoId: string,
  lang: string,
  segments: TranscriptSegment[],
): void {
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
  const fp = filePath(videoId, lang);
  writeFileSync(fp, JSON.stringify(segments, null, 2), "utf-8");
  pathIndex.set(cacheKey(videoId, lang), fp);
}

/** Clear the in-memory path index (files on disk are left intact). */
export function clearTranscriptCache(): void {
  pathIndex.clear();
}

/** Number of entries currently tracked in the in-memory index. */
export function transcriptCacheSize(): number {
  return pathIndex.size;
}

/**
 * Return the file path where a transcript is (or would be) cached.
 * Returns `null` if the transcript has never been fetched.
 */
export function getTranscriptPath(
  videoId: string,
  lang: string = "en",
): string | null {
  const key = cacheKey(videoId, lang);
  const indexed = pathIndex.get(key);
  if (indexed) return indexed;

  const fp = filePath(videoId, lang);
  if (existsSync(fp)) {
    pathIndex.set(key, fp);
    return fp;
  }
  return null;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch the transcript for a YouTube video.
 *
 * Uses YouTube's InnerTube player API (ANDROID client) to get caption track
 * URLs, then fetches and parses the timed-text XML. No API key required.
 *
 * Results are cached as JSON files in the configured `transcripts/` directory.
 *
 * @param videoIdOrUrl  YouTube video ID or full URL
 * @param lang          ISO language code (default "en")
 * @returns Array of transcript segments with text, offset (s) and duration (s)
 */
export async function fetchTranscript(
  videoIdOrUrl: string,
  lang: string = "en",
): Promise<TranscriptSegment[]> {
  const videoId = resolveVideoId(videoIdOrUrl);
  const key = cacheKey(videoId, lang);

  // 1. Check in-memory index -> read file from disk
  const indexedPath = pathIndex.get(key);
  if (indexedPath && existsSync(indexedPath)) {
    try {
      const raw = readFileSync(indexedPath, "utf-8");
      return JSON.parse(raw) as TranscriptSegment[];
    } catch {
      // Fall through and re-fetch
    }
  }

  // 2. Check disk directly (covers process restarts)
  const diskResult = readFromDisk(videoId, lang);
  if (diskResult) return diskResult;

  // 3. Fetch from YouTube via InnerTube
  const tracks = await getCaptionTracks(videoId);

  // Find the requested language track
  const track =
    tracks.find((t) => t.languageCode === lang) ??
    (lang === "en"
      ? tracks.find((t) => t.languageCode.startsWith("en"))
      : undefined);

  if (!track) {
    const available = tracks.map((t) => t.languageCode).join(", ");
    throw new Error(
      `Transcript not available in language "${lang}" for video "${videoId}". ` +
        `Available languages: ${available}`,
    );
  }

  // Fetch the timed-text XML
  const xmlResp = await fetch(track.baseUrl);
  if (!xmlResp.ok) {
    throw new Error(
      `Failed to download transcript XML: ${xmlResp.status} ${xmlResp.statusText}`,
    );
  }
  const xml = await xmlResp.text();
  const segments = parseTimedTextXml(xml);

  if (segments.length === 0) {
    throw new Error(
      `Transcript for video "${videoId}" (lang: ${lang}) was retrieved but contained no text segments.`,
    );
  }

  // Persist to disk
  writeToDisk(videoId, lang, segments);

  return segments;
}

/**
 * Fetch the transcript and return it as a single concatenated string.
 */
export async function fetchTranscriptText(
  videoIdOrUrl: string,
  lang: string = "en",
): Promise<string> {
  const segments = await fetchTranscript(videoIdOrUrl, lang);
  return segments.map((s) => s.text).join(" ");
}
