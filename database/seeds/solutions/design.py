"""Written solutions for design problems."""

from __future__ import annotations

SOLUTIONS: list[dict] = [
    {
        "slugs": ["lc-146"],
        "pattern": "Design: LRU cache",
        "trigger": "a store of limited size where get and put must each take one step, and the key unused the longest is thrown out",
        "summary": "A line of guests plus a guest list. Just used goes to the front of the line, the back of the line leaves first, and the guest list finds any seat in one step.",
        "approaches": [
            {
                "name": "Linear list of entries",
                "is_optimal": False,
                "idea": "Store entries in a list and do a linear search on each get or put operation.",
                "steps": [
                    "Keep a list of key-value pairs representing the cache contents.",
                    "On get, scan the list from front to back to find the matching key.",
                    "If found, move that entry to the back of the list and return its value.",
                    "On put, scan to update an existing key, or drop the oldest entry at index 0 if full.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[] process(String[] operations, int[][] args) {
        LRUCache cache = null;
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "LRUCache" -> cache = new LRUCache(args[i][0]);
                case "put" -> cache.put(args[i][0], args[i][1]);
                case "get" -> out.add(cache.get(args[i][0]));
                default -> {}
            }
        }
        int[] arr = new int[out.size()];
        for (int i = 0; i < out.size(); i++) {
            arr[i] = out.get(i);
        }
        return arr;
    }
}

class LRUCache {
    private static class Item {
        int key, val;
        Item(int k, int v) { key = k; val = v; }
    }
    private final int capacity;
    private final List<Item> list = new ArrayList<>();

    public LRUCache(int capacity) {
        this.capacity = capacity;
    }

    public int get(int key) {
        for (int i = 0; i < list.size(); i++) {
            Item item = list.get(i);
            if (item.key == key) {
                list.remove(i);
                list.add(item);
                return item.val;
            }
        }
        return -1;
    }

    public void put(int key, int value) {
        for (int i = 0; i < list.size(); i++) {
            Item item = list.get(i);
            if (item.key == key) {
                item.val = value;
                list.remove(i);
                list.add(item);
                return;
            }
        }
        if (list.size() >= capacity) {
            list.remove(0);
        }
        list.add(new Item(key, value));
    }
}""",
                "time_complexity": "O(capacity)",
                "time_why": "Every get and put scans the list of up to capacity elements.",
                "space_complexity": "O(capacity)",
                "space_why": "The list holds up to capacity entries.",
                "when_to_use": "Mention it first to show the simplest baseline before introducing the two-way list.",
            },
            {
                "name": "The VIP queue",
                "is_optimal": True,
                "idea": "Combine a hash map for constant time lookup with a two-way linked list for constant time node removal.",
                "steps": [
                    "Create a two-way linked node storing a key, a value, and links to its two neighbours.",
                    "Initialize head and tail dummy guard nodes linked directly to each other.",
                    "Keep a hash map that maps each key directly to its node in the list.",
                    "On get, find the node in the map, unhook it from the list, and push it to the front.",
                    "On put, update an existing node or add a new one, evicting the tail neighbour if over capacity.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[] process(String[] operations, int[][] args) {
        LRUCache cache = null;
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "LRUCache" -> cache = new LRUCache(args[i][0]);
                case "put" -> cache.put(args[i][0], args[i][1]);
                case "get" -> out.add(cache.get(args[i][0]));
                default -> {}
            }
        }
        int[] arr = new int[out.size()];
        for (int i = 0; i < out.size(); i++) {
            arr[i] = out.get(i);
        }
        return arr;
    }
}

class LRUCache {
    private static class Entry {
        int key;
        int value;
        Entry prev;
        Entry next;
        Entry(int key, int value) {
            this.key = key;
            this.value = value;
        }
    }

    private final int capacity;
    private final Map<Integer, Entry> index = new HashMap<>();
    private final Entry head = new Entry(0, 0);
    private final Entry tail = new Entry(0, 0);

    public LRUCache(int capacity) {
        this.capacity = capacity;
        head.next = tail;
        tail.prev = head;
    }

    public int get(int key) {
        Entry entry = index.get(key);
        if (entry == null) {
            return -1;
        }
        unlink(entry);
        pushFront(entry);
        return entry.value;
    }

    public void put(int key, int value) {
        Entry entry = index.get(key);
        if (entry != null) {
            entry.value = value;
            unlink(entry);
            pushFront(entry);
            return;
        }
        if (index.size() == capacity) {
            Entry evicted = tail.prev;
            unlink(evicted);
            index.remove(evicted.key);
        }
        Entry fresh = new Entry(key, value);
        index.put(key, fresh);
        pushFront(fresh);
    }

    private void unlink(Entry entry) {
        entry.prev.next = entry.next;
        entry.next.prev = entry.prev;
    }

    private void pushFront(Entry entry) {
        entry.next = head.next;
        entry.prev = head;
        head.next.prev = entry;
        head.next = entry;
    }
}""",
                "time_complexity": "O(1)",
                "time_why": "The hash map finds nodes in constant time and two-way pointers allow constant time removal.",
                "space_complexity": "O(capacity)",
                "space_why": "The map and linked nodes store up to capacity items.",
                "when_to_use": "The optimal interview design combining a hash map and a two-way list.",
            },
        ],
        "walkthrough": {
            "input": 'capacity = 2, put(1, 1), put(2, 2), get(1), put(3, 3), get(2)',
            "result": "Key 2 was evicted because key 1 was refreshed by get(1).",
            "columns": ["op", "action", "map keys", "list order (head to tail)", "output"],
            "rows": [
                ["put(1, 1)", "insert 1 at front", "{1}", "head <-> [1] <-> tail", "-"],
                ["put(2, 2)", "insert 2 at front", "{1, 2}", "head <-> [2] <-> [1] <-> tail", "-"],
                ["get(1)", "find node 1, unhook and push to front", "{1, 2}", "head <-> [1] <-> [2] <-> tail", "1"],
                ["put(3, 3)", "cache is full, unhook tail node 2, insert 3", "{1, 3}", "head <-> [3] <-> [1] <-> tail", "-"],
                ["get(2)", "key 2 was evicted", "{1, 3}", "head <-> [3] <-> [1] <-> tail", "-1"],
            ],
        },
        "mistakes": [
            {
                "name": "The One-Way Trap",
                "wrong": "Using a singly linked list where nodes only point forward.",
                "right": "With links in one direction only, a guest cannot unhook itself: finding the neighbour in front means walking from the head, O(n). Keep prev and next, plus head and tail guards.",
            },
            {
                "name": "Forgetting to remove evicted key from map",
                "wrong": "Unlinking the node from the list without deleting its key from the hash map.",
                "right": "Always remove the evicted node's key from the map so future lookups do not return stale nodes.",
            },
            {
                "name": "Missing the access refresh on put",
                "wrong": "Only updating the value on put without moving the existing node to the front.",
                "right": "An update counts as a use, so unhook the node and push it to the front of the list.",
            },
        ],
        "edge_cases": [
            {
                "input": "LRUCache with capacity 1",
                "expected": "Each new put evicts the preceding item immediately",
                "why": "A capacity of 1 tests head and tail boundary handling during single-element replacement.",
            },
            {
                "input": "get on non-existent key",
                "expected": "-1",
                "why": "Missing keys must return -1 without modifying node order.",
            },
            {
                "input": "put with existing key",
                "expected": "Updates value and moves to front without increasing size",
                "why": "Updating existing keys should not trigger cache eviction.",
            },
            {
                "input": "capacity = 2, put(1, 1), put(2, 2), get(1), put(3, 3), get(2)",
                "expected": "[1, -1]",
                "why": "Key 2 is evicted because key 1 was refreshed by get.",
            },
            {
                "input": "capacity = 2, put(2, 1), put(1, 1), put(2, 3), put(4, 1), get(1), get(2)",
                "expected": "[-1, 3]",
                "why": "Key 1 is evicted because key 2 was refreshed by the second put.",
            },
        ],
        "interview_script": [
            "I need to build a cache that supports get and put in constant time while evicting the least recently used key.",
            "The obvious way is a list of entries, but scanning it takes O(capacity) time per operation.",
            "The key point: we need two-way links to unhook a node in one step, plus a map for instant lookups.",
            "So I pair a hash map with a doubly linked list, giving O(1) time and O(capacity) space.",
            "I will test capacity one, updating an existing key, and verifying that get refreshes a key's priority.",
        ],
        "follow_ups": [
            {
                "question": "How would you make this data structure thread-safe for concurrent access?",
                "answer": "Use a ReentrantReadWriteLock or synchronize get and put operations.",
            },
            {
                "question": "What if cache items expire after a specific time-to-live?",
                "answer": "Store an expiration timestamp on each node and evict expired nodes during get or a background timer.",
            },
            {
                "question": "Why do we use dummy head and tail nodes?",
                "answer": "Guard nodes eliminate special-case checks for empty lists and head or tail modifications.",
            },
        ],
        "related_slugs": ["lc-380", "lc-706", "lc-895"],
    },
    {
        "slugs": ["lc-355"],
        "pattern": "Heap / Hash map",
        "trigger": "social feed design with posting, following, and top-10 recent news feed",
        "summary": (
            "Store tweets per user and track who follows whom with sets. "
            "To build the feed, gather the most recent tweets from the user and their followed accounts, "
            "merging them with a max-heap to grab the top ten."
        ),
        "approaches": [
            {
                "name": "Collect all tweets and sort",
                "is_optimal": False,
                "idea": "Gather all tweets posted by followed users into a list and sort by timestamp to extract the top ten.",
                "steps": [
                    "Store each user's tweets in a map and followed users in another map.",
                    "On postTweet, append a new timestamped tweet entry to the user's list.",
                    "On getNewsFeed, gather all tweets from the author and everyone they follow.",
                    "Sort the collected tweet list in descending order by timestamp.",
                    "Return the first ten tweet IDs from the sorted list.",
                ],
                "code": """import java.util.*;

class Solution {
    public String[] process(String[] operations, int[][] args) {
        Twitter twitter = new Twitter();
        List<String> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "postTweet" -> twitter.postTweet(args[i][0], args[i][1]);
                case "getNewsFeed" -> out.add(Helpers.format(twitter.getNewsFeed(args[i][0])));
                case "follow" -> twitter.follow(args[i][0], args[i][1]);
                case "unfollow" -> twitter.unfollow(args[i][0], args[i][1]);
                default -> {}
            }
        }
        return out.toArray(new String[0]);
    }
}

class Twitter {
    private int clock = 0;
    private final Map<Integer, List<int[]>> tweets = new HashMap<>();
    private final Map<Integer, Set<Integer>> following = new HashMap<>();

    public Twitter() {}

    public void postTweet(int userId, int tweetId) {
        tweets.computeIfAbsent(userId, id -> new ArrayList<>()).add(new int[]{clock++, tweetId});
    }

    public List<Integer> getNewsFeed(int userId) {
        List<int[]> all = new ArrayList<>();
        Set<Integer> sources = new HashSet<>(following.getOrDefault(userId, Set.of()));
        sources.add(userId);
        for (int source : sources) {
            List<int[]> posts = tweets.get(source);
            if (posts != null) {
                all.addAll(posts);
            }
        }
        all.sort((a, b) -> b[0] - a[0]);
        List<Integer> feed = new ArrayList<>();
        for (int i = 0; i < Math.min(10, all.size()); i++) {
            feed.add(all.get(i)[1]);
        }
        return feed;
    }

    public void follow(int followerId, int followeeId) {
        if (followerId == followeeId) {
            return;
        }
        following.computeIfAbsent(followerId, id -> new HashSet<>()).add(followeeId);
    }

    public void unfollow(int followerId, int followeeId) {
        Set<Integer> set = following.get(followerId);
        if (set != null) {
            set.remove(followeeId);
        }
    }
}""",
                "time_complexity": "O(T log T)",
                "time_why": "Collecting all T followed tweets and sorting them takes O(T log T) time.",
                "space_complexity": "O(T + U)",
                "space_why": "We store all T tweets and follow relationships for U users in hash maps.",
                "when_to_use": "Mention it first as the direct list-and-sort baseline before optimizing with a heap.",
            },
            {
                "name": "Max-heap multi-stream merge",
                "is_optimal": True,
                "idea": "Merge the latest ten tweets of each followed user using a priority queue ordered by timestamp.",
                "steps": [
                    "Maintain a global integer counter as a logical clock for timestamps.",
                    "Store tweets per user in an ArrayList, naturally ordered by timestamp.",
                    "On getNewsFeed, inspect the user and all followed users.",
                    "For each author, insert only their latest ten tweets into a max-heap.",
                    "Poll up to ten elements from the heap into the feed result list.",
                ],
                "code": """import java.util.*;

class Solution {
    public String[] process(String[] operations, int[][] args) {
        Twitter twitter = new Twitter();
        List<String> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "postTweet" -> twitter.postTweet(args[i][0], args[i][1]);
                case "getNewsFeed" -> out.add(Helpers.format(twitter.getNewsFeed(args[i][0])));
                case "follow" -> twitter.follow(args[i][0], args[i][1]);
                case "unfollow" -> twitter.unfollow(args[i][0], args[i][1]);
                default -> {}
            }
        }
        return out.toArray(new String[0]);
    }
}

class Twitter {
    private int clock = 0;
    private final Map<Integer, List<int[]>> tweets = new HashMap<>();
    private final Map<Integer, Set<Integer>> following = new HashMap<>();

    public Twitter() {}

    public void postTweet(int userId, int tweetId) {
        tweets.computeIfAbsent(userId, id -> new ArrayList<>()).add(new int[]{clock++, tweetId});
    }

    public List<Integer> getNewsFeed(int userId) {
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> b[0] - a[0]);
        Set<Integer> sources = new HashSet<>(following.getOrDefault(userId, Set.of()));
        sources.add(userId);
        for (int source : sources) {
            List<int[]> posts = tweets.get(source);
            if (posts == null) {
                continue;
            }
            for (int i = posts.size() - 1; i >= 0 && i >= posts.size() - 10; i--) {
                heap.add(posts.get(i));
            }
        }
        List<Integer> feed = new ArrayList<>();
        while (!heap.isEmpty() && feed.size() < 10) {
            feed.add(heap.poll()[1]);
        }
        return feed;
    }

    public void follow(int followerId, int followeeId) {
        if (followerId == followeeId) {
            return;
        }
        following.computeIfAbsent(followerId, id -> new HashSet<>()).add(followeeId);
    }

    public void unfollow(int followerId, int followeeId) {
        Set<Integer> set = following.get(followerId);
        if (set != null) {
            set.remove(followeeId);
        }
    }
}""",
                "time_complexity": "O(F log(10 × F))",
                "time_why": "We push at most ten tweets per followed user F into the heap and extract the top ten.",
                "space_complexity": "O(T + U)",
                "space_why": "We store T total tweets and follow relationship sets for U users.",
                "when_to_use": "The optimal interview approach bounding heap size by the requested feed count.",
            },
        ],
        "walkthrough": {
            "input": 'User 1 posts tweet 5, follows 2, user 2 posts tweet 6, getNewsFeed(1)',
            "result": "The news feed returns tweet 6 followed by tweet 5 in reverse chronological order.",
            "columns": ["step", "action", "sources for user 1", "heap contents", "feed output"],
            "rows": [
                ["1", "postTweet(1, 5)", "{1}", "[5 (t=0)]", "-"],
                ["2", "follow(1, 2)", "{1, 2}", "-", "-"],
                ["3", "postTweet(2, 6)", "{1, 2}", "[6 (t=1)]", "-"],
                ["4", "getNewsFeed(1)", "{1, 2}", "[6 (t=1), 5 (t=0)]", "[6, 5]"],
            ],
        },
        "mistakes": [
            {
                "name": "Excluding the user's own tweets from their feed",
                "wrong": "Only fetching tweets from followed users leaves out the user's own published tweets.",
                "right": "Always include userId in the list of tweet sources alongside followed users.",
            },
            {
                "name": "Allowing self-following or duplicate follows",
                "wrong": "Following oneself or adding duplicates bloats follow collections and feeds.",
                "right": "Use a Set for following, and ignore requests where followerId equals followeeId.",
            },
            {
                "name": "Pushing all historical tweets into the heap",
                "wrong": "Pushing thousands of old tweets into the heap wastes memory and slows down extraction.",
                "right": "Only push the most recent 10 tweets from each followed user.",
            },
        ],
        "edge_cases": [
            {
                "input": "User with no tweets and no followings calls getNewsFeed",
                "expected": "[]",
                "why": "Empty history returns an empty list without errors.",
            },
            {
                "input": "User posts 15 tweets",
                "expected": "Only the 10 most recent tweets returned",
                "why": "News feed is strictly capped at the top 10 most recent posts.",
            },
            {
                "input": "Unfollowing a user not currently followed",
                "expected": "No exception thrown",
                "why": "Set remove handles non-existent elements cleanly.",
            },
            {
                "input": "User follows another user who has posted no tweets yet",
                "expected": "Returns only the user's own tweets",
                "why": "Followed users with null tweet lists are skipped safely.",
            },
        ],
        "interview_script": [
            "I need to design a news feed supporting posting, following, and retrieving the 10 most recent tweets.",
            "The obvious way I could try is collecting all followed tweets and sorting them in O(T log T) time.",
            "The key point I notice is that we only need 10 tweets, so each friend only needs to contribute their latest 10.",
            "So I merge streams using a max-heap, taking O(F log(10 × F)) time and O(T + U) space.",
            "I will test a user with no followings, a user with over 10 tweets, and unfollowing someone twice.",
        ],
        "follow_ups": [
            {
                "question": "How would you handle celebrity users with millions of followers?",
                "answer": "Use a push model for regular users and a pull model for celebrities to prevent write amplification.",
            },
            {
                "question": "How can news feeds be paginated beyond the first 10 tweets?",
                "answer": "Accept a cursor timestamp parameter and only select tweets strictly older than that cursor.",
            },
            {
                "question": "What if tweets need to support soft deletions?",
                "answer": "Add a deleted flag to tweet records and filter deleted tweets out during feed generation.",
            },
        ],
        "related_slugs": ["lc-23", "lc-295", "lc-362"],
    },
    {
        "slugs": ["lc-362"],
        "pattern": "Circular bucket counter",
        "trigger": "record hits at timestamps and count total hits in the past 300 seconds",
        "summary": (
            "Maintain a circular buffer of 300 buckets representing seconds modulo 300. "
            "Each hit increments the count for its second, resetting stale buckets. "
            "Querying hits sums all buckets whose timestamp is within the last 300 seconds."
        ),
        "approaches": [
            {
                "name": "Queue of timestamps sliding window",
                "is_optimal": False,
                "idea": "Store every hit timestamp in a queue and pop expired entries older than 300 seconds upon query.",
                "steps": [
                    "Initialize a FIFO queue to store integer timestamps of each hit.",
                    "On hit, push the timestamp into the back of the queue.",
                    "On getHits, while the queue is not empty and the front timestamp is expired, poll it.",
                    "Return the size of the queue as the total active hit count.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[] process(String[] operations, int[] values) {
        HitCounter counter = new HitCounter();
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "hit" -> counter.hit(values[i]);
                case "getHits" -> out.add(counter.getHits(values[i]));
                default -> {}
            }
        }
        int[] arr = new int[out.size()];
        for (int i = 0; i < out.size(); i++) {
            arr[i] = out.get(i);
        }
        return arr;
    }
}

