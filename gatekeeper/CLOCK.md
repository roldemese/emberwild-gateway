# The 🍂🔥 clock

Year 1 starts at the northern winter solstice on 21 December 2026 at 20:50 UTC. That is 12:50 PM Pacific time. The source is the USNO Astronomical Applications Department, Earth's Seasons, Universal Time, to the published minute.

https://aa.usno.navy.mil/data/Earth_Seasons

https://aa.usno.navy.mil/calculated/seasons?dst=false&submit=Get+Data&tz=0&tz_label=true&tz_sign=1&year=2026

Seasons run from solstice to equinox to solstice. Their lengths are uneven. The 🍂🔥 year does not insert a leap day of its own. A day is a Pacific calendar date. Day 1 is the Pacific date of the season's starting instant, and only after that instant.

The founders' story is the 40 days before Year 1. It starts on 11 November 2026 at midnight Pacific (08:00 UTC) and ends at the Year 1 instant.

Inside a year the seasons are numbered winter 1, spring 2, summer 3, autumn 4. A new year opens at each December solstice from 2026.

The hard-coded table in `clock.mjs` holds the USNO minutes for 2026, 2027, and 2028. Seconds are not in the published minute, so each instant is stored at `:00`. The next boundary after 21 December 2028 is not in this table and is marked `UNVERIFIED`.

| Year | Instant (UTC) | Season | USNO page |
|---|---|---|---|
| 2026 | 2026-03-20 14:46 | spring | year=2026 |
| 2026 | 2026-06-21 08:24 | summer | year=2026 |
| 2026 | 2026-09-23 00:05 | autumn | year=2026 |
| 2026 | 2026-12-21 20:50 | winter | year=2026 |
| 2027 | 2027-03-20 20:25 | spring | year=2027 |
| 2027 | 2027-06-21 14:11 | summer | year=2027 |
| 2027 | 2027-09-23 06:02 | autumn | year=2027 |
| 2027 | 2027-12-22 02:42 | winter | year=2027 |
| 2028 | 2028-03-20 02:17 | spring | year=2028 |
| 2028 | 2028-06-20 20:02 | summer | year=2028 |
| 2028 | 2028-09-22 11:45 | autumn | year=2028 |
| 2028 | 2028-12-21 08:19 | winter | year=2028 |
