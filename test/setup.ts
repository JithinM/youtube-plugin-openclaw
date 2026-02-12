/**
 * Shared test helpers.
 *
 * Environment variables:
 *   YOUTUBE_API_KEY       – YouTube Data API v3 key   (required for API tests)
 *   YOUTUBE_CHANNEL_NAME  – channel name / handle     (required for channel tests)
 *   YOUTUBE_VIDEO_ID      – video ID with captions    (required for transcript tests)
 */

export function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new Error(
      "YOUTUBE_API_KEY env variable is required to run this test suite. " +
        "See .env.example for details.",
    );
  }
  return key;
}

export function getChannelName(): string {
  const name = process.env.YOUTUBE_CHANNEL_NAME;
  if (!name) {
    throw new Error(
      "YOUTUBE_CHANNEL_NAME env variable is required. See .env.example.",
    );
  }
  return name;
}

export function getVideoId(): string {
  const id = process.env.YOUTUBE_VIDEO_ID;
  if (!id) {
    throw new Error(
      "YOUTUBE_VIDEO_ID env variable is required. See .env.example.",
    );
  }
  return id;
}