class HitCounter {
    private final Queue<Integer> queue = new ArrayDeque<>();

    public HitCounter() {}

    public void hit(int timestamp) {
        queue.add(timestamp);
    }

    public int getHits(int timestamp) {
        while (!queue.isEmpty() && timestamp - queue.peek() >= 300) {
            queue.poll();
        }
        return queue.size();
    }
}""",
                "time_complexity": "O(N)",
                "time_why": "Every hit is queued once and evicted at most once across queries.",
                "space_complexity": "O(N)",
                "space_why": "Memory scales with the total number of hits recorded in a 300-second window.",
                "when_to_use": "Mention it first as the simple queue baseline before introducing the fixed circular buffer.",
            },
            {
                "name": "Circular bucket array",
                "is_optimal": True,
                "idea": "Use two fixed 300-element arrays for seconds and counts, recycling buckets with modulo 300.",
                "steps": [
                    "Allocate two arrays of size 300 for seconds and counts.",
                    "On hit, compute the slot index as timestamp modulo 300.",
                    "If the stored second differs from the timestamp, overwrite it and reset the count to 1.",
                    "Otherwise, increment the count in that slot by 1.",
                    "On getHits, loop through all 300 slots and sum counts where elapsed time is under 300 seconds.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[] process(String[] operations, int[] values) {
        HitCounter counter = new HitCounter();
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "hit" -> counter.hit(values[i]);
                case "getHits" -> out.add(counter.getHits(values[i]));
                default -> {}
            }
        }
        int[] arr = new int[out.size()];
        for (int i = 0; i < out.size(); i++) {
            arr[i] = out.get(i);
        }
        return arr;
    }
}

class HitCounter {
    private final int[] seconds = new int[300];
    private final int[] counts = new int[300];

    public HitCounter() {}

    public void hit(int timestamp) {
        int slot = timestamp % 300;
        if (seconds[slot] != timestamp) {
            seconds[slot] = timestamp;
            counts[slot] = 1;
        } else {
            counts[slot]++;
        }
    }

    public int getHits(int timestamp) {
        int total = 0;
        for (int i = 0; i < 300; i++) {
            if (timestamp - seconds[i] < 300) {
                total += counts[i];
            }
        }
        return total;
    }
}""",
                "time_complexity": "O(1)",
                "time_why": "Hit updates a single bucket in constant time, and getHits loops over exactly 300 slots.",
                "space_complexity": "O(1)",
                "space_why": "Memory is strictly bounded by two 300-element integer arrays regardless of hit volume.",
                "when_to_use": "The optimal interview approach for fixed predictable memory under massive hit volume.",
            },
        ],
        "walkthrough": {
            "input": "hit(1), hit(2), hit(300), getHits(300), getHits(301)",
            "result": "The counter reports 3 hits at second 300 and 2 active hits at second 301.",
            "columns": ["step", "action", "bucket modified", "active seconds", "hits counted"],
            "rows": [
                ["1", "hit(1)", "slot 1: sec=1, cnt=1", "{1}", "1"],
                ["2", "hit(2)", "slot 2: sec=2, cnt=1", "{1, 2}", "2"],
                ["3", "hit(300)", "slot 0: sec=300, cnt=1", "{1, 2, 300}", "3"],
                ["4", "getHits(300)", "check all slots", "300 - 1 = 299 < 300", "3 hits"],
                ["5", "getHits(301)", "check all slots", "301 - 1 = 300 (expired)", "2 hits (2 and 300)"],
            ],
        },
        "mistakes": [
            {
                "name": "Failing to overwrite stale second values",
                "wrong": "Incrementing count without checking if seconds[slot] matches timestamp adds to numbers from 300 seconds ago.",
                "right": "Check if seconds[slot] == timestamp: if different, overwrite seconds[slot] and reset count to 1.",
            },
            {
                "name": "Strict equality on window boundary",
                "wrong": "Treating timestamp - seconds[i] <= 300 as valid keeps hits from exactly 300 seconds ago in the window.",
                "right": "Only include hits where timestamp - seconds[i] is strictly less than 300.",
            },
            {
                "name": "Unbounded memory from queue storage",
                "wrong": "Storing each hit event in a queue causes memory exhaustion when hit traffic spikes.",
                "right": "Aggregate hits into fixed second buckets to guarantee O(1) space.",
            },
        ],
        "edge_cases": [
            {
                "input": "Multiple hits at the exact same timestamp",
                "expected": "Counts aggregate in the same second slot",
                "why": "Repeated hits in the same second increment the slot counter.",
            },
            {
                "input": "getHits called after a gap of 500 seconds",
                "expected": "0",
                "why": "All past hits have expired past the 300-second window.",
            },
            {
                "input": "getHits called with no hits recorded",
                "expected": "0",
                "why": "An empty counter yields zero hits.",
            },
            {
                "input": "A hit arrives at the exact boundary of 300 seconds",
                "expected": "Correctly expired on next second",
                "why": "Hits at second 1 expire precisely when querying at second 301.",
            },
        ],
        "interview_script": [
            "I need to track events within a rolling 300-second window.",
            "The obvious way I could try is storing every hit in a queue, which takes O(N) time and O(N) space.",
            "The key point I notice is that seconds recycle modulo 300, so 300 buckets cover every second.",
            "So I use two fixed 300-slot arrays for seconds and counts, taking O(1) time and O(1) space.",
            "I will test multiple hits in one second, gaps over 300 seconds, and boundary expiry at 301 seconds.",
        ],
        "follow_ups": [
            {
                "question": "How would you handle concurrent writes in a multithreaded environment?",
                "answer": "Use an array of AtomicInteger counters or LongAdder cells with fine-grained bucket locking.",
            },
            {
                "question": "What if the time window is 24 hours instead of 300 seconds?",
                "answer": "86400 seconds is still small enough for an array; for months or years, minute or hour aggregations work best.",
            },
            {
                "question": "What if timestamps can arrive out of order?",
                "answer": "A binary search tree or balanced map of timestamps is required when events arrive with arbitrary delays.",
            },
        ],
        "related_slugs": ["lc-380", "lc-355", "lc-146"],
    },
    {
        "slugs": ["lc-380"],
        "pattern": "Array with map index",
        "trigger": "collection with insert, delete, and getRandom all running in average O(1) time",
        "summary": (
            "An array provides constant time random access by index, and a map stores each value's index. "
            "To delete in constant time without shifting elements, we swap the target element with the last element in the array and remove the tail."
        ),
        "approaches": [
            {
                "name": "List with linear search removal",
                "is_optimal": False,
                "idea": "Store elements in an ArrayList and remove elements by searching and shifting elements.",
                "steps": [
                    "Maintain a HashSet for fast membership checks.",
                    "Maintain an ArrayList for random indexing.",
                    "On insert, return false if the set contains the value; otherwise add to both set and list.",
                    "On remove, scan the list to find the value, remove it by shifting, and remove from the set.",
                    "On getRandom, pick an index with random.nextInt and return the element.",
                ],
                "code": """import java.util.*;

class Solution {
    public String[] process(String[] operations, int[] values) {
        RandomizedSet set = new RandomizedSet();
        List<String> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "insert" -> out.add(String.valueOf(set.insert(values[i])));
                case "remove" -> out.add(String.valueOf(set.remove(values[i])));
                case "getRandom" -> out.add(String.valueOf(set.getRandom()));
                default -> {}
            }
        }
        return out.toArray(new String[0]);
    }
}

class RandomizedSet {
    private final Set<Integer> set = new HashSet<>();
    private final List<Integer> list = new ArrayList<>();
    private final Random random = new Random();

    public RandomizedSet() {}

    public boolean insert(int val) {
        if (!set.add(val)) {
            return false;
        }
        list.add(val);
        return true;
    }

    public boolean remove(int val) {
        if (!set.remove(val)) {
            return false;
        }
        list.remove(Integer.valueOf(val));
        return true;
    }

    public int getRandom() {
        return list.get(random.nextInt(list.size()));
    }
}""",
                "time_complexity": "O(n)",
                "time_why": "Removing an element from an arbitrary position in an ArrayList takes O(n) shifting time.",
                "space_complexity": "O(n)",
                "space_why": "The set and list store all n unique values.",
                "when_to_use": "Mention it first as the baseline before introducing the swap-with-last optimization.",
            },
            {
                "name": "Swap with last element array removal",
                "is_optimal": True,
                "idea": "Track array indices in a hash map; delete an element in constant time by swapping it with the last element.",
                "steps": [
                    "Maintain an ArrayList of values and a HashMap mapping each value to its list index.",
                    "On insert, return false if present; otherwise add to the end of the list and store the index in the map.",
                    "On remove, return false if missing; otherwise retrieve the element's index.",
                    "Overwrite that index with the last element from the list, update the map, and remove the last element.",
                    "On getRandom, return a random element using random.nextInt with the list size.",
                ],
                "code": """import java.util.*;

class Solution {
    public String[] process(String[] operations, int[] values) {
        RandomizedSet set = new RandomizedSet();
        List<String> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "insert" -> out.add(String.valueOf(set.insert(values[i])));
                case "remove" -> out.add(String.valueOf(set.remove(values[i])));
                case "getRandom" -> out.add(String.valueOf(set.getRandom()));
                default -> {}
            }
        }
        return out.toArray(new String[0]);
    }
}

class RandomizedSet {
    private final List<Integer> values = new ArrayList<>();
    private final Map<Integer, Integer> indexOf = new HashMap<>();
    private final Random random = new Random();

    public RandomizedSet() {}

    public boolean insert(int val) {
        if (indexOf.containsKey(val)) {
            return false;
        }
        indexOf.put(val, values.size());
        values.add(val);
        return true;
    }

    public boolean remove(int val) {
        Integer index = indexOf.remove(val);
        if (index == null) {
            return false;
        }
        int last = values.get(values.size() - 1);
        values.set(index, last);
        if (last != val) {
            indexOf.put(last, index);
        }
        values.remove(values.size() - 1);
        return true;
    }

    public int getRandom() {
        return values.get(random.nextInt(values.size()));
    }
}""",
                "time_complexity": "O(1)",
                "time_why": "Hash map operations and end-of-list removals run in constant average time.",
                "space_complexity": "O(n)",
                "space_why": "The dynamic array and index map store n elements.",
                "when_to_use": "The optimal interview approach combining uniform random sampling with constant-time removal.",
            },
        ],
        "walkthrough": {
            "input": "insert(1), remove(2), insert(2), getRandom(), remove(1), insert(2), getRandom()",
            "result": "The structure returns true, false, true, a random choice, true, false, and 2.",
            "columns": ["step", "action", "list values", "map indices", "returned"],
            "rows": [
                ["1", "insert(1)", "[1]", "{1: 0}", "true"],
                ["2", "remove(2)", "[1]", "{1: 0}", "false (not found)"],
                ["3", "insert(2)", "[1, 2]", "{1: 0, 2: 1}", "true"],
                ["4", "remove(1)", "[2]", "{2: 0}", "true (swap 2 into index 0, pop end)"],
                ["5", "getRandom()", "[2]", "{2: 0}", "2"],
            ],
        },
        "mistakes": [
            {
                "name": "Updating map index before removing target",
                "wrong": "When removing the last element itself, putting it back into the map resurrects the deleted key.",
                "right": "Check if `last != val` before updating indexOf with the moved element.",
            },
            {
                "name": "Calling list.remove(int val) instead of index",
                "wrong": "In Java, list.remove(val) interprets an integer as an index, throwing IndexOutOfBoundsException.",
                "right": "Remove by index explicitly: values.remove(values.size() - 1).",
            },
            {
                "name": "Leaving gaps in the array after deletion",
                "wrong": "Setting deleted slots to null produces gaps that make uniform random selection slow.",
                "right": "Swap the last element into the deleted slot to keep the array dense.",
            },
        ],
        "edge_cases": [
            {
                "input": "Remove the only element in the set",
                "expected": "true and list becomes empty",
                "why": "Swapping the last element with itself at index 0 and removing works cleanly.",
            },
            {
                "input": "Insert existing value",
                "expected": "false",
                "why": "Duplicate insertions must be rejected.",
            },
            {
                "input": "Remove non-existent value",
                "expected": "false",
                "why": "Removing missing elements returns false safely.",
            },
            {
                "input": "Insert, delete, and re-insert the exact same value",
                "expected": "All three operations succeed with correct return values",
                "why": "Re-insertion restores valid indexing in the map and array.",
            },
        ],
        "interview_script": [
            "I need insert, delete, and uniform random access all running in constant time.",
            "The obvious way I could try is using an ArrayList, but removing from the middle takes O(n) time.",
            "The key point I notice is that removing the last element of an array takes only constant time.",
            "So I swap the target item with the last item and update a map, giving O(1) time and O(n) space.",
            "I will test deleting the only item, removing missing elements, and re-inserting deleted values.",
        ],
        "follow_ups": [
            {
                "question": "How would you allow duplicate elements with getRandom proportional to frequency?",
                "answer": "Map each value to a set of indices in the array: Map<Integer, Set<Integer>>.",
            },
            {
                "question": "Is getRandom truly uniform?",
                "answer": "Yes, every index in the array from 0 to size - 1 has an equal 1/size probability of being chosen.",
            },
            {
                "question": "Can this data structure be used as a cache?",
                "answer": "No, it lacks recency ordering; combining it with a doubly linked list would allow LRU behavior.",
            },
        ],
        "related_slugs": ["lc-146", "lc-362", "lc-706"],
    },

    {
        "slugs": ["lc-535"],
        "pattern": "Base62 encoding",
        "trigger": "shorten a long URL to a short key and decode it back",
        "summary": (
            "Assign an auto-incrementing integer ID to each new long URL and convert it to a Base62 string. "
            "A hash map stores the key to URL mapping, allowing instant retrieval upon decoding."
        ),
        "approaches": [
            {
                "name": "Linear list lookup",
                "is_optimal": False,
                "idea": "Store URLs in an ordered list and scan the entire list to find matching keys on decode.",
                "steps": [
                    "Maintain a list of key-value URL pairs.",
                    "On encode, create a short key and append the pair to the list.",
                    "On decode, scan each pair in the list until finding the matching key.",
                    "Return the original URL associated with that key.",
                ],
                "code": """import java.util.*;

class Solution {
    public String roundtrip(String url) {
        Codec codec = new Codec();
        return codec.decode(codec.encode(url));
    }
}

class Codec {
    private static class Pair {
        String key, url;
        Pair(String k, String u) { key = k; url = u; }
    }
    private final List<Pair> list = new ArrayList<>();
    private int id = 1;

    public String encode(String longUrl) {
        String key = "k" + (id++);
        list.add(new Pair(key, longUrl));
        return "http://tinyurl.com/" + key;
    }

    public String decode(String shortUrl) {
        String key = shortUrl.substring(shortUrl.lastIndexOf('/') + 1);
        for (Pair p : list) {
            if (p.key.equals(key)) {
                return p.url;
            }
        }
        return "";
    }
}""",
                "time_complexity": "O(N)",
                "time_why": "Decoding scans through up to N registered pairs in the list.",
                "space_complexity": "O(N)",
                "space_why": "The list stores all N registered URL entries.",
                "when_to_use": "Mention it first as the simple list baseline before indexing keys with a hash map.",
            },
            {
                "name": "Auto-incrementing counter with Base62 encoding",
                "is_optimal": True,
                "idea": "Convert an incremental integer ID into a Base62 string and store mappings in a hash map for constant time lookup.",
                "steps": [
                    "Maintain an auto-incrementing integer counter starting at 1.",
                    "Maintain a hash map mapping Base62 keys to their original long URLs.",
                    "On encode, convert the counter to Base62 by repeated modulo 62 division.",
                    "Store the mapping in the hash table and increment the counter.",
                    "On decode, isolate the key substring after the final slash and look up the long URL.",
                ],
                "code": """import java.util.*;

class Solution {
    public String roundtrip(String url) {
        Codec codec = new Codec();
        return codec.decode(codec.encode(url));
    }
}

class Codec {
    private static final String ALPHABET =
            "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private final Map<String, String> byKey = new HashMap<>();
    private int counter = 1;

    public String encode(String longUrl) {
        String key = toBase62(counter++);
        byKey.put(key, longUrl);
        return "http://tinyurl.com/" + key;
    }

    public String decode(String shortUrl) {
        return byKey.get(shortUrl.substring(shortUrl.lastIndexOf('/') + 1));
    }

    private String toBase62(int value) {
        StringBuilder sb = new StringBuilder();
        while (value > 0) {
            sb.append(ALPHABET.charAt(value % 62));
            value /= 62;
        }
        return sb.reverse().toString();
    }
}""",
                "time_complexity": "O(1)",
                "time_why": "Converting an integer to Base62 requires at most 7 divisions, and hash lookups take O(1) time.",
                "space_complexity": "O(N)",
                "space_why": "The hash map stores one string entry for each of the N registered URLs.",
                "when_to_use": "The optimal interview design for deterministic, collision-free short URLs with constant time lookup.",
            },
        ],
        "walkthrough": {
            "input": 'encode("https://leetcode.com/problems/design-tinyurl")',
            "result": "The service encodes the long URL into a short key and decodes it back to the original URL.",
            "columns": ["step", "counter", "Base62 conversion", "short URL generated", "decode check"],
            "rows": [
                ["1", "1", "1 % 62 -> '1'", '"http://tinyurl.com/1"', "Look up '1' -> returns original"],
                ["2", "61", "61 % 62 -> 'Z'", '"http://tinyurl.com/Z"', "Look up 'Z' -> returns original"],
                ["3", "62", "62 -> '10'", '"http://tinyurl.com/10"', "Look up '10' -> returns original"],
                ["4", "100", "100 -> '1C'", '"http://tinyurl.com/1C"', "Look up '1C' -> returns original"],
            ],
        },
        "mistakes": [
            {
                "name": "Hashing without collision handling",
                "wrong": "Using Java String.hashCode directly produces collisions where two different URLs overwrite each other.",
                "right": "Use an incremental counter or check existing keys to guarantee distinct short tokens for distinct URLs.",
            },
            {
                "name": "Hardcoded prefix parsing",
                "wrong": "Splitting by a fixed character offset fails if the protocol or domain prefix changes.",
                "right": "Extract the key dynamically using shortUrl.substring(shortUrl.lastIndexOf('/') + 1).",
            },
            {
                "name": "Re-encoding the same URL without checking existing records",
                "wrong": "Generating fresh keys for identical URLs consumes extra IDs and storage.",
                "right": "Optionally maintain a reverse map from long URL to key to return existing short URLs.",
            },
        ],
        "edge_cases": [
            {
                "input": "Very long URL with query parameters",
                "expected": "Shortened to compact token and decoded accurately",
                "why": "Base62 representation compresses large URLs regardless of original string length.",
            },
            {
                "input": "Encoding the same URL multiple times",
                "expected": "Returns valid decoding to the original URL",
                "why": "Each encoding maps reliably back to the original URL.",
            },
            {
                "input": "Special characters and slashes in path",
                "expected": "Decodes exactly matching the original string",
                "why": "The full original URL is stored intact in the map without lossy transformations.",
            },
            {
                "input": "Short URL ending with a single letter key",
                "expected": "Key extracted correctly after the final slash",
                "why": "The substring extraction handles single-character keys cleanly.",
            },
        ],
        "interview_script": [
            "I need to design a service that encodes long URLs into short keys and decodes them back.",
            "The obvious way I could try is appending pairs to a list, which takes O(N) time on decode.",
            "The key point I notice is that Base62 converts an incrementing integer into a short collision-free string.",
            "So I use a hash map with Base62 keys, achieving O(1) time and O(N) space.",
            "I will test long URLs with query parameters, duplicate encodings, and single-digit keys.",
        ],
        "follow_ups": [
            {
                "question": "How would you distribute this counter across multiple servers?",
                "answer": "Use a distributed ID generator like Snowflake or partition counter ranges across database nodes.",
            },
            {
                "question": "How do you prevent enumeration attacks on predictable URLs?",
                "answer": "Encrypt or shuffle the counter ID using a Feistel cipher before Base62 encoding.",
            },
            {
                "question": "How do you handle URL expiration?",
                "answer": "Attach a creation timestamp to each entry and delete or reject expired entries on decode.",
            },
        ],
        "related_slugs": ["lc-146", "lc-706", "lc-380"],
    },
    {
        "slugs": ["lc-706"],
        "pattern": "Separate chaining",
        "trigger": "design a hash map without using built-in hash table libraries",
        "summary": (
            "Allocate an array of bucket heads and map keys to buckets using modulo. "
            "Collisions within the same bucket are resolved with a linked list of key-value pairs."
        ),
        "approaches": [
            {
                "name": "Flat array direct indexing",
                "is_optimal": False,
                "idea": "Allocate a 1,000,001 element array initialized to -1 and access keys directly by index.",
                "steps": [
                    "Allocate an integer array table of size 1000001.",
                    "Fill every table position with -1 to indicate missing entries.",
                    "On put, write the value into the table at the given key.",
                    "On get, return the value stored at that key.",
                    "On remove, reset the entry at that key back to -1.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[] process(String[] operations, int[][] args) {
        MyHashMap map = new MyHashMap();
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "put" -> map.put(args[i][0], args[i][1]);
                case "get" -> out.add(map.get(args[i][0]));
                case "remove" -> map.remove(args[i][0]);
                default -> {}
            }
        }
        int[] arr = new int[out.size()];
        for (int i = 0; i < out.size(); i++) {
            arr[i] = out.get(i);
        }
        return arr;
    }
}

