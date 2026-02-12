import { Type } from "@sinclair/typebox";
import { getTrendingVideos } from "../youtube-client.js";
import type { YouTubePluginConfig } from "../types.js";

/**
 * Register the `youtube_trending_videos` agent tool.
 *
 * Returns the most popular / trending videos for a given region.
 */
export function registerTrendingVideosTool(
  api: any,
  getConfig: () => YouTubePluginConfig,
) {
  api.registerTool({
    name: "youtube_trending_videos",
    description:
      "Get the top N trending (most popular) YouTube videos for a given region. " +
      "Optionally filter by video category.",
    parameters: Type.Object({
      regionCode: Type.Optional(
        Type.String({
          description:
            'ISO 3166-1 alpha-2 country code (default "US")',
          default: "US",
        }),
      ),
      maxResults: Type.Optional(
        Type.Number({
          description:
            "Number of videos to return (1-50, default 10)",
          minimum: 1,
          maximum: 50,
          default: 10,
        }),
      ),
      categoryId: Type.Optional(
        Type.String({
          description:
            "YouTube video category ID to filter by (e.g. 10 for Music, 20 for Gaming)",
        }),
      ),
    }),
    async execute(
      _id: string,
      params: {
        regionCode?: string;
        maxResults?: number;
        categoryId?: string;
      },
    ) {
      const config = getConfig();
      if (!config.apiKey) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: YouTube API key is not configured. Set it under plugins.entries.youtube-plugin-oc.config.apiKey",
            },
          ],
        };
      }

      const regionCode = params.regionCode ?? "US";
      const maxResults = params.maxResults ?? 10;

      try {
        const videos = await getTrendingVideos(
          regionCode,
          maxResults,
          config.apiKey,
          params.categoryId,
        );

        if (videos.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No trending videos found for region "${regionCode}"${params.categoryId ? ` in category ${params.categoryId}` : ""}.`,
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
              text: `Error fetching trending videos: ${message}`,
            },
          ],
        };
      }
    },
  });
}
