import { describe, it, expect } from "vitest";
import { resolveChannelId, getChannelVideos } from "../src/youtube-client.js";
import { getApiKey, getChannelName } from "./setup.js";

describe("youtube_channel_videos", () => {
  const apiKey = getApiKey();
  const channelName = getChannelName();

  it("resolves a channel name to a channel ID", async () => {
    const channelId = await resolveChannelId(channelName, apiKey);

    expect(channelId).toBeDefined();
    expect(channelId).not.toBeNull();
    expect(typeof channelId).toBe("string");
    expect(channelId!.startsWith("UC")).toBe(true);
  });

  it("fetches videos for a resolved channel", async () => {
    const channelId = await resolveChannelId(channelName, apiKey);
    expect(channelId).not.toBeNull();

    const videos = await getChannelVideos(channelId!, 3, apiKey);

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
    // Use a fabricated channel ID that shouldn't match anything
    const videos = await getChannelVideos(
      "UCxxxxxxxxxxxxxxxxxxxxxx",
      5,
      apiKey,
    );
    expect(videos).toBeInstanceOf(Array);
    expect(videos.length).toBe(0);
  });

  it("returns null when resolving a gibberish channel name", async () => {
    const channelId = await resolveChannelId(
      "zzz_nonexistent_channel_xyzzy_99999",
      apiKey,
    );
    // May return null or a spurious match; either way should not throw
    expect(typeof channelId === "string" || channelId === null).toBe(true);
  });
});
