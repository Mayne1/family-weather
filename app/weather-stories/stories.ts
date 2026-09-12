export type WeatherStory = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  kicker: string;
  published: string;
  readTime: string;
  sections: Array<{ heading: string; paragraphs: string[] }>;
  sources?: Array<{ label: string; url: string }>;
};

export const weatherStories: WeatherStory[] = [
  {
    slug: "destination-wedding-weather-disaster",
    title: "When a Destination Wedding Meets Weather Nobody Put in the Brochure",
    shortTitle: "Destination wedding weather disaster",
    description: "A short story about the rain, wind, heat and seasonal weather that glossy destination-wedding pictures leave outside the frame.",
    kicker: "Destination wedding weather",
    published: "2026-09-12",
    readTime: "4 minute read",
    sections: [
      {
        heading: "The package sold one perfect afternoon",
        paragraphs: [
          "The photographs showed white chairs, calm water and fabric hanging perfectly still from an arch. The couple bought the destination wedding they could already see: a ceremony outside, dinner under the sky and a sunset that would arrive on schedule.",
          "The brochure was not lying. It was simply showing the day everybody wanted. It did not show the windy afternoon when flowers would not stay upright, the tropical downpour that lasted through the ceremony hour, or the heat that kept formally dressed guests searching for the nearest air-conditioned room.",
        ],
      },
      {
        heading: "Weather does not care how far the guests traveled",
        paragraphs: [
          "Destination weddings concentrate the risk. Guests buy tickets, rooms and clothing for one place and one date. Vendors build their schedules around the same narrow window. A local shower becomes more than rain when the ceremony, photographs, dinner and transportation all depend on the same outdoor plan.",
          "That does not make destination weddings a bad idea. It makes the weather part of the destination. A beach is also wind and tide. A green hillside is also the rain that keeps it green. A desert sunset is also heat, dust and a season when thunderstorms can suddenly become the only thing anybody remembers.",
        ],
      },
      {
        heading: "The expensive mistake can be an ordinary assumption",
        paragraphs: [
          "Most weather stories do not begin with somebody ignoring a dramatic warning. They begin with a familiar sentence: it usually does not rain there. Usually is useful when choosing a season. It is less comforting when deposits are attached to one particular Saturday.",
          "Family Weather exists in that small gap between the picture people purchase and the conditions their event may actually meet. It compares the place, date and activity without pretending that any long-range weather history can guarantee the sky months from now.",
        ],
      },
    ],
  },
  {
    slug: "las-vegas-monsoon-desert-wedding",
    title: "The Las Vegas Desert Wedding and the Monsoon Nobody Mentioned",
    shortTitle: "Las Vegas monsoon wedding",
    description: "A desert wedding can look weatherproof until Las Vegas monsoon rain, wind and flash flooding enter the picture.",
    kicker: "Las Vegas monsoon season",
    published: "2026-09-12",
    readTime: "4 minute read",
    sections: [
      {
        heading: "Everything was arranged for the desert",
        paragraphs: [
          "The plan sounded almost impossible to ruin: meet outside Las Vegas, place the chairs against open desert, let the preacher stand beneath the arch and time the vows for golden hour. There would be no ballroom ceiling, no hotel carpet and no city noise in the photographs.",
          "Rain barely entered the conversation. This was the desert. The couple worried about the heat, the drive and whether everybody would find the location. They did not picture dark clouds turning the horizon into a wall or water moving across ground that had looked bone-dry an hour earlier.",
        ],
      },
      {
        heading: "Desert does not mean rain cannot become dangerous",
        paragraphs: [
          "Las Vegas has a monsoon season. The City of Las Vegas describes it as generally running from late June into mid-September and warns that its storms can trigger damaging and deadly flash floods. A place can receive little rain overall and still have a serious problem when a great deal arrives quickly.",
          "That is what makes the scenario memorable. The same open land that made the wedding package beautiful offered very little separation between the event and the weather. The chairs, flowers and carefully chosen clothing were built for the photograph. The storm was operating on a different schedule.",
        ],
      },
      {
        heading: "The risk was seasonal before it was personal",
        paragraphs: [
          "No website can promise the exact weather for a wedding many months away. Historical weather can still reveal that a date sits inside a season with a particular risk. Later, when the date enters forecast range, the question changes from what has happened around this time to what is expected during the actual ceremony hours.",
          "The desert wedding remains a beautiful idea. The fuller picture simply includes the monsoon that never appeared in the sales photograph.",
        ],
      },
    ],
    sources: [
      { label: "City of Las Vegas — Monsoon Season", url: "https://www.lasvegasnevada.gov/News/Blog/Detail/monsoon-season" },
    ],
  },
  {
    slug: "burning-man-rain-desert-mud",
    title: "Burning Man, Rain and the Day the Desert Turned to Mud",
    shortTitle: "Burning Man rain and mud",
    description: "Burning Man weather showed how quickly rain can turn Nevada desert ground into mud and change a massive outdoor event.",
    kicker: "Burning Man weather",
    published: "2026-09-12",
    readTime: "4 minute read",
    sections: [
      {
        heading: "Everybody expects the dust",
        paragraphs: [
          "Burning Man takes place in Nevada's Black Rock Desert, where temporary streets, camps and monumental art rise from a dry lakebed. Dust is part of the event's identity. Rain sounds almost like relief until it reaches the playa.",
          "In 2023, heavy rain turned the surface into thick mud, closed access and left tens of thousands of attendees waiting for the ground to dry. In 2026, rain and strong wind again interrupted movement at the event and returned Burning Man weather to the news.",
        ],
      },
      {
        heading: "A dry lakebed remembers what water does",
        paragraphs: [
          "The same fine sediment that produces famous dust becomes difficult mud when wet. Vehicles cannot simply treat it like an ordinary rainy road. People who arrived prepared for sun, heat and airborne dust suddenly had a different version of the desert under their feet.",
          "That reversal is why the story travels so well. One of the driest-looking event locations in America can be transformed by less rain than residents of wetter places would consider remarkable. The impact comes from the combination of weather, ground and activity—not the rainfall number by itself.",
        ],
      },
      {
        heading: "Weather severity depends on what is happening beneath it",
        paragraphs: [
          "An inch of rain over an ordinary paved neighborhood and an inch over a temporary city on a playa are not the same event. Thousands of people, limited access roads and a surface that becomes difficult to cross turn weather into logistics.",
          "That same principle scales down to weddings, cookouts and family reunions. Conditions matter because of what people planned to do in them. Family Weather was built around that relationship: activity, location, date and the weather window where they meet.",
        ],
      },
    ],
    sources: [
      { label: "ABC News — Burning Man flooding in 2023", url: "https://abcnews.com/US/burning-man-flooding-happened-stranded-festivalgoers/story?id=102908331" },
      { label: "SFGATE — Burning Man rain and mud in 2026", url: "https://www.sfgate.com/travel/burningman/article/burning-man-rain-mud-22418072.php" },
    ],
  },
  {
    slug: "windy-cookout-pool-party",
    title: "The Cookout Was Fine. The Napkins Were Not.",
    shortTitle: "The windy family cookout",
    description: "A family poolside cookout explains how ordinary wind can change an outdoor gathering without canceling the cooking.",
    kicker: "Windy cookout story",
    published: "2026-09-12",
    readTime: "3 minute read",
    sections: [
      {
        heading: "A hot day sounded like a pool day",
        paragraphs: [
          "The invitation went out because the day looked hot enough for the pool. Food arrived, the grill heated up and the covered and uncovered patios gave everybody room to spread out. The weather did not ruin the cookout with a storm. It sent wind.",
          "First the napkins moved. Then foil, empty plates and light containers started traveling. Some of them landed in the pool. One person shifted into get-the-stuff-out-of-the-water mode while everybody else carried the dining setup back into the house.",
        ],
      },
      {
        heading: "Cooking outside and dining outside are different decisions",
        paragraphs: [
          "The grill could still do its job. The person cooking could step outside, turn the meat, check it and return indoors while continuing to watch the process. What stopped making sense was asking the whole family to sit outside and spend the meal chasing everything that had become lighter than the wind.",
          "So the cookout remained a cookout. The food was cooked outside and eaten inside. Nothing was canceled. The weather changed the arrangement by a few yards.",
        ],
      },
      {
        heading: "Not every weather problem deserves disaster music",
        paragraphs: [
          "Ten-mile-an-hour wind is not a historic event. Around an outdoor table, however, it can be the difference between relaxing and cleaning the yard after every plate is finished. Heat can create a similar split: the pool may suit one part of the family while older guests prefer the house.",
          "That ordinary judgment is the origin of Family Weather. The useful question was never only whether rain existed. It was whether the temperature, wind and timing suited what the family planned to do.",
        ],
      },
    ],
  },
  {
    slug: "best-weather-window-for-an-event",
    title: "Sometimes the Party Does Not Need Canceling. It Needs a Better Hour.",
    shortTitle: "A better weather window",
    description: "Rain can change an event's arrival time without changing the whole day, especially when guests are driving across Northern California.",
    kicker: "Best time for an outdoor event",
    published: "2026-09-12",
    readTime: "4 minute read",
    sections: [
      {
        heading: "The invitation had a time, but the storm had one too",
        paragraphs: [
          "A Northern California Christmas gathering meant drives of roughly an hour for much of the family. Some would come from Oakland, others from Stockton, and the host would be waiting around Pittsburg or Antioch. Then heavy rain arrived during the trip.",
          "The party itself was not the entire problem. Guests still had to park, unload what they brought and reach the door in clothes chosen for Christmas rather than a downpour. An invitation that said only when the gathering started could not explain that the worst rain might pass an hour later.",
        ],
      },
      {
        heading: "Bay Area weather can change before the guest arrives",
        paragraphs: [
          "Rain can be over at the destination while it is still falling where a guest begins the drive. It can also move toward the event while another part of the region clears. Every guest remains responsible for the conditions along their own route.",
          "The host has a different question: what will the weather be where everybody is gathering when they arrive? If the strongest destination window is between six and eight, that information may justify a later start. If most guests are coming from the same direction, the host may decide that moving the gathering closer to them makes more sense than asking a dozen people to make the longer trip.",
        ],
      },
      {
        heading: "A weather window is not a command",
        paragraphs: [
          "The forecast does not decide whether a family should travel, change houses or keep the original plan. It gives the host another piece of information: rain timing, temperature, wind and the hours that look more suitable at the destination.",
          "Family Weather grew from that simple idea. People already know what they are trying to do. They do not need a website to run their lives. They may only need to see that the same event could feel completely different two hours later.",
        ],
      },
    ],
  },
];

export function weatherStory(slug: string) {
  return weatherStories.find((story) => story.slug === slug);
}
