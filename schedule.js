/* =====================================================================
   schedule.js: Chengxuan's week. Edit this file to swap in a new week.

   HOW TIMES WORK
   - Every time is written "YYYY-MM-DDTHH:MM" in the `zone` set below.
   - Add "@Zone/Name" to write one time in a different zone,
     e.g. "2026-11-16T05:55@Asia/Singapore".
   - status: "busy" = can't text, "text" = can text, "free" = free!
   - estimated: true gives a dashed border and a "~" before the times.
   - tag: "mun" puts the graduation cap on the kiwi mascot.
   ===================================================================== */
globalThis.SCHEDULE = {
  title: "CHEMUN week in Chennai",
  zone: "Asia/Kolkata",        // the zone all the times below are written in
  city: "Chennai",              // name shown on the "My time" toggle

  // Where I am (for the "My time" clock). Outside these ranges = home.
  home: { zone: "Asia/Singapore", city: "Singapore" },
  locations: [
    { from: "2026-11-12T08:45", until: "2026-11-16T05:55@Asia/Singapore", zone: "Asia/Kolkata", city: "Chennai" }
  ],

  // The stretch this schedule describes. Gaps inside it count as free.
  coverage: { start: "2026-11-12T02:00", end: "2026-11-16T05:55@Asia/Singapore" },

  // "Leaving in … hours" countdown (shown until this moment)
  leaveAt: "2026-11-12T02:00",
  leaveLabel: "Chengxuan leaves for Chennai in",

  // "Chengxuan is home" countdown
  homeAt: "2026-11-16T05:55@Asia/Singapore",

  messages: {
    before: { title: "Getting ready for Chennai 🧳", sub: "Normal Singapore days until the trip starts" },
    after:  { title: "Back home 🥝", sub: "Normal schedule coming soon" }
  },

  myBlocks: [
    {
      id: "thu-travel", title: "Travel day", emoji: "✈️",
      start: "2026-11-12T02:00", end: "2026-11-12T10:00",
      desc: "Flying to Chennai for CHEMUN!",
      children: [
        { title: "Heading to the airport", emoji: "🚕", now: "On the way to the airport", start: "2026-11-12T02:00", end: "2026-11-12T04:30", status: "busy", desc: "Bags packed, kiwi spirit ready." },
        { title: "Flying to Chennai", emoji: "✈️", now: "Flying to Chennai", start: "2026-11-12T04:30", end: "2026-11-12T08:45", status: "busy", desc: "Up in the clouds, thinking about you." },
        { title: "Landing & getting settled", emoji: "🧳", now: "Landing and getting settled", start: "2026-11-12T08:45", end: "2026-11-12T10:00", status: "busy", estimated: true, desc: "Landing, finding my way and dropping my bags." }
      ]
    },
    {
      id: "fri-mun", title: "MUN day", emoji: "🎓", tag: "mun",
      start: "2026-11-13T08:00", end: "2026-11-13T16:30",
      desc: "Day 1 of CHEMUN.",
      children: [
        { title: "Registration", emoji: "📝", now: "At registration", start: "2026-11-13T08:00", end: "2026-11-13T09:00", status: "busy", desc: "Getting my badge and finding my committee room." },
        { title: "Opening ceremony", emoji: "🎤", now: "At the opening ceremony", start: "2026-11-13T09:00", end: "2026-11-13T10:00", status: "busy", desc: "Speeches and the official start of CHEMUN." },
        { title: "Committee", emoji: "🇷🇺", now: "In committee", start: "2026-11-13T10:00", end: "2026-11-13T12:30", status: "busy", desc: "UN4MUN committee: I'm representing Russia 🇷🇺 (decisions by consensus)." },
        { title: "Lunch", emoji: "🍛", now: "At lunch", start: "2026-11-13T12:30", end: "2026-11-13T13:25", status: "text", desc: "Lunch break, so he can text!" },
        { title: "Committee", emoji: "🇷🇺", now: "In committee", start: "2026-11-13T13:25", end: "2026-11-13T16:30", status: "busy", desc: "UN4MUN committee: I'm representing Russia 🇷🇺 (decisions by consensus)." }
      ]
    },
    {
      id: "sat-mun", title: "MUN + social night", emoji: "🎉", tag: "mun",
      start: "2026-11-14T09:00", end: "2026-11-14T20:00",
      desc: "Day 2 of CHEMUN, with social night in the evening.",
      children: [
        { title: "Committee", emoji: "🇷🇺", now: "In committee", start: "2026-11-14T09:00", end: "2026-11-14T12:00", status: "busy", desc: "UN4MUN committee: I'm representing Russia 🇷🇺 (decisions by consensus)." },
        { title: "Lunch", emoji: "🍛", now: "At lunch", start: "2026-11-14T12:00", end: "2026-11-14T12:55", status: "text", estimated: true, desc: "Lunch break, so he can text! (Time not 100% confirmed.)" },
        { title: "Committee", emoji: "🇷🇺", now: "In committee", start: "2026-11-14T12:55", end: "2026-11-14T16:30", status: "busy", desc: "UN4MUN committee: I'm representing Russia 🇷🇺 (decisions by consensus)." },
        { title: "Free time", emoji: "💚", now: "Free", start: "2026-11-14T16:30", end: "2026-11-14T17:30", status: "free", desc: "A free hour before social night. Call him!" },
        { title: "Social night", emoji: "🪩", now: "At social night", start: "2026-11-14T17:30", end: "2026-11-14T20:00", status: "busy", desc: "The CHEMUN social. He'll miss you the whole time." }
      ]
    },
    {
      id: "sun-mun", title: "MUN day", emoji: "🎓", tag: "mun",
      start: "2026-11-15T09:15", end: "2026-11-15T16:00",
      desc: "Final day of CHEMUN.",
      children: [
        { title: "Committee", emoji: "🇷🇺", now: "In committee", start: "2026-11-15T09:15", end: "2026-11-15T13:00", status: "busy", desc: "UN4MUN committee: I'm representing Russia 🇷🇺 (decisions by consensus)." },
        { title: "Lunch", emoji: "🍛", now: "At lunch", start: "2026-11-15T13:00", end: "2026-11-15T13:55", status: "text", estimated: true, desc: "Lunch break, so he can text! (Time not 100% confirmed.)" },
        { title: "Committee", emoji: "🇷🇺", now: "In committee", start: "2026-11-15T13:55", end: "2026-11-15T15:00", status: "busy", desc: "Last committee session!" },
        { title: "Closing ceremony", emoji: "🏆", now: "At the closing ceremony", start: "2026-11-15T15:00", end: "2026-11-15T16:00", status: "busy", desc: "Awards and goodbyes." }
      ]
    },
    {
      id: "sun-home", title: "Going home", emoji: "🏡",
      start: "2026-11-15T20:30", end: "2026-11-16T05:55@Asia/Singapore", estimated: true,
      desc: "Heading back to Singapore.",
      children: [
        { title: "At the airport", emoji: "🧳", now: "At the airport", start: "2026-11-15T20:30", end: "2026-11-15T23:15", status: "busy", estimated: true, desc: "Check-in and security." },
        { title: "Flight home", emoji: "✈️", now: "Flying home", start: "2026-11-15T23:15", end: "2026-11-16T05:55@Asia/Singapore", status: "busy", desc: "Overnight flight. Landing in Singapore at 5:55 AM Singapore time." }
      ]
    },
    {
      id: "back-home", title: "Back home 🥝", emoji: "🏡",
      start: "2026-11-16T05:55@Asia/Singapore", end: "2026-11-17T00:00@Asia/Singapore",
      status: "unknown",
      desc: "Normal schedule coming soon!"
    }
  ],

  // Livina's week. Times are in her zone.
  livina: {
    zone: "Europe/Madrid",
    city: "Barcelona",
    weekdays: [1, 2, 3, 4, 5],          // 0 = Sunday … 6 = Saturday
    block: {
      title: "School + trip home", emoji: "📚", start: "08:50", end: "17:30",
      desc: "Livina's school day.",
      children: [
        { title: "School", emoji: "📚", start: "08:50", end: "16:30", status: "busy", desc: "You're at school. Go learn things, smart girl." },
        { title: "Trip home", emoji: "🚌", start: "16:30", end: "17:30", status: "busy", desc: "On your way home. Home by 5:30." }
      ]
    }
  },

  // For tests/check.js: the both-free windows we expect, written in `zone`.
  // Update these when you swap in a new week.
  expectBothFree: [
    ["2026-11-12T10:00", "2026-11-12T13:20"],
    ["2026-11-12T22:00", "2026-11-13T08:00"],
    ["2026-11-13T22:00", "2026-11-14T09:00"],
    ["2026-11-14T16:30", "2026-11-14T17:30"],
    ["2026-11-14T20:00", "2026-11-15T09:15"],
    ["2026-11-15T16:00", "2026-11-15T20:30"]
  ]
};