class MyHashMap {
    private final int[] table = new int[1000001];

    public MyHashMap() {
        Arrays.fill(table, -1);
    }

    public void put(int key, int value) {
        table[key] = value;
    }

    public int get(int key) {
        return table[key];
    }

    public void remove(int key) {
        table[key] = -1;
    }
}""",
                "time_complexity": "O(1)",
                "time_why": "Array index lookups, writes, and resets all execute in a single memory access.",
                "space_complexity": "O(M)",
                "space_why": "We pre-allocate space for 1,000,001 integers regardless of actual entries stored.",
                "when_to_use": "Mention it first as the large direct array baseline before using bucket chaining.",
            },
            {
                "name": "Modulo bucket array with linked list chaining",
                "is_optimal": True,
                "idea": "Map keys to buckets using a prime modulo and resolve hash collisions with linked lists.",
                "steps": [
                    "Choose a prime bucket count like 7919 to minimize modulo collision clustering.",
                    "Define a lightweight Entry node holding key, value, and a next reference.",
                    "On put, hash the key to a bucket index, scan the chain to update existing keys, or insert at the head.",
                    "On get, hash to bucket and scan the linked chain, returning the value if the key matches, else -1.",
                    "On remove, unlink the matching entry node from the bucket list.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[] process(String[] operations, int[][] args) {
        MyHashMap map = new MyHashMap();
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "put" -> map.put(args[i][0], args[i][1]);
                case "get" -> out.add(map.get(args[i][0]));
                case "remove" -> map.remove(args[i][0]);
                default -> {}
            }
        }
        int[] arr = new int[out.size()];
        for (int i = 0; i < out.size(); i++) {
            arr[i] = out.get(i);
        }
        return arr;
    }
}

class MyHashMap {
    private static class Entry {
        int key;
        int value;
        Entry next;
        Entry(int key, int value, Entry next) {
            this.key = key;
            this.value = value;
            this.next = next;
        }
    }

    private static final int BUCKETS = 7919;
    private final Entry[] table = new Entry[BUCKETS];

    public MyHashMap() {}

    public void put(int key, int value) {
        int index = key % BUCKETS;
        for (Entry entry = table[index]; entry != null; entry = entry.next) {
            if (entry.key == key) {
                entry.value = value;
                return;
            }
        }
        table[index] = new Entry(key, value, table[index]);
    }

    public int get(int key) {
        for (Entry entry = table[key % BUCKETS]; entry != null; entry = entry.next) {
            if (entry.key == key) {
                return entry.value;
            }
        }
        return -1;
    }

    public void remove(int key) {
        int index = key % BUCKETS;
        Entry prev = null;
        for (Entry entry = table[index]; entry != null; entry = entry.next) {
            if (entry.key == key) {
                if (prev == null) {
                    table[index] = entry.next;
                } else {
                    prev.next = entry.next;
                }
                return;
            }
            prev = entry;
        }
    }
}""",
                "time_complexity": "O(1)",
                "time_why": "With 7919 prime buckets, expected chain length is small, keeping searches O(1) on average.",
                "space_complexity": "O(N + B)",
                "space_why": "Memory is proportional to the number of stored entries N plus the bucket count B.",
                "when_to_use": "The optimal interview approach for realistic hash table design that handles arbitrary keys memory-efficiently.",
            },
        ],
        "walkthrough": {
            "input": 'put(1, 1), put(2, 2), get(1), get(3), put(2, 1), get(2), remove(2), get(2)',
            "result": "The hash map retrieves values 1 and -1, then updates key 2, and returns -1 after removing it.",
            "columns": ["step", "action", "bucket modified", "bucket chain state", "returned value"],
            "rows": [
                ["1", "put(1, 1)", "slot 1 % 7919", "(1:1) -> null", "-"],
                ["2", "put(2, 2)", "slot 2 % 7919", "(2:2) -> null", "-"],
                ["3", "get(1)", "slot 1", "Found entry 1", "1"],
                ["4", "get(3)", "slot 3", "Empty bucket", "-1"],
                ["5", "put(2, 1)", "slot 2", "Update existing key to (2:1)", "-"],
                ["6", "remove(2)", "slot 2", "Unlink entry (2:1)", "-"],
                ["7", "get(2)", "slot 2", "Bucket empty after removal", "-1"],
            ],
        },
        "mistakes": [
            {
                "name": "Adding duplicate keys during put",
                "wrong": "Inserting a new node without first scanning the bucket chain creates duplicate keys in the same bucket.",
                "right": "Scan the bucket chain first: if an entry with matching key exists, update its value and return.",
            },
            {
                "name": "Losing chain head during removal",
                "wrong": "Only handling the prev.next case misses unlinking when the matching node is the bucket head.",
                "right": "Check if prev is null: if so, update table[index] = entry.next directly.",
            },
            {
                "name": "Negative array index from key hashing",
                "wrong": "Applying modulo to negative keys without absolute value produces negative array indices.",
                "right": "Use Math.abs(key) % BUCKETS or ensure keys are non-negative before indexing.",
            },
        ],
        "edge_cases": [
            {
                "input": "get or remove on missing key",
                "expected": "get returns -1, remove does nothing safely",
                "why": "Operations on missing keys must complete without null pointer exceptions.",
            },
            {
                "input": "Multiple keys mapping to the same bucket",
                "expected": "Handled via linked list chain scan",
                "why": "Hash collisions are resolved by chaining entries along the bucket list.",
            },
            {
                "input": "Key 0 inserted and queried",
                "expected": "Mapped correctly to bucket 0",
                "why": "Key 0 is valid and hashes to index 0.",
            },
            {
                "input": "Updating the value for an existing key",
                "expected": "Overwrites old value without increasing chain length",
                "why": "In-place value update avoids duplicate nodes for the same key.",
            },
        ],
        "interview_script": [
            "I need to design a hash map supporting put, get, and remove without built-in libraries.",
            "The obvious way I could try is an array of size one million, which wastes O(M) space for sparse data.",
            "The key point I notice is using a prime bucket count with separate chaining to resolve collisions.",
            "So I use 7919 linked buckets, achieving O(1) average time and O(N + B) space.",
            "I will test putting key 0, colliding keys in the same bucket, and removing a non-existent key.",
        ],
        "follow_ups": [
            {
                "question": "How would you handle dynamic resizing when the load factor exceeds a threshold?",
                "answer": "Allocate a new array of double the size and rehash all entries when size divided by buckets exceeds 0.75.",
            },
            {
                "question": "What is an alternative collision resolution strategy?",
                "answer": "Open addressing with linear or quadratic probing, where colliding entries find the next empty bucket slot.",
            },
            {
                "question": "When does Java HashMap switch buckets from linked lists to red-black trees?",
                "answer": "When a single bucket chain length reaches 8 and total table capacity is at least 64.",
            },
        ],
        "related_slugs": ["lc-146", "lc-380", "lc-981"],
    },
    {
        "slugs": ["lc-895"],
        "pattern": "Frequency stack",
        "trigger": "stack that pops the most frequent element, breaking ties by recency",
        "summary": (
            "Track the count of each number in a frequency map, and maintain a stack for each frequency count. "
            "Pushing a number puts it into the stack for its new count. "
            "Popping pulls from the stack of the current maximum count."
        ),
        "approaches": [
            {
                "name": "Max-heap with timestamp priority queue",
                "is_optimal": False,
                "idea": "Push tuples of (frequency, sequence timestamp, value) into a max-heap to prioritize highest frequency and recency.",
                "steps": [
                    "Maintain a frequency map and a global sequence counter for timestamps.",
                    "On push, increment the frequency of val and record the timestamp.",
                    "Add an integer tuple with frequency, timestamp, and val to a max-heap.",
                    "On pop, extract the root element from the heap, decrement frequency in the map, and return val.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[] process(String[] operations, int[] values) {
        FreqStack stack = new FreqStack();
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "push" -> stack.push(values[i]);
                case "pop" -> out.add(stack.pop());
                default -> {}
            }
        }
        int[] arr = new int[out.size()];
        for (int i = 0; i < out.size(); i++) {
            arr[i] = out.get(i);
        }
        return arr;
    }
}

