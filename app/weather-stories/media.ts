/** Curated media: update this file when reviewing the fortnightly story shortlist. */
export type WeatherVideo = {
  id: string;
  title: string;
  publisher: string;
  published: string;
  description: string;
};

export const weatherVideos: WeatherVideo[] = [
  {
    id: "euGIg16Zn7c",
    title: "Burning Man: when the desert became mud",
    publisher: "Reuters",
    published: "2023-09-03",
    description: "Original reporting from the 2023 festival, where rain changed the ground and stranded attendees.",
  },
  {
    id: "u_f1mkFkEjY",
    title: "Las Vegas monsoon: streets become flood channels",
    publisher: "FOX5 Las Vegas",
    published: "2023-09-07",
    description: "Local reporting on the Labor Day storms that tested the valley’s flood-control system.",
  },
];

export type StoryMedia = {
  image?: { src: string; alt: string; caption: string };
  video?: WeatherVideo;
  kind: string;
  note: string;
};

export const storyMedia: Record<string, StoryMedia> = {
  "destination-wedding-weather-disaster": {
    image: {
      src: "/weather-stories/destination-wedding-rain.webp",
      alt: "Illustration of wind-driven rain sweeping through an empty tropical beach wedding setup",
      caption: "AI-generated illustration · Family Weather",
    },
    kind: "Illustrated planning story",
    note: "An imagined wedding scenario, followed by a documented example from Massachusetts. The illustration does not depict that real wedding.",
  },
  "las-vegas-monsoon-desert-wedding": {
    image: {
      src: "/weather-stories/las-vegas-monsoon-wedding.webp",
      alt: "Illustration of a couple leaving a rain-soaked desert wedding terrace as a monsoon moves across the mountains",
      caption: "AI-generated illustration · Family Weather",
    },
    video: weatherVideos[1],
    kind: "Illustrated story + local reporting",
    note: "The wedding scene is illustrative. FOX5’s video documents actual Las Vegas flooding, not this imagined wedding.",
  },
  "burning-man-rain-desert-mud": {
    video: weatherVideos[0],
    kind: "Reported event · September 2023",
    note: "Actual news footage from Reuters. Play the original report below.",
  },
};

export const featuredStorySlugs = [
  "destination-wedding-weather-disaster",
  "las-vegas-monsoon-desert-wedding",
  "burning-man-rain-desert-mud",
];
