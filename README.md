# YouTube Plugin for OpenClaw

A plugin that adds YouTube integration to [OpenClaw](https://docs.openclaw.ai/) via four agent tools:

| Tool | Description | Requires API Key |
|------|-------------|:---:|
| `youtube_channel_videos` | Get top N recent videos from a channel | Yes |
| `youtube_video_transcript` | Get transcript (captions) for a video | No |
| `youtube_trending_videos` | Get trending videos for a region | Yes |
| `youtube_search_videos` | Search videos by topic / keyword | Yes |

## Prerequisites

- [OpenClaw](https://docs.openclaw.ai/install) installed and running
- A **YouTube Data API v3** key ([get one here](https://console.cloud.google.com/apis/credentials))
  - Only needed for channel videos, trending, and search tools
  - The transcript tool works without any API key

## Install

### Option A: Install from a local folder (development)

```bash
openclaw plugins install -l /path/to/youtube-openclaw-plugin
cd /path/to/youtube-openclaw-plugin && npm install
```

### Option B: Copy-install from local folder

```bash
openclaw plugins install /path/to/youtube-openclaw-plugin
```

Restart the Gateway after installing.

## Configuration

Add your YouTube API key under `plugins.entries.youtube-plugin-oc.config` in your OpenClaw config:

```json5
{
  plugins: {
    entries: {
      youtube-plugin-oc: {
        enabled: true,
        config: {
          apiKey: "YOUR_YOUTUBE_DATA_API_V3_KEY"
        }
      }
    }
  }
}
```

Restart the Gateway after changing config.

## Tools

### youtube_channel_videos

Get the most recent videos from a YouTube channel.

**Parameters:**
- `channelName` (string, required) – Channel name, handle (e.g. `@mkbhd`), or channel ID
- `maxResults` (number, optional, default 5) – Number of videos to return (1–50)

**Returns:** Array of video objects with `videoId`, `title`, `description`, `channelTitle`, `publishedAt`, `thumbnailUrl`.

### youtube_video_transcript

Fetch the transcript (captions/subtitles) for a video. Does **not** require a YouTube API key.

**Parameters:**
- `videoId` (string, required) – Video ID (e.g. `dQw4w9WgXcQ`) or full URL
- `language` (string, optional, default `"en"`) – ISO language code

**Returns:** Object with `videoId`, `language`, and `fullText` (concatenated transcript).

### youtube_trending_videos

Get the most popular / trending videos for a region.

**Parameters:**
- `regionCode` (string, optional, default `"US"`) – ISO 3166-1 alpha-2 country code
- `maxResults` (number, optional, default 10) – Number of videos (1–50)
- `categoryId` (string, optional) – YouTube video category ID (e.g. `10` for Music, `20` for Gaming)

**Returns:** Array of video objects.

### youtube_search_videos

Search YouTube by topic or keyword.

**Parameters:**
- `topic` (string, required) – Search query
- `maxResults` (number, optional, default 10) – Number of results (1–50)
- `order` (string, optional, default `"relevance"`) – Sort order: `relevance`, `date`, or `viewCount`

**Returns:** Array of video objects.

## YouTube API Quota

The YouTube Data API v3 has a daily quota (default 10,000 units). Costs per call:
- `search.list` (channel videos, search) – **100 units**
- `videos.list` (trending) – **1 unit**
- Transcript fetching – **0 units** (does not use the YouTube Data API)

Plan your usage accordingly. See [YouTube API Quota](https://developers.google.com/youtube/v3/determine_quota_cost) for details.

## Development

```bash
# Install dependencies
npm install

# Typecheck
npm run typecheck

# Run tests
npm test
```

## License

MIT
