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
  "basketball": {
    "match": "basketball",
    "place": "Live Oak Park",
    "lat": 33.8895,
    "lon": -118.4065
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
    "hume": 60
  },
  "weather": {
    "primary": "open-meteo",
    "note": "One source. The forecast and marine APIs need no key."
  }
};
