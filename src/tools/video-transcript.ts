import { Type } from "@sinclair/typebox";
import { fetchTranscript } from "../transcript-client.js";

/**
 * Register the `youtube_video_transcript` agent tool.
 *
 * Given a video ID, fetches the transcript (captions).
 * Does NOT require a YouTube Data API key.
 */
export function registerVideoTranscriptTool(api: any) {
  api.registerTool({
    name: "youtube_video_transcript",
    description:
      "Get the transcript (captions) for a YouTube video. " +
      "Returns timestamped text segments. Does not require a YouTube API key.",
    parameters: Type.Object({
      videoId: Type.String({
        description:
          "YouTube video ID (e.g. dQw4w9WgXcQ) or full video URL",
      }),
      language: Type.Optional(
        Type.String({
          description:
            'ISO language code for the transcript (default "en")',
          default: "en",
        }),
      ),
    }),
    async execute(
      _id: string,
      params: { videoId: string; language?: string },
    ) {
      const lang = params.language ?? "en";

      try {
        const segments = await fetchTranscript(params.videoId, lang);

        if (segments.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No transcript segments found for video "${params.videoId}" in language "${lang}".`,
              },
            ],
          };
        }

        // Return both the full text and the timestamped segments
        const fullText = segments.map((s) => s.text).join(" ");
        const result = {
          videoId: params.videoId,
          language: lang,
          fullText,
          segmentCount: segments.length,
          segments,
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
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
              text: `Error fetching transcript: ${message}`,
            },
          ],
        };
      }
    },
  });
}
