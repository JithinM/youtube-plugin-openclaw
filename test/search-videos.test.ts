import { describe, it, expect } from "vitest";
import { searchVideos } from "../src/youtube-client.js";
import { getApiKey } from "./setup.js";

describe("youtube_search_videos", () => {
  const apiKey = getApiKey();

  it("searches for videos by topic (relevance)", async () => {
    const videos = await searchVideos("TypeScript tutorial", 5, apiKey);

    expect(videos).toBeInstanceOf(Array);
    expect(videos.length).toBeGreaterThan(0);
    expect(videos.length).toBeLessThanOrEqual(5);

    const first = videos[0];
    expect(first.videoId).toBeDefined();
    expect(first.videoId.length).toBeGreaterThan(0);
    expect(first.title).toBeDefined();
    expect(first.channelTitle).toBeDefined();
  });

  it("searches with order=viewCount", async () => {
    const videos = await searchVideos(
      "JavaScript",
      3,
      apiKey,
      "viewCount",
    );

    expect(videos).toBeInstanceOf(Array);
    expect(videos.length).toBeGreaterThan(0);
    expect(videos.length).toBeLessThanOrEqual(3);
  });

  it("searches with order=date", async () => {
    const videos = await searchVideos("OpenAI", 3, apiKey, "date");

    expect(videos).toBeInstanceOf(Array);
    expect(videos.length).toBeGreaterThan(0);
  });

  it("returns results with all expected fields", async () => {
    const videos = await searchVideos("node.js", 1, apiKey);
    expect(videos.length).toBe(1);

    const v = videos[0];
    expect(typeof v.videoId).toBe("string");
    expect(typeof v.title).toBe("string");
    expect(typeof v.description).toBe("string");
    expect(typeof v.channelTitle).toBe("string");
    expect(typeof v.publishedAt).toBe("string");
    expect(typeof v.thumbnailUrl).toBe("string");
  });

  it("returns empty array for a nonsense query", async () => {
    const videos = await searchVideos(
      "xyzzy_qqq_zzzz_nonexistent_topic_12345",
      5,
      apiKey,
    );
    // Could return 0 or a few tangential results – should not throw
    expect(videos).toBeInstanceOf(Array);
  });
});