class FreqStack {
    private final Map<Integer, Integer> freq = new HashMap<>();
    private final PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> {
        if (a[0] != b[0]) {
            return b[0] - a[0];
        }
        return b[1] - a[1];
    });
    private int clock = 0;

    public FreqStack() {}

    public void push(int val) {
        int f = freq.merge(val, 1, Integer::sum);
        heap.add(new int[]{f, clock++, val});
    }

    public int pop() {
        int[] top = heap.poll();
        freq.merge(top[2], -1, Integer::sum);
        return top[2];
    }
}""",
                "time_complexity": "O(log n)",
                "time_why": "Priority queue insertions and deletions take logarithmic time proportional to total elements n.",
                "space_complexity": "O(n)",
                "space_why": "The heap and frequency map store an entry for each element in the stack.",
                "when_to_use": "Mention it first as the multi-attribute heap baseline before organizing by frequency buckets.",
            },
            {
                "name": "Map of frequency stacks with maxFrequency tracker",
                "is_optimal": True,
                "idea": "Group elements by their frequency into separate stacks, allowing constant time push and pop.",
                "steps": [
                    "Maintain a frequency map mapping each value to its current count.",
                    "Maintain a map of stacks where each count level maps to its own stack.",
                    "Track an integer maxFrequency indicating the current highest frequency in the structure.",
                    "On push, increment the value's frequency, update maxFrequency, and push val to that frequency's stack.",
                    "On pop, pop from the stack at maxFrequency, decrement the value's count, and decrease maxFrequency if empty.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[] process(String[] operations, int[] values) {
        FreqStack stack = new FreqStack();
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "push" -> stack.push(values[i]);
                case "pop" -> out.add(stack.pop());
                default -> {}
            }
        }
        int[] arr = new int[out.size()];
        for (int i = 0; i < out.size(); i++) {
            arr[i] = out.get(i);
        }
        return arr;
    }
}

class FreqStack {
    private final Map<Integer, Integer> frequency = new HashMap<>();
    private final Map<Integer, Deque<Integer>> byFrequency = new HashMap<>();
    private int maxFrequency = 0;

    public FreqStack() {}

    public void push(int val) {
        int freq = frequency.merge(val, 1, Integer::sum);
        maxFrequency = Math.max(maxFrequency, freq);
        byFrequency.computeIfAbsent(freq, f -> new ArrayDeque<>()).push(val);
    }

    public int pop() {
        Deque<Integer> top = byFrequency.get(maxFrequency);
        int value = top.pop();
        frequency.merge(value, -1, Integer::sum);
        if (top.isEmpty()) {
            maxFrequency--;
        }
        return value;
    }
}""",
                "time_complexity": "O(1)",
                "time_why": "Map updates, stack pushes, and stack pops all execute in constant time.",
                "space_complexity": "O(n)",
                "space_why": "The frequency map and tiered stacks store at most n total pushed elements.",
                "when_to_use": "The optimal interview approach achieving true constant time performance for both push and pop operations.",
            },
        ],
        "walkthrough": {
            "input": "push(5), push(7), push(5), push(7), push(4), push(5), pop(), pop(), pop(), pop()",
            "result": "The stack returns elements 5, 7, 5, and 4 in order of highest frequency and recency.",
            "columns": ["step", "action", "frequency map", "maxFrequency", "returned value"],
            "rows": [
                ["1", "push 5, 7, 5, 7, 4, 5", "{5:3, 7:2, 4:1}", "3", "-"],
                ["2", "pop()", "{5:2, 7:2, 4:1}", "2 (stack 3 empty)", "5 (only item at freq 3)"],
                ["3", "pop()", "{5:2, 7:1, 4:1}", "2", "7 (most recent at freq 2)"],
                ["4", "pop()", "{5:1, 7:1, 4:1}", "1 (stack 2 empty)", "5 (last at freq 2)"],
                ["5", "pop()", "{5:1, 7:1, 4:0}", "1", "4 (most recent at freq 1)"],
            ],
        },
        "mistakes": [
            {
                "name": "Moving elements between stacks on push",
                "wrong": "Removing an element from stack f - 1 when pushing to stack f destroys the recency history at lower frequencies.",
                "right": "Keep elements at all lower frequency stacks: an element with frequency 3 resides in stacks 1, 2, and 3.",
            },
            {
                "name": "Decrementing maxFrequency by more than 1",
                "wrong": "Searching across all frequencies when a stack empties adds unnecessary overhead.",
                "right": "Because each pop removes exactly one instance, maxFrequency decreases by at most 1.",
            },
            {
                "name": "Failing to clean up frequency map counts on pop",
                "wrong": "Leaving stale counts in the frequency map causes the next push of the same number to jump to the wrong stack.",
                "right": "Always decrement the frequency map count on every pop.",
            },
        ],
        "edge_cases": [
            {
                "input": "All elements have identical frequency 1",
                "expected": "Behaves exactly like a standard LIFO stack",
                "why": "With all frequencies equal to 1, ties are broken entirely by recency.",
            },
            {
                "input": "Same element pushed repeatedly",
                "expected": "Pops in reverse order decrementing frequency each time",
                "why": "The element occupies tiers 1 up to k.",
            },
            {
                "input": "Stack emptied completely",
                "expected": "maxFrequency drops to 0 cleanly",
                "why": "Popping the final item resets maxFrequency to 0.",
            },
            {
                "input": "Tie-breaking between two distinct elements with identical highest frequency",
                "expected": "Pops the more recently pushed element first",
                "why": "The LIFO order of the top frequency stack breaks ties correctly.",
            },
        ],
        "interview_script": [
            "I need to pop elements by highest frequency first, breaking ties by order of insertion.",
            "The obvious way I could try is using a max-heap with timestamps, taking O(log n) time per operation.",
            "The key point I notice is that an element with frequency 3 also has frequencies 1 and 2.",
            "So I group elements by frequency into separate stacks, taking O(1) time and O(n) space.",
            "I will test elements with equal frequency, a single element pushed many times, and emptying the stack.",
        ],
        "follow_ups": [
            {
                "question": "Can an element be in multiple frequency stacks simultaneously?",
                "answer": "Yes, an element with count 3 is present in stack 1, stack 2, and stack 3 simultaneously.",
            },
            {
                "question": "What if we also needed a top() peek operation?",
                "answer": "Return byFrequency.get(maxFrequency).peek() in constant time without modifying state.",
            },
            {
                "question": "How would you handle negative numbers as inputs?",
                "answer": "The hash map natively supports negative integer keys without special handling.",
            },
        ],
        "related_slugs": ["lc-146", "lc-380", "lc-355"],
    },
    {
        "slugs": ["lc-981"],
        "pattern": "Binary search on time",
        "trigger": "store key-value pairs with timestamps and retrieve value at timestamp or earlier",
        "summary": (
            "Each key maps to a list of timestamped values. "
            "Because timestamps strictly increase on set operations, the list stays sorted. "
            "On get, we binary search for the largest timestamp less than or equal to the query time."
        ),
        "approaches": [
            {
                "name": "Linear backward scan",
                "is_optimal": False,
                "idea": "Scan backward through the timestamp history list for the matching key until finding timestamp <= query.",
                "steps": [
                    "Store historical pairs of timestamp and value in a list per key.",
                    "On set, append the timestamp and value to the key list.",
                    "On get, fetch the history list for the key; return an empty string if missing.",
                    "Scan backward from the end of the list.",
                    "Return the value of the first entry with timestamp <= query timestamp.",
                    "If no entry qualifies, return an empty string.",
                ],
                "code": """import java.util.*;

class Solution {
    public String[] process(String[] operations, String[] keys, String[] values, int[] timestamps) {
        TimeMap store = new TimeMap();
        List<String> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "set" -> store.set(keys[i], values[i], timestamps[i]);
                case "get" -> out.add(store.get(keys[i], timestamps[i]));
                default -> {}
            }
        }
        return out.toArray(new String[0]);
    }
}

class TimeMap {
    private static class Record {
        int timestamp;
        String value;
        Record(int timestamp, String value) {
            this.timestamp = timestamp;
            this.value = value;
        }
    }

    private final Map<String, List<Record>> map = new HashMap<>();

    public TimeMap() {}

    public void set(String key, String value, int timestamp) {
        map.computeIfAbsent(key, k -> new ArrayList<>()).add(new Record(timestamp, value));
    }

    public String get(String key, int timestamp) {
        List<Record> list = map.get(key);
        if (list == null) {
            return "";
        }
        for (int i = list.size() - 1; i >= 0; i--) {
            if (list.get(i).timestamp <= timestamp) {
                return list.get(i).value;
            }
        }
        return "";
    }
}""",
                "time_complexity": "O(n)",
                "time_why": "Appending to the list takes O(1) time, while linear scanning scans up to n past timestamps.",
                "space_complexity": "O(n)",
                "space_why": "We store all n set operations in memory.",
                "when_to_use": "Mention it first as the simple backward scan baseline before applying binary search.",
            },
            {
                "name": "Binary search on sorted timestamps",
                "is_optimal": True,
                "idea": "Take advantage of strictly increasing timestamps by binary searching for the upper bound timestamp <= query.",
                "steps": [
                    "Maintain parallel lists of timestamps and string values for each key.",
                    "On set, append the timestamp and value to the corresponding key lists.",
                    "On get, retrieve the timestamp list; return an empty string if the key is absent.",
                    "Binary search the largest index where timestamp <= target using upper-bound style search.",
                    "If the found index is valid, return the corresponding value; otherwise return an empty string.",
                ],
                "code": """import java.util.*;

class Solution {
    public String[] process(String[] operations, String[] keys, String[] values, int[] timestamps) {
        TimeMap store = new TimeMap();
        List<String> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "set" -> store.set(keys[i], values[i], timestamps[i]);
                case "get" -> out.add(store.get(keys[i], timestamps[i]));
                default -> {}
            }
        }
        return out.toArray(new String[0]);
    }
}

class TimeMap {
    private final Map<String, List<int[]>> stamps = new HashMap<>();
    private final Map<String, List<String>> texts = new HashMap<>();

    public TimeMap() {}

    public void set(String key, String value, int timestamp) {
        stamps.computeIfAbsent(key, k -> new ArrayList<>()).add(new int[]{timestamp});
        texts.computeIfAbsent(key, k -> new ArrayList<>()).add(value);
    }

    public String get(String key, int timestamp) {
        List<int[]> history = stamps.get(key);
        if (history == null) {
            return "";
        }
        int low = 0;
        int high = history.size();
        while (low < high) {
            int mid = low + (high - low) / 2;
            if (history.get(mid)[0] <= timestamp) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }
        return low == 0 ? "" : texts.get(key).get(low - 1);
    }
}""",
                "time_complexity": "O(log n)",
                "time_why": "Appends take average O(1) time and binary search finds the right timestamp in O(log n) comparisons.",
                "space_complexity": "O(n)",
                "space_why": "The maps store all n timestamp and value records across all keys.",
                "when_to_use": "The optimal interview approach for point-in-time key-value retrieval with logarithmic query time.",
            },
        ],
        "walkthrough": {
            "input": 'set("foo","bar",1), get("foo",1), get("foo",3), set("foo","bar2",4), get("foo",4), get("foo",5)',
            "result": "The time store returns bar for early queries and bar2 after the timestamp 4 update.",
            "columns": ["step", "action", "timestamps for 'foo'", "binary search target", "returned value"],
            "rows": [
                ["1", "set(foo, bar, 1)", "[1]", "-", "-"],
                ["2", "get(foo, 1)", "[1]", "target 1", '"bar"'],
                ["3", "get(foo, 3)", "[1]", "target 3", '"bar" (timestamp 1 is <= 3)'],
                ["4", "set(foo, bar2, 4)", "[1, 4]", "-", "-"],
                ["5", "get(foo, 4)", "[1, 4]", "target 4", '"bar2"'],
                ["6", "get(foo, 5)", "[1, 4]", "target 5", '"bar2" (timestamp 4 is <= 5)'],
            ],
        },
        "mistakes": [
            {
                "name": "Returning exact match only",
                "wrong": "Returning empty string when target timestamp is not exact violates the 'earlier timestamp' requirement.",
                "right": "Find the largest timestamp that is less than or equal to the query timestamp: history.get(mid) <= target.",
            },
            {
                "name": "Using TreeMap for append-only workloads",
                "wrong": "Using TreeMap adds O(log n) insertion overhead on every set call when timestamps are already strictly increasing.",
                "right": "Use ArrayList with O(1) appends since timestamps arrive in strictly ascending chronological order.",
            },
            {
                "name": "Off-by-one error when target is smaller than all recorded timestamps",
                "wrong": "Accessing index low - 1 when low is 0 throws an ArrayIndexOutOfBoundsException.",
                "right": "Check if low == 0 first: if so, return empty string directly.",
            },
        ],
        "edge_cases": [
            {
                "input": "get called with timestamp earlier than all set timestamps",
                "expected": '""',
                "why": "No recorded value exists at or before the requested timestamp.",
            },
            {
                "input": "get called on a key that was never set",
                "expected": '""',
                "why": "Missing keys return an empty string.",
            },
            {
                "input": "Multiple queries at the exact timestamp of a set",
                "expected": "Returns the value recorded at that exact timestamp",
                "why": "Exact timestamp matches must be returned correctly.",
            },
            {
                "input": "Querying with a timestamp larger than all recorded timestamps",
                "expected": "Returns the value with the latest recorded timestamp",
                "why": "Binary search upper bound resolves to the final element in the list.",
            },
        ],
        "interview_script": [
            "I need to store values at specific timestamps and retrieve the latest value at or before a given timestamp.",
            "The obvious way I could try is scanning the list backwards, taking O(n) time for get.",
            "The key point I notice is that timestamps strictly increase, so the history list is always sorted.",
            "So I binary search the list to find the largest timestamp <= query, taking O(log n) time and O(n) space.",
            "I will test queries earlier than the first timestamp, exact matches, and timestamps past the latest record.",
        ],
        "follow_ups": [
            {
                "question": "What if timestamps can arrive out of chronological order?",
                "answer": "Replace ArrayList with TreeMap<Integer, String> to maintain sorted order on insertion.",
            },
            {
                "question": "How would you handle key deletion at a specific timestamp?",
                "answer": "Insert a tombstone value (such as null or empty string) at that timestamp.",
            },
            {
                "question": "How would you handle ranged queries between time t1 and t2?",
                "answer": "Perform two binary searches to find the range boundaries in the sorted timestamp list.",
            },
        ],
        "related_slugs": ["lc-146", "lc-362", "lc-706"],
    },

]
