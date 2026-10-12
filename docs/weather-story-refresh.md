# Weather room media and refresh

The homepage is `app/design-preview/HomePreview.tsx`, imported by `app/page.tsx`.
The older static-home README does not describe this Next.js homepage.

## Content ownership

- `app/weather-stories/stories.ts`: original articles, source links and publication/update dates.
- `app/weather-stories/media.ts`: featured story order, media credits, video IDs and publication dates. Change the selection here; do not patch several components.
- `public/weather-stories/`: original AI-generated wedding illustrations, visibly labeled as illustrations.
- `app/components/weather-media/`: shared card/detail visuals and click-to-load YouTube player. No media is downloaded or rehosted from news publishers. The native YouTube player and a permanent watch-on-YouTube link preserve source attribution and provide an alternative if embeds are unavailable.

## Fortnightly review

A ChatGPT reminder/research shortlist is scheduled every other Monday starting October 26, 2026, in America/Los_Angeles. This is a review task, not an automatic production deployment.

1. Review three new weather-disruption stories: weddings, festivals, family outings or travel. Content Scout can supply candidate public links when available; no runnable Content Scout integration was found in this repository.
2. Verify the incident, event date, original publisher and video availability. Use original summaries with source links. Use licensed/original illustrations or publisher-enabled embeds instead of copying arbitrary news photos.
3. Update `weatherVideos`, `storyMedia` and `featuredStorySlugs`; preserve old article URLs. Mark illustrated scenarios clearly and keep event dates visible on older footage.
4. Check each video on the deployed page, including play, fullscreen, selection switching and the watch-on-YouTube fallback. A directly opened embed URL can show YouTube error 153 because it has no HTTP referrer; test within the actual page. Preserve `strict-origin-when-cross-origin`.
5. Run `npm run build` and check desktop/mobile layouts, the three cards, story details and bottom player before deploying.

YouTube no longer supports the old embedded keyword-search player (`listType=search`). The current watch section uses a verified curated selection. Ongoing discovery should happen in Content Scout / the YouTube Data API, followed by editorial selection; do not describe the player as a live search feed.

## Original image provenance

Generated October 12, 2026 with the built-in image-generation tool, then saved as WebP for this project.

- `las-vegas-monsoon-wedding.webp`: fictional desert wedding near Las Vegas interrupted by summer monsoon rain; wet terrace, white chairs and floral arch, red-rock mountains, couple moving toward shelter; realistic wide editorial illustration, no text or logos.
- `destination-wedding-rain.webp`: fictional tropical wedding setup in wind-driven rain; floral arch, empty wet chairs, overturned light chair, ocean and palms viewed from a sheltered veranda; realistic wide editorial illustration, no text or logos.

Neither image is documentary evidence of a real named wedding. Reuters' 2023 Burning Man video and FOX5's September 2023 Las Vegas report remain hosted on YouTube.
