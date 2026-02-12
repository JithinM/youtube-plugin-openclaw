import { Type } from "@sinclair/typebox";
import { resolveChannelId, getChannelVideos } from "../youtube-client.js";
import type { YouTubePluginConfig } from "../types.js";

/**
 * Register the `youtube_channel_videos` agent tool.
 *
 * Given a channel name or handle, resolves it to a channel ID and returns
 * the top N most recent videos.
 */
export function registerChannelVideosTool(
  api: any,
  getConfig: () => YouTubePluginConfig,
) {
  api.registerTool({
    name: "youtube_channel_videos",
    description:
      "Get the top N most recent videos from a YouTube channel. " +
      "Returns video IDs, titles, descriptions, and publish dates.",
    parameters: Type.Object({
      channelName: Type.String({
        description:
          "YouTube channel name, handle (e.g. @mkbhd), or channel ID",
      }),
      maxResults: Type.Optional(
        Type.Number({
          description:
            "Number of videos to return (1-50, default 5)",
          minimum: 1,
          maximum: 50,
          default: 5,
        }),
      ),
    }),
    async execute(
      _id: string,
      params: { channelName: string; maxResults?: number },
    ) {
      const config = getConfig();
      if (!config.apiKey) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: YouTube API key is not configured. Set it under plugins.entries.youtube.config.apiKey",
            },
          ],
        };
      }

      const maxResults = params.maxResults ?? 5;

      try {
        // If it looks like a channel ID already (starts with UC), use it directly
        let channelId: string | null = null;
        if (params.channelName.startsWith("UC") && params.channelName.length === 24) {
          channelId = params.channelName;
        } else {
          channelId = await resolveChannelId(params.channelName, config.apiKey);
        }

        if (!channelId) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No YouTube channel found matching "${params.channelName}".`,
              },
            ],
          };
        }

        const videos = await getChannelVideos(
          channelId,
          maxResults,
          config.apiKey,
        );

        if (videos.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No videos found for channel "${params.channelName}" (ID: ${channelId}).`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(videos, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching channel videos: ${message}`,
            },
          ],
        };
      }
    },
  });
}
