// All tunable thresholds. Edit here, then push: the site redeploys.
// Used by the server function, the dev server, and the tests.
export default {
  "location": {
    "name": "Venice Beach",
    "lat": 33.985,
    "lon": -118.47,
    "tz": "America/Los_Angeles"
  },
  "hume": {
    "match": "hume",
    "defaults": {
      "am": [
        "06:30",
        "08:30"
      ],
      "pm": [
        "17:30",
        "21:00"
      ]
    },
    "weekend": [
      "07:00",
      "19:00"
    ],
    "close": {
      "weekday": "21:00",
      "weekend": "19:00"
    },
    "walkMin": 20,
    "rainOkPct": 20,
    "rainNoPct": 40,
    "windNoMph": 15,
    "coolF": 58,
    "coldF": 55,
    "darkToleranceMin": 15,
    "classes": {
      "apiBase": "https://widget-api-tkaeguucxq-uc.a.run.app",
      "partnerId": "zuSbilfTYsWoXXM58oHytAaKldC3",
      "bookUrl": "https://app.arketa.co/iframe/humeprojects/schedule",
      "appUrl": "humeprojects://",
      "note": "Public HUME schedule (Arketa). All classes. Read at most once an hour per day shown."
    }
  },
  "surf": {
    "spot": "Venice Pier",
    "marinePoint": {
      "lat": 33.97,
      "lon": -118.48
    },
    "tideStation": "9410840",
    "slotMin": 30,
    "minWindowMin": 60,
    "minScore": 9,
    "earliest": "sunrise",
    "latest": "sunset",
    "swellFt": {
      "good": [
        2,
        6
      ],
      "ok": [
        1,
        8
      ]
    },
    "periodS": {
      "good": 10,
      "ok": 7
    },
    "swellDirDeg": {
      "good": [
        225,
        285
      ],
      "ok": [
        200,
        300
      ]
    },
    "tideFtMLLW": {
      "good": [
        -1,
        2.5
      ],
      "ok": [
        -1,
        4.0
      ]
    },
    "windMph": {
      "good": 6,
      "ok": 10
    },
    "offshoreDirDeg": [
      0,
      110
    ],
    "note": "Defaults. Tune after 1-2 weeks of real use.",
    "rainAdvisoryMm": 2.5
  },
  "sun": {
    "windowHours": 1.5,
    "hideIfMaxUvBelow": 1,
    "sunscreenUv": 3
  },
  "rollerblade": {
    "note": "R39 evening skate on the Venice boardwalk. MET 7.5 = in-line skating (Compendium of Physical Activities).",
    "latestStart": "20:30",
    "minutes": 60,
    "rainPct": 20,
    "wetMm": 0.3,
    "minTempF": 60,
    "maxWindMph": 10,
    "met": 7.5,
    "weightLb": null
  },
  "basketball": {
    "match": "basketball",
    "place": "Live Oak Park",
    "lat": 33.8895,
    "lon": -118.4065
  },
  "nba": {
    "scoreboardUrl": "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
    "note": "First tip-off of the day for fantasy lineup changes (R33). Public ESPN scoreboard, no key.",
    "extra": [
      { "league": "NFL", "url": "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard", "teams": ["LAR"] },
      { "league": "MLB", "url": "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard", "teams": ["LAD"] }
    ],
    "teamSchedules": [
      { "league": "UCLA FB", "url": "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/26/schedule", "team": "UCLA" },
      { "league": "UCLA BB", "url": "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/26/schedule", "team": "UCLA" }
    ],
    "localVenues": ["Crypto.com Arena", "Intuit Dome", "SoFi Stadium", "Dodger Stadium", "Rose Bowl", "Pauley Pavilion"],
    "tickets": {
      "LAL": "https://seatgeek.com/los-angeles-lakers-tickets",
      "LAC": "https://seatgeek.com/los-angeles-clippers-tickets",
      "NFL:LAR": "https://seatgeek.com/los-angeles-rams-tickets",
      "MLB:LAD": "https://seatgeek.com/los-angeles-dodgers-tickets",
      "UCLA FB:UCLA": "https://seatgeek.com/ucla-bruins-football-tickets",
      "UCLA BB:UCLA": "https://seatgeek.com/ucla-bruins-basketball-tickets"
    }
  },
  "lakersTv": {
    "url": "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/13/schedule",
    "note": "R41 Darin watches Spectrum SportsNet games through his plan in the NBA app; national-only games are not on it."
  },
  "lakers": {
    "team": "Los Angeles Lakers",
    "icsUrl": "https://nbaschedules.com/los-angeles-lakers/schedule.ics",
    "gameLengthMin": 150
  },
  "weekendDays": [
    "SAT",
    "SUN"
  ],
  "cacheMin": {
    "weather": 30,
    "marine": 30,
    "lakers": 720,
    "ics": 30,
    "tides": 720,
    "hume": 60,
    "nba": 30,
    "teamSchedule": 360
  },
  "weather": {
    "primary": "open-meteo",
    "note": "One source. The forecast and marine APIs need no key."
  }
};
