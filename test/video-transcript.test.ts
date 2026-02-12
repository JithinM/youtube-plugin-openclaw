import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  fetchTranscript,
  fetchTranscriptText,
  initCacheDir,
  clearTranscriptCache,
  transcriptCacheSize,
  getTranscriptPath,
} from "../src/transcript-client.js";
import { getVideoId } from "./setup.js";

const TEST_CACHE_DIR = join(__dirname, ".tmp-transcript-cache");

describe("youtube_video_transcript", () => {
  const videoId = getVideoId();

  beforeAll(() => {
    // Point cache at a temp directory so tests don't pollute the real cache
    initCacheDir(TEST_CACHE_DIR);
    clearTranscriptCache();
  });

  afterAll(() => {
    // Clean up temp cache directory
    clearTranscriptCache();
    if (existsSync(TEST_CACHE_DIR)) {
      rmSync(TEST_CACHE_DIR, { recursive: true, force: true });
    }
  });

  it("fetches transcript segments for a known video", async () => {
    const segments = await fetchTranscript(videoId);

    expect(segments).toBeInstanceOf(Array);
    expect(segments.length).toBeGreaterThan(0);

    const first = segments[0];
    expect(typeof first.text).toBe("string");
    expect(first.text.length).toBeGreaterThan(0);
    expect(typeof first.offset).toBe("number");
    expect(typeof first.duration).toBe("number");
  });

  it("caches the transcript to disk after first fetch", async () => {
    // The test above should have populated the cache
    const cachedPath = getTranscriptPath(videoId, "en");

    expect(cachedPath).not.toBeNull();
    expect(existsSync(cachedPath!)).toBe(true);
  });

  it("serves subsequent requests from disk cache", async () => {
    const sizeBefore = transcriptCacheSize();
    const segments = await fetchTranscript(videoId);

    // Should still return data from cache
    expect(segments).toBeInstanceOf(Array);
    expect(segments.length).toBeGreaterThan(0);

    // Cache size should not have grown (same video, already cached)
    expect(transcriptCacheSize()).toBe(sizeBefore);
  });

  it("fetches transcript as concatenated text", async () => {
    const text = await fetchTranscriptText(videoId);

    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(0);
    // Should be plain human-readable text, not a JSON object/array dump
    expect(text).not.toMatch(/^\s*\{"\w+"/); // not a JSON object
    expect(text).not.toMatch(/^\s*\[\s*\{/); // not a JSON array of objects
  });

  it("throws a readable error for an invalid video ID", async () => {
    // A clearly invalid video ID should cause the scraper to throw
    await expect(
      fetchTranscript("00000000000"),
    ).rejects.toThrow();
  });
});
