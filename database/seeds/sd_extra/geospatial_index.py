"""Building Blocks — Geospatial Indexing."""

from __future__ import annotations

from database.seeds.learn_system_design import SD

TOPIC = "sd-building-blocks"

LESSON = SD(
    "sd-geospatial-index",
    "Geospatial Indexing",
    "How \"find drivers within 2 km\" is answered fast: geohash cells, quadtrees, and the query flow behind ride-sharing and Yelp.",
    12,
    "A normal database index sorts one column. \"Nearby\" is a question about two columns at once, latitude and longitude. That is why proximity search needs its own kind of index. The trick is always the same: turn two numbers into one key so that points near each other on the map are near each other in the index. This lesson covers geohash, quadtrees, where the index lives, and how to keep it fresh when the points are moving cars.",
    [
        (
            "Why It Matters",
            """Three of the most common design prompts are proximity problems: design Uber, design Yelp, design \"friends near me\". Each one has the same core query: given a point and a radius, return the things inside the circle, sorted by distance.

The interviewer checks three things. Do you know why a plain index does not work? Can you name a structure that does? Can you keep it updated when locations change every few seconds? The answer is short, so learn it well.""",
        ),
        (
            "Mental Model",
            """Cut the map into cells. Give each cell a name. Store the cell name next to each point.

Point → Cell name → Index on cell name → Nearby = same cell and the cells around it

A B-tree can search a range on one column. A cell name is one column. So once every point has a cell name, the old index works again.

> Memory cue: the index finds the rough area. A distance check finds the exact answer. Two stages, always.""",
        ),
        (
            "How It Works",
            """### Why latitude and longitude alone fail

\"Within 2 km\" means latitude between two values AND longitude between two values. An index on latitude gives a horizontal band across the whole world. The database scans that band, checking longitude row by row. A band across a city holds millions of points. A compound index on (lat, lng) does not help. It is sorted by latitude first, so it is still one band.

The fix is to stop treating the two numbers separately. Encode them into one value that keeps nearby points together.

:::viz geohash {"points": [2,3,5,12,7,7,8,5,9,8,10,6,11,9,12,4,13,13,14,1,3,9,6,2], "query": [9,6], "precision": 3, "radius": 3}

### Geohash

Geohash does this with a split-and-interleave rule.

Start with the whole world as one box. Cut it in half left and right. The left half gets bit 0, the right half gets bit 1. Now cut each half top and bottom. Add another bit. Keep going: longitude, latitude, longitude, latitude. Each cut adds one bit to every point's code.

Then group the bits into characters. A 6-character geohash is a cell about 1.2 km by 0.6 km. A 7-character one is about 150 m square. More characters, smaller cell.

The property that matters: **a shared prefix means a shared bigger cell**. If two points start with `9q8yy`, they are in the same 5-character cell. So \"everything inside this cell\" is a string prefix scan, `WHERE geohash LIKE '9q8yy%'`, and a B-tree index on the geohash column answers it directly.

### The edge problem and the 8 neighbours

Cells have hard borders. Two points can be 20 metres apart and sit on opposite sides of a border. Their geohashes differ in the last character, or even the first. A prefix scan on the query's own cell misses one of them.

The fix is simple. Compute the query point's cell, then compute the 8 cells that touch it. Search all 9. Nine prefix scans are still cheap.

Pick the precision so the cell is about the size of the search radius. For a 2 km radius, use a cell around 1 to 2 km wide. Then the 9 cells cover the circle without pulling in a whole region.

### Quadtree

A geohash grid uses the same cell size everywhere. That is a problem when density is uneven. A 1 km cell in Manhattan holds thousands of restaurants. A 1 km cell in the desert holds none.

A quadtree adapts. Start with one box for the whole map. If a box holds more than a limit, say 100 points, split it into four children. Keep splitting only the boxes that are still too full. Dense cities get many small boxes. Empty land stays one big box.

To search, walk down the tree to the leaf that holds the query point, then check the leaves around it. Because leaves are small where points are dense, a search reads about the same number of points anywhere on the map.

The cost is that a quadtree is a tree in memory, not a string in a column. It must be rebalanced as points move. Fine for restaurants. More care for moving cars.

### S2 and H3 in one paragraph

Google S2 and Uber H3 solve the same problem with better cell shapes. S2 projects the sphere onto a cube, so cells keep an even size near the poles. H3 uses hexagons, whose six neighbours all sit at the same distance. In an interview, name them as production choices and move on. The idea is the same as geohash: cells with ids at several levels.

### Storing it

Three common homes for the index.

- **A geohash column with a normal B-tree index.** Works in any SQL database. Simple and cheap. Good for slowly changing points like shops.
- **Redis GEO.** `GEOADD` stores points in a sorted set keyed by geohash. `GEOSEARCH` returns points within a radius, already filtered by distance. In memory, so fast. Good for moving objects.
- **PostGIS.** A Postgres extension with real geometry types and an R-tree style index. Exact distance, polygons, routes. Heavier, but right when the question is more than a radius search.

### Moving objects

Drivers send their location every 3 to 5 seconds. With 1 million active drivers that is around 250,000 writes per second. A disk index cannot take that. Most of the writes are also wasted: a driver's cell rarely changes between two pings.

The standard answer has three parts.

1. **Keep hot locations in memory.** The current position of every active driver lives in Redis or an in-process map, keyed by driver id, with the cell as the index.
2. **Update the cell only when it changes.** Same cell as the last ping: update the coordinates, skip the index work.
3. **Batch to disk.** Write location history to a log in batches, for trips, billing and analytics. The live index never touches it.

The live store holds only current positions. If it is lost, the next round of pings rebuilds it. That is why it can live in memory.

### The nearby query, end to end

Ask for \"drivers within 2 km of the rider\".

1. Encode the rider's position to a geohash at the chosen precision.
2. Compute the 8 neighbour cells.
3. Fetch every driver in those 9 cells from the live index. This is the candidate set.
4. Compute the exact distance from the rider to each candidate. Drop the ones outside 2 km.
5. Rank the rest: by distance, or by ETA, rating, or car type.
6. Return the top N.

Step 3 is the cheap, rough part. Step 4 is the exact part. Say both steps. Candidates in a searched cell but outside the circle are normal and expected.

### Sharding by region

A world-wide live index does not fit on one machine, and it does not need to. Nearby queries never cross an ocean. Shard the index by region: a coarse geohash prefix or a city id. A query touches one shard, or two when the rider stands near a border.

The catch is hot cities. Manhattan at 6 pm has more drivers than the whole of Montana. Equal-sized region shards mean one shard melts while others sit idle. Split hot regions into smaller shards, which is the quadtree idea one level up, and replicate a hot city's read path so many nodes can answer its queries.""",
        ),
        (
            "Example",
            """A rider in San Francisco opens the app. Her position encodes to geohash `9q8yyk`, a cell about 1.2 km wide.

The matching service asks the city's live-location shard for cell `9q8yyk` and its 8 neighbours. The shard returns 340 drivers in those 9 cells.

The service computes the distance to each of the 340. It keeps 120 within 2 km. It ranks them by ETA using the road graph, not straight-line distance, and returns the top 10.

A driver 30 metres away in cell `9q8yym` is found, because that cell is one of the 8 neighbours. Without the neighbour step he would be missed while a driver 1.5 km away in the home cell was shown.

Every 4 seconds, each of those 340 drivers sends a new ping. The live store updates their coordinates in memory. Only the few who crossed a cell border move between cells. The ping stream goes to a log for trip history. The disk never sees the nearby query.""",
        ),
        (
            "Trade-offs",
            """- **Geohash versus quadtree.** Geohash is a string in a column and works anywhere, but cells are the same size everywhere. A quadtree fits uneven density but must be held and rebalanced in memory.
- **Precision.** Smaller cells mean fewer false candidates but more cell moves and a bigger index. Match the cell to the typical search radius.
- **In-memory versus disk.** Memory takes the write rate of moving objects but can be lost. Acceptable, because the next pings rebuild it.
- **Straight-line versus road distance.** Straight-line is cheap and good for the filter. Real ETA needs a routing engine. Cheap to cut candidates, expensive to rank.
- **Redis GEO versus PostGIS.** Redis GEO is fast and simple but only does points and radius. PostGIS does polygons, routes and exact geometry at a higher cost.""",
        ),
        (
            "Common Mistakes",
            """- Proposing an index on (lat, lng) and not seeing that it still scans a band
- Searching only the query's own cell and missing points just across the border
- Writing every driver ping to a disk index
- Using one cell size for a city centre and open countryside without saying why it is fine or not
- Forgetting the exact-distance step, so the result includes points outside the radius
- Sharding by equal areas and being surprised by a hot city""",
        ),
        (
            "Interviewer Follow-ups",
            """- **\"Why not just index latitude and longitude?\"** — One index gives a band across the map. Nearby is two ranges at once, and a one-column index can only do one.
- **\"What if the rider is on a cell border?\"** — Search the cell plus its 8 neighbours. Pick the precision so the cell is about the radius.
- **\"How do you handle a million drivers updating every few seconds?\"** — Current positions in memory, cell updated only on a cell change, history batched to a log.
- **\"Manhattan is on fire, Montana is empty. Now what?\"** — Split hot regions into smaller shards, or use a quadtree so dense areas get small cells.
- **\"How do you rank the results?\"** — Cheap straight-line distance to filter, then ETA or business rules to rank the survivors.""",
        ),
        (
            "Interview Tip",
            """Say the two stages out loud: \"the cell index gives me a rough superset in one lookup, then I compute exact distance on the few hundred candidates\". Then add the neighbour step before you are asked. Those two sentences are most of the marks.""",
        ),
    ],
    [
        "Nearby is a range on two columns at once, so a normal one-column index only gives a band and still scans it.",
        "Geohash turns a point into a string where a shared prefix means a shared bigger cell, so a B-tree index works again.",
        "Always search the query cell plus its 8 neighbours, then filter candidates by exact distance and rank the survivors.",
        "Moving objects live in memory, update the cell only when it changes, and batch history to disk; shard by region and split hot cities.",
    ],
    [
        "Why can a compound index on (latitude, longitude) not answer 'within 2 km' efficiently?",
        "What does a shared geohash prefix tell you about two points?",
        "Why do you search 9 cells instead of 1, and how do you choose the precision?",
        "When would you pick a quadtree over a geohash grid?",
        "How do you keep the index correct when a million drivers send a location every 4 seconds?",
    ],
)

LESSON["display_order"] = 3
