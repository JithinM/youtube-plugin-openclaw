import type { YouTubePluginConfig } from "./src/types.js";
import { initCacheDir } from "./src/transcript-client.js";
import { registerChannelVideosTool } from "./src/tools/channel-videos.js";
import { registerVideoTranscriptTool } from "./src/tools/video-transcript.js";
import { registerTrendingVideosTool } from "./src/tools/trending-videos.js";
import { registerSearchVideosTool } from "./src/tools/search-videos.js";

/**
 * YouTube plugin for OpenClaw.
 *
 * Registers four agent tools:
 *   - youtube_channel_videos   – get top N videos from a channel
 *   - youtube_video_transcript – get the transcript for a video
 *   - youtube_trending_videos  – get trending videos for a region
 *   - youtube_search_videos    – search videos by topic
 *
 * Config (plugins.entries.youtube.config):
 *   - apiKey:              YouTube Data API v3 key (required for all tools except transcript)
 *   - transcriptCacheDir:  Directory for cached transcript files (default: "./transcripts")
 */
export default function register(api: any) {
  const getConfig = (): YouTubePluginConfig => {
    // api.config holds the full OpenClaw config;
    // plugin config lives under plugins.entries.youtube.config
    const pluginConfig =
      api.config?.plugins?.entries?.youtube?.config ??
      ({} as Partial<YouTubePluginConfig>);

    return {
      apiKey: pluginConfig.apiKey ?? "",
      transcriptCacheDir: pluginConfig.transcriptCacheDir,
    };
  };

  // Initialise the on-disk transcript cache directory
  const config = getConfig();
  initCacheDir(config.transcriptCacheDir);

  // Register all four tools
  registerChannelVideosTool(api, getConfig);
  registerVideoTranscriptTool(api);
  registerTrendingVideosTool(api, getConfig);
  registerSearchVideosTool(api, getConfig);

  api.logger?.info?.("YouTube plugin loaded – 4 tools registered");
  api.logger?.info?.(
    `Transcript cache directory: ${config.transcriptCacheDir || "./transcripts"}`,
  );
}
