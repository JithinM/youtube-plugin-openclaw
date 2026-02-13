import { Type } from "@sinclair/typebox";
import {
  resolveChannelId,
  getChannelVideosFromRSS,
  RSS_MAX_VIDEOS,
} from "../innertube-client.js";

/**
 * Register the `youtube_channel_videos` agent tool.
 *
 * Given a channel name, handle, URL, or channel ID, resolves it via InnerTube
 * and fetches the top N most recent videos from the YouTube RSS feed.
 *
 * Does NOT require a YouTube Data API key or consume any API quota.
 */
export function registerChannelVideosTool(api: any) {
  api.registerTool({
    name: "youtube_channel_videos",
    description:
      "Get the top N most recent videos from a YouTube channel. " +
      "Does not require a YouTube API key. " +
      "Returns video IDs, titles, descriptions, and publish dates.",
    parameters: Type.Object({
      channelName: Type.String({
        description:
          "YouTube channel name, handle (e.g. @mkbhd), URL, or channel ID",
      }),
      maxResults: Type.Optional(
        Type.Number({
          description: `Number of videos to return (1-${RSS_MAX_VIDEOS}, default 5)`,
          minimum: 1,
          maximum: RSS_MAX_VIDEOS,
          default: 5,
        }),
      ),
    }),
    async execute(
      _id: string,
      params: { channelName: string; maxResults?: number },
    ) {
      const maxResults = Math.min(
        params.maxResults ?? 5,
        RSS_MAX_VIDEOS,
      );

      try {
        const channelId = await resolveChannelId(params.channelName);

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

        const videos = await getChannelVideosFromRSS(channelId, maxResults);

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
