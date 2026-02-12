import { describe, it, expect } from "vitest";
import { getTrendingVideos } from "../src/youtube-client.js";
import { getApiKey } from "./setup.js";

describe("youtube_trending_videos", () => {
  const apiKey = getApiKey();

  it("fetches trending videos for the US region", async () => {
    const videos = await getTrendingVideos("US", 5, apiKey);

    expect(videos).toBeInstanceOf(Array);
    expect(videos.length).toBeGreaterThan(0);
    expect(videos.length).toBeLessThanOrEqual(5);

    const first = videos[0];
    expect(first.videoId).toBeDefined();
    expect(first.videoId.length).toBeGreaterThan(0);
    expect(first.title).toBeDefined();
    expect(first.channelTitle).toBeDefined();
    expect(first.publishedAt).toBeDefined();
    expect(first.thumbnailUrl).toMatch(/^https?:\/\//);
  });

  it("fetches trending videos for a different region (IN)", async () => {
    const videos = await getTrendingVideos("IN", 3, apiKey);

    expect(videos).toBeInstanceOf(Array);
    expect(videos.length).toBeGreaterThan(0);
    expect(videos.length).toBeLessThanOrEqual(3);
  });

  it("fetches trending videos filtered by category (Music = 10)", async () => {
    const videos = await getTrendingVideos("US", 5, apiKey, "10");

    expect(videos).toBeInstanceOf(Array);
    expect(videos.length).toBeGreaterThan(0);
    expect(videos.length).toBeLessThanOrEqual(5);
  });

  it("returns results with all expected fields populated", async () => {
    const videos = await getTrendingVideos("US", 1, apiKey);
    expect(videos.length).toBe(1);

    const v = videos[0];
    expect(typeof v.videoId).toBe("string");
    expect(typeof v.title).toBe("string");
    expect(typeof v.description).toBe("string");
    expect(typeof v.channelTitle).toBe("string");
    expect(typeof v.publishedAt).toBe("string");
    expect(typeof v.thumbnailUrl).toBe("string");
  });
});
