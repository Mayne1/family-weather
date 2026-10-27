# Announcement designs and homepage demo playlist

Six additional announcement designs reuse existing invitation artwork. The original three remain available. Both frontend and announcements backend must be deployed together so the new theme IDs are accepted when saving. No database migration is needed.

Homepage demo playlist defaults to the owner-provided Family Weather | The Complete Series playlist (`PLFhecwVBN5yk`). To override it, set NEXT_PUBLIC_DEMO_PLAYLIST_ID to the YouTube playlist ID (the list= value in its URL), then rebuild. The setting is public, not a credential. Use a public or unlisted playlist with embedding allowed. Without a valid setting, the existing weather-report player remains visible. With it, the homepage shows the Family Weather demo playlist. Playback begins after a visitor clicks Play and loops the playlist. No YouTube API key is required.

Validation: announcement integration tests cover saving and public retrieval of each added theme and rejection of unknown themes. The supplied playlist page was verified as Family Weather | The Complete Series. Embedded playback still needs a browser check after deployment.
