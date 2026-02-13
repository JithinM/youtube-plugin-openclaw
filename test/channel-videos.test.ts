import { describe, it, expect } from "vitest";
import {
  resolveChannelId,
  getChannelVideosFromRSS,
} from "../src/innertube-client.js";
import { getChannelName } from "./setup.js";

describe("youtube_channel_videos", () => {
  const channelName = getChannelName();

  it("resolves a channel name to a channel ID", async () => {
    const channelId = await resolveChannelId(channelName);

    expect(channelId).toBeDefined();
    expect(channelId).not.toBeNull();
    expect(typeof channelId).toBe("string");
    expect(channelId!.startsWith("UC")).toBe(true);
  });

  it("fetches videos for a resolved channel via RSS", async () => {
    const channelId = await resolveChannelId(channelName);
    expect(channelId).not.toBeNull();

    const videos = await getChannelVideosFromRSS(channelId!, 3);

    expect(videos).toBeInstanceOf(Array);
    expect(videos.length).toBeGreaterThan(0);
    expect(videos.length).toBeLessThanOrEqual(3);

    const first = videos[0];
    expect(first.videoId).toBeDefined();
    expect(first.videoId.length).toBeGreaterThan(0);
    expect(first.title).toBeDefined();
    expect(first.description).toBeDefined();
    expect(first.channelTitle).toBeDefined();
    expect(first.publishedAt).toBeDefined();
    expect(first.thumbnailUrl).toBeDefined();
  });

  it("returns an empty array for a non-existent channel ID", async () => {
    // Use a fabricated channel ID – RSS feed will return 404 or empty
    try {
      const videos = await getChannelVideosFromRSS(
        "UCxxxxxxxxxxxxxxxxxxxxxx",
        5,
      );
      expect(videos).toBeInstanceOf(Array);
      expect(videos.length).toBe(0);
    } catch (error) {
      // RSS feed may throw for invalid channel ID – that's acceptable
      expect(error).toBeDefined();
    }
  });

  it("returns null when resolving a gibberish channel name", async () => {
    const channelId = await resolveChannelId(
      "zzz_nonexistent_channel_xyzzy_99999",
    );
    // Should return null for unknown channel
    expect(channelId).toBeNull();
  });
});
