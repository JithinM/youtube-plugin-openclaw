import { Type } from "@sinclair/typebox";
import { searchVideos } from "../youtube-client.js";
import type { YouTubePluginConfig } from "../types.js";

/**
 * Register the `youtube_search_videos` agent tool.
 *
 * Searches YouTube for videos matching a topic / query string.
 */
export function registerSearchVideosTool(
  api: any,
  getConfig: () => YouTubePluginConfig,
) {
  api.registerTool({
    name: "youtube_search_videos",
    description:
      "Search YouTube for videos matching a topic or query. " +
      "Returns video IDs, titles, descriptions, and publish dates.",
    parameters: Type.Object({
      topic: Type.String({
        description: "Search query / topic name",
      }),
      maxResults: Type.Optional(
        Type.Number({
          description:
            "Number of videos to return (1-50, default 10)",
          minimum: 1,
          maximum: 50,
          default: 10,
        }),
      ),
      order: Type.Optional(
        Type.Union(
          [
            Type.Literal("relevance"),
            Type.Literal("date"),
            Type.Literal("viewCount"),
          ],
          {
            description:
              'Sort order: "relevance" (default), "date", or "viewCount"',
            default: "relevance",
          },
        ),
      ),
    }),
    async execute(
      _id: string,
      params: {
        topic: string;
        maxResults?: number;
        order?: "relevance" | "date" | "viewCount";
      },
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

      const maxResults = params.maxResults ?? 10;
      const order = params.order ?? "relevance";

      try {
        const videos = await searchVideos(
          params.topic,
          maxResults,
          config.apiKey,
          order,
        );

        if (videos.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No videos found for topic "${params.topic}".`,
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
              text: `Error searching videos: ${message}`,
            },
          ],
        };
      }
    },
  });
}
