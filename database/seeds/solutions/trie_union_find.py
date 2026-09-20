"""Written solutions for Trie and Union-Find problems."""

from __future__ import annotations

SOLUTIONS: list[dict] = [
    {
        "slugs": ["lc-208"],
        "pattern": "Trie",
        "trigger": "fast prefix lookups, exact word search, and auto-complete insertion",
        "summary": (
            "A Trie stores words as paths in a 26-way character tree where common prefixes share the same nodes. "
            "Step down child nodes character by character, marking the final node as terminal."
        ),
        "approaches": [
            {
                "name": "Scan a list of words",
                "is_optimal": False,
                "idea": "Store inserted words in a list and do a linear scan for exact matches or prefix matches.",
                "steps": [
                    "Maintain a list of strings representing all inserted words.",
                    "On insert, append the new word to the end of the list.",
                    "On search, check every word in the list for an exact string match.",
                    "On startsWith, check every word in the list to see if it starts with the given prefix.",
                    "Return true if any matching word is found, or false if the list ends.",
                ],
                "code": """import java.util.*;

class Solution {
    public String[] process(String[] operations, String[][] args) {
        Trie trie = new Trie();
        List<String> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "insert" -> trie.insert(args[i][0]);
                case "search" -> out.add(String.valueOf(trie.search(args[i][0])));
                case "startsWith" -> out.add(String.valueOf(trie.startsWith(args[i][0])));
                default -> {}
            }
        }
        return out.toArray(new String[0]);
    }
}

class Trie {
    private final List<String> words = new ArrayList<>();

    public Trie() {}

    public void insert(String word) {
        words.add(word);
    }

    public boolean search(String word) {
        for (String w : words) {
            if (w.equals(word)) return true;
        }
        return false;
    }

    public boolean startsWith(String prefix) {
        for (String w : words) {
            if (w.startsWith(prefix)) return true;
        }
        return false;
    }
}""",
                "time_complexity": "O(N · L)",
                "time_why": "Every search or prefix lookup scans up to N stored words of length L.",
                "space_complexity": "O(N · L)",
                "space_why": "The list stores all N inserted words.",
                "when_to_use": "Mention it first as the simple list baseline before introducing the tree structure.",
            },
            {
                "name": "Prefix tree with 26-way arrays",
                "is_optimal": True,
                "idea": "Use an array of size 26 on each node for direct child pointer indexing without hashing overhead.",
                "steps": [
                    "Create a node class with an array of 26 child references and a boolean terminal flag.",
                    "On insert, map each character to index c minus 'a', creating new nodes when a child is missing.",
                    "Mark the final node as terminal.",
                    "On search, walk the child pointers and return true only if the final node exists and is terminal.",
                    "On startsWith, walk the child pointers and return true if the prefix path exists.",
                ],
                "code": """import java.util.*;

class Solution {
    public String[] process(String[] operations, String[][] args) {
        Trie trie = new Trie();
        List<String> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "insert" -> trie.insert(args[i][0]);
                case "search" -> out.add(String.valueOf(trie.search(args[i][0])));
                case "startsWith" -> out.add(String.valueOf(trie.startsWith(args[i][0])));
                default -> {}
            }
        }
        return out.toArray(new String[0]);
    }
}

class Trie {
    private static class TrieNode {
        TrieNode[] children = new TrieNode[26];
        boolean terminal;
    }

    private final TrieNode root = new TrieNode();

    public Trie() {}

    public void insert(String word) {
        TrieNode node = root;
        for (char c : word.toCharArray()) {
            int index = c - 'a';
            if (node.children[index] == null) {
                node.children[index] = new TrieNode();
            }
            node = node.children[index];
        }
        node.terminal = true;
    }

    public boolean search(String word) {
        TrieNode node = walk(word);
        return node != null && node.terminal;
    }

    public boolean startsWith(String prefix) {
        return walk(prefix) != null;
    }

    private TrieNode walk(String text) {
        TrieNode node = root;
        for (char c : text.toCharArray()) {
            int index = c - 'a';
            if (node.children[index] == null) {
                return null;
            }
            node = node.children[index];
        }
        return node;
    }
}""",
                "time_complexity": "O(L)",
                "time_why": "Each character lookup takes direct array indexing in constant time across word length L.",
                "space_complexity": "O(N · L)",
                "space_why": "We allocate at most 26 references per node across all inserted characters.",
                "when_to_use": "The standard interview design for dictionary prefix queries.",
            },
        ],
        "walkthrough": {
            "input": 'insert("apple"), search("apple"), search("app"), startsWith("app"), insert("app"), search("app")',
            "result": 'The operations return ["true","false","true","true"].',
            "columns": ["step", "operation", "path followed", "terminal state", "output"],
            "rows": [
                ["1", 'insert("apple")', "a -> p -> p -> l -> e", "terminal at 'e'", "-"],
                ["2", 'search("apple")', "a -> p -> p -> l -> e", "terminal is true", "true"],
                ["3", 'search("app")', "a -> p -> p", "terminal is false", "false"],
                ["4", 'startsWith("app")', "a -> p -> p", "nodes exist", "true"],
                ["5", 'insert("app")', "a -> p -> p", "set terminal at 'p'", "-"],
                ["6", 'search("app")', "a -> p -> p", "terminal is true", "true"],
            ],
        },
        "mistakes": [
            {
                "name": "Confusing search with startsWith",
                "wrong": "Returning true in search just because the prefix nodes exist treats prefixes as complete words.",
                "right": "In search, verify both that the node exists and that its terminal flag is true.",
            },
            {
                "name": "Subtracting wrong base character",
                "wrong": "Forgetting c - 'a' produces array index out of bounds or negative indices.",
                "right": "Always map lowercase characters to 0 through 25 using c - 'a'.",
            },
            {
                "name": "Marking intermediate nodes as terminal",
                "wrong": "Setting terminal to true inside the character loop marks every prefix as a valid word.",
                "right": "Only set the terminal flag on the very last node after all characters have been processed.",
            },
        ],
        "edge_cases": [
            {
                "input": "Single-letter word insertion and query",
                "expected": "Works directly off root children array",
                "why": "A single letter forms a one-level path.",
            },
            {
                "input": "Searching for an uninserted prefix",
                "expected": "false",
                "why": "Missing nodes along the path abort early returning false.",
            },
            {
                "input": "Inserting a duplicate word multiple times",
                "expected": "Terminal flag stays true without creating extra nodes",
                "why": "Repeated insertions reuse existing nodes cleanly.",
            },
            {
                "input": "Querying startsWith on an empty dictionary",
                "expected": "false",
                "why": "Root has null child pointers for all characters.",
            },
        ],
        "interview_script": [
            "I need to build a data structure for efficient word insertions, full word searches, and prefix searches.",
            "The obvious way is a list of strings, which I can search in O(N · L) time per query.",
            "The key point: words with the same prefix can share nodes in a 26-way tree, turning queries into path walks.",
            "So I build a Trie with 26-way child arrays, taking O(L) time per query and O(N · L) space.",
            "I will test a single-letter word, searching for prefixes before and after inserting them, and duplicate words.",
        ],
        "follow_ups": [
            {
                "question": "How would you implement word deletion in a Trie?",
                "answer": "Unmark the terminal flag and prune empty child nodes from the bottom up.",
            },
            {
                "question": "What is a Radix Tree or Patricia Trie?",
                "answer": "A compressed Trie where chains of nodes with single children are merged into single multi-character edges.",
            },
            {
                "question": "How would you support arbitrary Unicode characters?",
                "answer": "Replace the fixed 26-element array with a hash map of characters to nodes.",
            },
        ],
        "related_slugs": ["lc-211", "lc-212", "lc-146"],
    },
    {
        "slugs": ["lc-211"],
        "pattern": "Trie",
        "trigger": "add words and search with dot '.' wildcards matching any character",
        "summary": (
            "Insert words into a standard prefix tree. For regular characters, follow the exact child pointer. "
            "When encountering a dot wildcard, branch recursively across all 26 children."
        ),
        "approaches": [
            {
                "name": "Word length bucket search",
                "is_optimal": False,
                "idea": "Store words in a map grouped by length, and compare character by character on search.",
                "steps": [
                    "Group inserted words in a map where the key is word length and value is a list of strings.",
                    "On addWord, append the word to the list matching its length.",
                    "On search, retrieve the list for the given word length; return false if empty.",
                    "Compare candidate words character by character, treating a dot as matching any letter.",
                    "Return true if any word matches completely, otherwise false.",
                ],
                "code": """import java.util.*;

class Solution {
    public String[] process(String[] operations, String[][] args) {
        WordDictionary dictionary = new WordDictionary();
        List<String> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "addWord" -> dictionary.addWord(args[i][0]);
                case "search" -> out.add(String.valueOf(dictionary.search(args[i][0])));
                default -> {}
            }
        }
        return out.toArray(new String[0]);
    }
}

class WordDictionary {
    private final Map<Integer, List<String>> byLength = new HashMap<>();

    public WordDictionary() {}

    public void addWord(String word) {
        byLength.computeIfAbsent(word.length(), k -> new ArrayList<>()).add(word);
    }

    public boolean search(String word) {
        List<String> candidates = byLength.get(word.length());
        if (candidates == null) {
            return false;
        }
        for (String candidate : candidates) {
            if (matches(candidate, word)) {
                return true;
            }
        }
        return false;
    }

    private boolean matches(String cand, String pattern) {
        for (int i = 0; i < cand.length(); i++) {
            char p = pattern.charAt(i);
            if (p != '.' && p != cand.charAt(i)) {
                return false;
            }
        }
        return true;
    }
}""",
                "time_complexity": "O(N · L)",
                "time_why": "Searching scans all N words of the matching length, checking up to L characters each.",
                "space_complexity": "O(N · L)",
                "space_why": "We store all N strings inside length bucket lists.",
                "when_to_use": "Mention it first as the simple grouped list approach before using a prefix tree.",
            },
            {
                "name": "Trie with wildcard branching",
                "is_optimal": True,
                "idea": "Store words in a 26-way prefix tree and branch across all children on dot wildcards.",
                "steps": [
                    "Build a Trie with 26 child references and a terminal flag on each node.",
                    "On addWord, step character by character and insert new nodes.",
                    "In the recursive search helper, if the character index reaches the word length, return the terminal flag.",
                    "If the character is a regular letter, follow the child pointer at index c minus 'a'.",
                    "If the character is a dot, check each non-null child branch recursively.",
                    "Return true if any child branch succeeds, otherwise return false.",
                ],
                "code": """import java.util.*;

class Solution {
    public String[] process(String[] operations, String[][] args) {
        WordDictionary dictionary = new WordDictionary();
        List<String> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "addWord" -> dictionary.addWord(args[i][0]);
                case "search" -> out.add(String.valueOf(dictionary.search(args[i][0])));
                default -> {}
            }
        }
        return out.toArray(new String[0]);
    }
}

class WordDictionary {
    private static class TrieNode {
        TrieNode[] children = new TrieNode[26];
        boolean terminal;
    }

    private final TrieNode root = new TrieNode();

    public WordDictionary() {}

    public void addWord(String word) {
        TrieNode node = root;
        for (char c : word.toCharArray()) {
            int index = c - 'a';
            if (node.children[index] == null) {
                node.children[index] = new TrieNode();
            }
            node = node.children[index];
        }
        node.terminal = true;
    }

    public boolean search(String word) {
        return match(word, 0, root);
    }

    private boolean match(String word, int index, TrieNode node) {
        if (node == null) {
            return false;
        }
        if (index == word.length()) {
            return node.terminal;
        }
        char c = word.charAt(index);
        if (c != '.') {
            return match(word, index + 1, node.children[c - 'a']);
        }
        for (TrieNode child : node.children) {
            if (child != null && match(word, index + 1, child)) {
                return true;
            }
        }
        return false;
    }
}""",
                "time_complexity": "O(L) regular, O(26^L) worst wildcard",
                "time_why": "Without wildcards, search takes O(L) steps; with wildcards, it branches across non-null children.",
                "space_complexity": "O(N · L)",
                "space_why": "The prefix tree stores common prefixes across all N words.",
                "when_to_use": "The optimal interview approach combining prefix tree structure with recursive wildcard exploration.",
            },
        ],
        "walkthrough": {
            "input": 'addWord("bad"), search("pad"), search(".ad"), search("b..")',
            "result": 'The queries return ["false", "true", "true"].',
            "columns": ["step", "query", "branch explored", "nodes matched", "returned value"],
            "rows": [
                ["1", 'search("pad")', "root.children['p'-'a']", "null", "false"],
                ["2", 'search("bad")', "b -> a -> d", "terminal is true", "true"],
                ["3", 'search(".ad")', "try 'b', 'd', 'm'", "'b' -> a -> d matches", "true"],
                ["4", 'search("b..")', "'b' -> try children", "'b' -> a -> d matches", "true"],
            ],
        },
        "mistakes": [
            {
                "name": "Checking null child branches without guard",
                "wrong": "Calling match on null children without checking if child is null causes unnecessary recursion.",
                "right": "Check if `child != null` before launching the recursive call.",
            },
            {
                "name": "Returning false on the first failed child",
                "wrong": "Writing return match(..., child) inside the loop aborts without testing remaining children.",
                "right": "If a child returns true, return true immediately; only return false after checking all children.",
            },
            {
                "name": "Treating root as terminal",
                "wrong": "Allowing an empty query to return true when no empty word was added.",
                "right": "Only mark the terminal flag on nodes at the end of inserted words, never the root.",
            },
        ],
        "edge_cases": [
            {
                "input": "search string consisting entirely of dots like '...'",
                "expected": "true if any 3-letter word exists",
                "why": "Multiple consecutive wildcards test all branch combinations at every depth.",
            },
            {
                "input": "search for a word with no matching length in the dictionary",
                "expected": "false",
                "why": "Depth limits naturally terminate when word length exceeds trie depth.",
            },
            {
                "input": "searching an exact word with no wildcards",
                "expected": "true if present, false otherwise",
                "why": "Standard Trie search behavior without wildcard branching.",
            },
            {
                "input": "search with wildcards on an empty dictionary",
                "expected": "false",
                "why": "Root node has null children, terminating immediately.",
            },
        ],
        "interview_script": [
            "I need to support adding words and searching with dot wildcards that match any letter.",
            "The obvious way is scanning words grouped by length, which I can do in O(N · L) time per search.",
            "The key point: a Trie allows exact character steps and only branches when encountering a dot wildcard.",
            "So I search down the Trie, branching on dots, taking O(L) time without wildcards and O(N · L) space.",
            "I will test consecutive wildcards, searching words of non-existent lengths, and exact matches.",
        ],
        "follow_ups": [
            {
                "question": "How does performance degrade with consecutive wildcard dots?",
                "answer": "Consecutive dots multiply the branching factor; storing subtree depth limits helps prune early.",
            },
            {
                "question": "Can we store subtree word lengths at each node?",
                "answer": "Yes, storing a bitset of word lengths in each node avoids exploring branches without matching lengths.",
            },
            {
                "question": "How would you handle a question mark wildcard matching zero or one characters?",
                "answer": "Add an extra recursive branch that skips the current pattern character without advancing the Trie node.",
            },
        ],
        "related_slugs": ["lc-208", "lc-212", "lc-79"],
    },
    {
        "slugs": ["lc-212"],
        "pattern": "Trie",
        "trigger": "find all words from a dictionary that can be formed by sequentially adjacent grid letters",
        "summary": (
            "Insert all dictionary words into a prefix tree. As we explore the grid in four directions, "
            "walk down the matching branch of the tree, pruning the search whenever a prefix is missing."
        ),
        "approaches": [
            {
                "name": "Sequential word search on grid",
                "is_optimal": False,
                "idea": "Run individual word search for every word in the dictionary independently across the board.",
                "steps": [
                    "For each word in the words array, scan the grid for the first letter.",
                    "Run depth-first search in four directions to match the remaining characters.",
                    "If the word is found, append it to the results list.",
                    "Repeat the search for all words in the input dictionary.",
                    "Return all discovered words.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<String> findWords(String[] board, String[] words) {
        char[][] grid = new char[board.length][];
        for (int r = 0; r < board.length; r++) {
            grid[r] = board[r].toCharArray();
        }
        List<String> out = new ArrayList<>();
        for (String word : words) {
            if (exist(grid, word)) {
                out.add(word);
            }
        }
        return out;
    }

    private boolean exist(char[][] grid, String word) {
        for (int r = 0; r < grid.length; r++) {
            for (int c = 0; c < grid[r].length; c++) {
                if (dfs(grid, r, c, word, 0)) {
                    return true;
                }
            }
        }
        return false;
    }

    private boolean dfs(char[][] grid, int r, int c, String word, int index) {
        if (index == word.length()) {
            return true;
        }
        if (r < 0 || r >= grid.length || c < 0 || c >= grid[r].length) {
            return false;
        }
        if (grid[r][c] != word.charAt(index)) {
            return false;
        }
        char original = grid[r][c];
        grid[r][c] = '#';
        boolean found = dfs(grid, r + 1, c, word, index + 1)
                || dfs(grid, r - 1, c, word, index + 1)
                || dfs(grid, r, c + 1, word, index + 1)
                || dfs(grid, r, c - 1, word, index + 1);
        grid[r][c] = original;
        return found;
    }
}""",
                "time_complexity": "O(W · m · n · 4^L)",
                "time_why": "We repeat the full grid search independently for each of the W words in the dictionary.",
                "space_complexity": "O(L)",
                "space_why": "The recursive call stack depth is bounded by the maximum word length L.",
                "when_to_use": "Mention it first as the simple word-by-word search before optimizing with a Trie.",
            },
            {
                "name": "Trie-guided simultaneous grid exploration",
                "is_optimal": True,
                "idea": "Load all words into a Trie, and search the grid while walking down matching Trie branches.",
                "steps": [
                    "Insert all dictionary words into a Trie, storing the complete word string at each terminal node.",
                    "Convert the board into a 2D character array for in-place cell masking.",
                    "Launch the recursive search from every cell in the grid starting from the Trie root.",
                    "At each step, check if the child branch exists in the Trie, and abort if it is null.",
                    "If the child holds a word, add it to the output and set word to null to prevent duplicates.",
                    "Mask the cell with '#', explore the four neighbours, and restore the original character.",
                ],
                "code": """import java.util.*;

class Solution {
    private static class TrieNode {
        TrieNode[] children = new TrieNode[26];
        String word;
    }

    public List<String> findWords(String[] board, String[] words) {
        TrieNode root = new TrieNode();
        for (String word : words) {
            TrieNode node = root;
            for (char c : word.toCharArray()) {
                int index = c - 'a';
                if (node.children[index] == null) {
                    node.children[index] = new TrieNode();
                }
                node = node.children[index];
            }
            node.word = word;
        }

        char[][] grid = new char[board.length][];
        for (int r = 0; r < board.length; r++) {
            grid[r] = board[r].toCharArray();
        }

        List<String> out = new ArrayList<>();
        for (int r = 0; r < grid.length; r++) {
            for (int c = 0; c < grid[r].length; c++) {
                walk(grid, r, c, root, out);
            }
        }
        return out;
    }

    private void walk(char[][] grid, int r, int c, TrieNode node, List<String> out) {
        if (r < 0 || r >= grid.length || c < 0 || c >= grid[r].length) {
            return;
        }
        char letter = grid[r][c];
        if (letter == '#') {
            return;
        }
        TrieNode next = node.children[letter - 'a'];
        if (next == null) {
            return;
        }
        if (next.word != null) {
            out.add(next.word);
            next.word = null;
        }
        grid[r][c] = '#';
        walk(grid, r + 1, c, next, out);
        walk(grid, r - 1, c, next, out);
        walk(grid, r, c + 1, next, out);
        walk(grid, r, c - 1, next, out);
        grid[r][c] = letter;
    }
}""",
                "time_complexity": "O(m · n · 4^L)",
                "time_why": "We explore the grid once, pruning branches immediately whenever a prefix is absent from the Trie.",
                "space_complexity": "O(N · L)",
                "space_why": "The Trie stores all N words with up to L characters each, plus O(L) recursion depth.",
                "when_to_use": "The optimal interview approach for finding thousands of words simultaneously on a board.",
            },
        ],
        "walkthrough": {
            "input": 'board = ["oaan","etae","ihkr","iflv"], words = ["oath","pea","eat","rain"]',
            "result": 'The words found are ["oath", "eat"].',
            "columns": ["cell", "character", "Trie match", "action taken", "words discovered"],
            "rows": [
                ["(0, 0)", "'o'", "root -> 'o'", "explore neighbours of 'o'", "[]"],
                ["(0, 1)", "'a'", "'o' -> 'a'", "explore neighbours of 'a'", "[]"],
                ["(1, 1)", "'t'", "'o' -> 'a' -> 't'", "explore neighbours of 't'", "[]"],
                ["(2, 1)", "'h'", "'o' -> 'a' -> 't' -> 'h'", "terminal found: 'oath'", "['oath']"],
                ["(1, 0)", "'e'", "root -> 'e' -> 'a' -> 't'", "terminal found: 'eat'", "['oath', 'eat']"],
            ],
        },
        "mistakes": [
            {
                "name": "Duplicate words in output list",
                "wrong": "Finding the same word from two different paths adds duplicate entries to the output.",
                "right": "Set `next.word = null` immediately after adding it to the output list.",
            },
            {
                "name": "Searching each word individually",
                "wrong": "Running a separate grid search for each word multiplies run time by the total number of words.",
                "right": "Search all words simultaneously by guiding a single grid search with a Trie.",
            },
            {
                "name": "Forgetting to unmask visited cells",
                "wrong": "Leaving cells marked with '#' after returning from the recursive call prevents other paths from using them.",
                "right": "Always restore `grid[r][c] = letter` after all four neighbour branches have returned.",
            },
        ],
        "edge_cases": [
            {
                "input": "words containing common prefixes like 'app' and 'apple'",
                "expected": "Both words matched correctly without early termination",
                "why": "Setting node.word to null for 'app' does not prune child branches for 'apple'.",
            },
            {
                "input": "board where no word can be formed",
                "expected": "[]",
                "why": "Immediate prefix mismatch terminates all search branches at depth 1.",
            },
            {
                "input": "word longer than total cells in grid",
                "expected": "Cannot be formed, omitted from results",
                "why": "Cell masking ensures paths never exceed grid dimensions.",
            },
            {
                "input": "a single-cell board with a matching single-letter word",
                "expected": "['a']",
                "why": "Validates minimal board boundary handling.",
            },
        ],
        "interview_script": [
            "I need to find all dictionary words that can be formed by sequentially adjacent letters on the board.",
            "The obvious way is running Word Search for each word individually, taking O(W · m · n · 4^L) time.",
            "The key point: by loading all words into a Trie, I can search for all words in a single grid exploration.",
            "So I guide the search with the Trie, pruning dead branches, taking O(m · n · 4^L) time and O(N · L) space.",
            "I will test words sharing prefixes like app and apple, an empty result, and single-letter words.",
        ],
        "follow_ups": [
            {
                "question": "How can you optimize node pruning when a leaf word is matched?",
                "answer": "Prune matched leaf nodes from the Trie from the bottom up so they are never visited again.",
            },
            {
                "question": "What if the board is very large like 1000 by 1000?",
                "answer": "Index character locations on the board and only launch searches from cells matching root letters.",
            },
            {
                "question": "Can we use a visited boolean array instead of mutating the board?",
                "answer": "Yes, a 2D boolean array avoids mutating input data at the cost of slight allocation overhead.",
            },
        ],
        "related_slugs": ["lc-79", "lc-208", "lc-211"],
    },
    {
        "slugs": ["lc-323"],
        "pattern": "Union find",
        "trigger": "find the number of connected components in an undirected graph given edges",
        "summary": (
            "Initialize n separate components where each node is its own parent. "
            "For each edge, find the roots of both endpoints. If the roots differ, union them and decrement the counter."
        ),
        "approaches": [
            {
                "name": "Depth-first search with visited array",
                "is_optimal": False,
                "idea": "Build an adjacency list and count connected components by launching depth-first search from unvisited nodes.",
                "steps": [
                    "Construct an adjacency list representation of the graph.",
                    "Maintain a boolean seen array of size n and a components counter starting at zero.",
                    "For each node from 0 to n minus 1, check if it has been visited.",
                    "If unvisited, increment the counter and run a depth-first search to mark all connected nodes.",
                    "Return the final components count.",
                ],
                "code": """import java.util.*;

class Solution {
    public int countComponents(int n, int[][] edges) {
        List<List<Integer>> graph = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            graph.add(new ArrayList<>());
        }
        for (int[] edge : edges) {
            graph.get(edge[0]).add(edge[1]);
            graph.get(edge[1]).add(edge[0]);
        }

        boolean[] seen = new boolean[n];
        int components = 0;
        for (int i = 0; i < n; i++) {
            if (!seen[i]) {
                components++;
                dfs(graph, seen, i);
            }
        }
        return components;
    }

    private void dfs(List<List<Integer>> graph, boolean[] seen, int curr) {
        seen[curr] = true;
        for (int next : graph.get(curr)) {
            if (!seen[next]) {
                dfs(graph, seen, next);
            }
        }
    }
}""",
                "time_complexity": "O(V + E)",
                "time_why": "Building the graph and visiting every vertex and edge takes linear time in V and E.",
                "space_complexity": "O(V + E)",
                "space_why": "The adjacency list stores 2 * E entries and recursion uses O(V) stack space.",
                "when_to_use": "Mention it first as the standard graph search baseline before optimizing with Union-Find.",
            },
            {
                "name": "Union find with path compression",
                "is_optimal": True,
                "idea": "Initialize n components, find root representatives with path compression, and decrement count on each union.",
                "steps": [
                    "Allocate a parent array of size n, setting parent[i] = i for all nodes.",
                    "Initialize a components counter to n.",
                    "For each edge, find the root of the first node and the root of the second node.",
                    "If the roots are different, link one root to the other and decrement the counter by one.",
                    "In find, flatten tree paths using path compression.",
                    "Return the components count after processing all edges.",
                ],
                "code": """class Solution {
    public int countComponents(int n, int[][] edges) {
        int[] parent = new int[n];
        for (int i = 0; i < n; i++) {
            parent[i] = i;
        }
        int components = n;
        for (int[] edge : edges) {
            int a = find(parent, edge[0]);
            int b = find(parent, edge[1]);
            if (a != b) {
                parent[a] = b;
                components--;
            }
        }
        return components;
    }

    private int find(int[] parent, int node) {
        while (parent[node] != node) {
            parent[node] = parent[parent[node]];
            node = parent[node];
        }
        return node;
    }
}""",
                "time_complexity": "O(E · α(V))",
                "time_why": "Path compression ensures find and union operations run in nearly constant time per edge.",
                "space_complexity": "O(V)",
                "space_why": "Only a single parent array of size n is required.",
                "when_to_use": "The optimal interview approach with minimal memory and incremental edge processing.",
            },
        ],
        "walkthrough": {
            "input": "n = 5, edges = [[0, 1], [1, 2], [3, 4]]",
            "result": "The number of connected components is 2.",
            "columns": ["step", "edge processed", "find roots", "action taken", "components remaining"],
            "rows": [
                ["0", "start", "-", "start with 5 isolated components", "5"],
                ["1", "[0, 1]", "find(0)=0, find(1)=1", "union 0 and 1: parent[0] = 1", "4"],
                ["2", "[1, 2]", "find(1)=1, find(2)=2", "union 1 and 2: parent[1] = 2", "3"],
                ["3", "[3, 4]", "find(3)=3, find(4)=4", "union 3 and 4: parent[3] = 4", "2"],
                ["4", "finish", "-", "all edges processed, return answer", "2"],
            ],
        },
        "mistakes": [
            {
                "name": "Unioning nodes directly instead of their roots",
                "wrong": "Writing parent[u] = v creates broken components if u is not already the root of its set.",
                "right": "Always call find on both endpoints first: parent[find(u)] = find(v).",
            },
            {
                "name": "Decrementing component count on duplicate edge",
                "wrong": "Decrementing components without checking if find(u) == find(v) undercounts components.",
                "right": "Only decrement components when `find(u) != find(v)`.",
            },
            {
                "name": "Missing path compression",
                "wrong": "Leaving tree paths uncompressed leads to O(n) worst-case find operations.",
                "right": "Point parent pointers directly to grandparents or the root during find.",
            },
        ],
        "edge_cases": [
            {
                "input": "n = 1, edges = []",
                "expected": "1",
                "why": "A single isolated vertex forms one component.",
            },
            {
                "input": "n = 4, edges = []",
                "expected": "4",
                "why": "Four isolated vertices form four separate components.",
            },
            {
                "input": "n = 3, edges = [[0, 1], [1, 2], [2, 0]]",
                "expected": "1",
                "why": "A cycle does not decrease the component count beyond the spanning tree.",
            },
            {
                "input": "n = 2, edges = [[0, 1]]",
                "expected": "1",
                "why": "Two nodes connected by a single edge form one component.",
            },
        ],
        "interview_script": [
            "I need to find the number of connected components in an undirected graph.",
            "The obvious way I could try is building an adjacency list and running DFS, taking O(V + E) time and O(V + E) space.",
            "The key point I notice is that every edge either joins two distinct components or closes a cycle in an existing component.",
            "So I use Union-Find with path compression, taking O(E · α(V)) time and O(V) space.",
            "I will test isolated nodes, a fully connected graph, an empty edge list, and a cycle.",
        ],
        "follow_ups": [
            {
                "question": "How does Union by Rank further optimize Disjoint Set Union?",
                "answer": "It attaches the shallower tree under the deeper tree, guaranteeing logarithmic tree height without compression.",
            },
            {
                "question": "Can this be used to detect whether a graph is a valid tree?",
                "answer": "Yes, a valid tree has exactly n - 1 edges and results in exactly one connected component.",
            },
            {
                "question": "What if edges are added or removed dynamically?",
                "answer": "Union-Find handles dynamic additions natively; dynamic deletions require offline processing or Euler tour trees.",
            },
        ],
        "related_slugs": ["lc-684", "lc-547", "lc-721"],
    },
    {
        "slugs": ["lc-684"],
        "pattern": "Union find",
        "trigger": "find an edge in an undirected graph that creates a cycle and can be removed to leave a tree",
        "summary": (
            "A tree with n nodes has n - 1 edges and zero cycles. "
            "When adding edges one by one into a Union-Find structure, the first edge whose endpoints share the same root creates the cycle."
        ),
        "approaches": [
            {
                "name": "Depth-first search cycle check per edge",
                "is_optimal": False,
                "idea": "Before adding each edge, run depth-first search to check if a path already connects the two endpoints.",
                "steps": [
                    "Maintain an adjacency list starting with empty neighbour lists for all nodes.",
                    "For each edge, check if the two endpoints are already connected using depth-first search.",
                    "If a path already exists between the two endpoints, return that edge as the redundant connection.",
                    "Otherwise, add the edge to the adjacency list and continue.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[] findRedundantConnection(int[][] edges) {
        int n = edges.length;
        List<List<Integer>> graph = new ArrayList<>();
        for (int i = 0; i <= n; i++) {
            graph.add(new ArrayList<>());
        }

        for (int[] edge : edges) {
            int u = edge[0];
            int v = edge[1];
            boolean[] seen = new boolean[n + 1];
            if (hasPath(graph, seen, u, v)) {
                return edge;
            }
            graph.get(u).add(v);
            graph.get(v).add(u);
        }
        return new int[0];
    }

    private boolean hasPath(List<List<Integer>> graph, boolean[] seen, int curr, int target) {
        if (curr == target) {
            return true;
        }
        seen[curr] = true;
        for (int next : graph.get(curr)) {
            if (!seen[next] && hasPath(graph, seen, next, target)) {
                return true;
            }
        }
        return false;
    }
}""",
                "time_complexity": "O(n²)",
                "time_why": "We run a depth-first search of up to O(n) work for each of the n edges.",
                "space_complexity": "O(n)",
                "space_why": "The adjacency list and visited boolean array store n vertices.",
                "when_to_use": "Mention it first as the incremental graph search approach before using Union-Find.",
            },
            {
                "name": "Union find cycle detection",
                "is_optimal": True,
                "idea": "Use Union-Find: if both endpoints of an edge have the same root, that edge closes a cycle.",
                "steps": [
                    "Allocate a parent array of size n + 1 where parent[i] = i for 1-based nodes.",
                    "For each edge, find the root of the first node and the root of the second node.",
                    "If both roots are equal, the nodes are already connected; return this edge immediately.",
                    "Otherwise, union the two sets by setting the parent of one root to the other root.",
                    "Return an empty array if no cycle was encountered.",
                ],
                "code": """class Solution {
    public int[] findRedundantConnection(int[][] edges) {
        int[] parent = new int[edges.length + 1];
        for (int i = 0; i < parent.length; i++) {
            parent[i] = i;
        }
        for (int[] edge : edges) {
            int a = find(parent, edge[0]);
            int b = find(parent, edge[1]);
            if (a == b) {
                return edge;
            }
            parent[a] = b;
        }
        return new int[0];
    }

    private int find(int[] parent, int node) {
        while (parent[node] != node) {
            parent[node] = parent[parent[node]];
            node = parent[node];
        }
        return node;
    }
}""",
                "time_complexity": "O(n · α(n))",
                "time_why": "Path compression ensures each edge check executes in virtually constant time.",
                "space_complexity": "O(n)",
                "space_why": "Only a single parent array of size n + 1 is needed.",
                "when_to_use": "The optimal interview approach for cycle detection in incremental edge additions.",
            },
        ],
        "walkthrough": {
            "input": "edges = [[1, 2], [1, 3], [2, 3]]",
            "result": "The redundant connection is [2, 3].",
            "columns": ["step", "edge [u, v]", "find(u)", "find(v)", "decision"],
            "rows": [
                ["1", "[1, 2]", "1", "2", "roots differ: union 1 and 2"],
                ["2", "[1, 3]", "2", "3", "roots differ: union 2 and 3"],
                ["3", "[2, 3]", "3", "3", "roots match: cycle closed, return [2, 3]"],
            ],
        },
        "mistakes": [
            {
                "name": "One-based indexing off-by-one error",
                "wrong": "Allocating parent array of size n instead of n + 1 causes index out of bounds for node n.",
                "right": "Allocate parent with edges.length + 1 since vertices are numbered 1 to n.",
            },
            {
                "name": "Returning the wrong cycle edge",
                "wrong": "Returning an earlier edge involved in the cycle violates the requirement to return the last edge in the input.",
                "right": "Process edges in input order; the first edge connecting two already-joined nodes is the answer.",
            },
            {
                "name": "Not using path compression in find",
                "wrong": "Following parent pointers linearly without flattening paths causes worst-case linear time per edge.",
                "right": "Use `parent[node] = parent[parent[node]]` to compress paths during each find call.",
            },
        ],
        "edge_cases": [
            {
                "input": "edges = [[1, 2], [2, 3], [3, 4], [1, 4], [1, 5]]",
                "expected": "[1, 4]",
                "why": "Edge [1, 4] completes the cycle 1-2-3-4-1.",
            },
            {
                "input": "edges = [[1, 2], [2, 3], [3, 1]]",
                "expected": "[3, 1]",
                "why": "The third edge closes the 3-node triangle cycle.",
            },
            {
                "input": "edges = [[1, 2], [1, 3], [3, 1]]",
                "expected": "[3, 1]",
                "why": "Handles parallel edges between the same two nodes.",
            },
            {
                "input": "Cycle formed by the very last edge in a long line graph",
                "expected": "Returns the last edge",
                "why": "Validates that all previous edges union cleanly into a single tree.",
            },
        ],
        "interview_script": [
            "I need to find the edge that creates a cycle in an undirected graph that would otherwise be a tree.",
            "The obvious way is running DFS before adding each edge, which I can do in O(n²) time and O(n) space.",
            "The key point: an edge creates a cycle if and only if both endpoints already share the same root.",
            "So I process edges in order with Union-Find, taking O(n · α(n)) time and O(n) space.",
            "I will test a triangle cycle, a large ring, and a cycle formed by the last edge in the input.",
        ],
        "follow_ups": [
            {
                "question": "What if the graph is directed (Redundant Connection II)?",
                "answer": "We must handle three cases: a node with two parents, a directed cycle, or both.",
            },
            {
                "question": "Can this be solved using Kruskal's algorithm?",
                "answer": "Yes, Kruskal's algorithm uses the exact same Union-Find logic to reject cycle-creating edges.",
            },
            {
                "question": "What if we need to remove an edge with minimum weight instead of the last edge?",
                "answer": "Sort edges by weight descending and use Union-Find to find the lowest-weight cycle edge.",
            },
        ],
        "related_slugs": ["lc-323", "lc-547", "lc-207"],
    },
    {
        "slugs": ["lc-721"],
        "pattern": "Union find",
        "trigger": "merge accounts that share common email addresses and return sorted emails by user",
        "summary": (
            "Each account lists a name and emails belonging to the same person. "
            "Union all emails in an account to the first email using Union-Find, then group emails by their root representative and sort them."
        ),
        "approaches": [
            {
                "name": "Pairwise email graph with BFS",
                "is_optimal": False,
                "idea": "Build a graph with edges between every pair of emails in the same account, then use BFS to find connected components.",
                "steps": [
                    "Construct an adjacency graph connecting each email to all other emails in the same account.",
                    "Map each email address to the account owner name.",
                    "For each unvisited email, launch a breadth-first search to find all connected emails.",
                    "Sort the collected emails alphabetically and prepend the account name.",
                    "Return the aggregated list of merged account records.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<List<String>> accountsMerge(List<List<String>> accounts) {
        Map<String, Set<String>> graph = new HashMap<>();
        Map<String, String> emailToName = new HashMap<>();

        for (List<String> account : accounts) {
            String name = account.get(0);
            for (int i = 1; i < account.size(); i++) {
                String email = account.get(i);
                emailToName.put(email, name);
                graph.putIfAbsent(email, new HashSet<>());
                for (int j = 1; j < account.size(); j++) {
                    if (i != j) {
                        graph.get(email).add(account.get(j));
                    }
                }
            }
        }

        Set<String> seen = new HashSet<>();
        List<List<String>> out = new ArrayList<>();

        for (String email : graph.keySet()) {
            if (!seen.contains(email)) {
                List<String> component = new ArrayList<>();
                Queue<String> queue = new ArrayDeque<>();
                queue.add(email);
                seen.add(email);
                while (!queue.isEmpty()) {
                    String curr = queue.poll();
                    component.add(curr);
                    for (String next : graph.get(curr)) {
                        if (seen.add(next)) {
                            queue.add(next);
                        }
                    }
                }
                Collections.sort(component);
                component.add(0, emailToName.get(email));
                out.add(component);
            }
        }
        return out;
    }
}""",
                "time_complexity": "O(N · K² + N · K log(N · K))",
                "time_why": "Pairwise graph construction takes quadratic time in account size K.",
                "space_complexity": "O(N · K²)",
                "space_why": "The complete pairwise edge graph stores up to N · K² edges across all accounts.",
                "when_to_use": "Mention it first as the pairwise graph baseline before using a star-graph Union-Find.",
            },
            {
                "name": "Union find on email addresses",
                "is_optimal": True,
                "idea": "Union each email in an account to the account's first email, group by root parent, and sort.",
                "steps": [
                    "Maintain a parent map and an owner map for all emails.",
                    "For each account, link all emails in that account to the first email.",
                    "Group all emails by their root representative using find.",
                    "For each root group, sort the emails alphabetically and prepend the owner name.",
                    "Return the list of merged account records.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<List<String>> accountsMerge(List<List<String>> accounts) {
        Map<String, String> parent = new HashMap<>();
        Map<String, String> owner = new HashMap<>();
        for (List<String> account : accounts) {
            String name = account.get(0);
            String first = account.get(1);
            for (int i = 1; i < account.size(); i++) {
                String email = account.get(i);
                parent.putIfAbsent(email, email);
                owner.put(email, name);
                union(parent, first, email);
            }
        }
        Map<String, List<String>> groups = new HashMap<>();
        for (String email : parent.keySet()) {
            groups.computeIfAbsent(find(parent, email), key -> new ArrayList<>()).add(email);
        }
        List<List<String>> out = new ArrayList<>();
        for (Map.Entry<String, List<String>> entry : groups.entrySet()) {
            List<String> emails = entry.getValue();
            Collections.sort(emails);
            List<String> row = new ArrayList<>();
            row.add(owner.get(entry.getKey()));
            row.addAll(emails);
            out.add(row);
        }
        return out;
    }

    private String find(Map<String, String> parent, String node) {
        while (!parent.get(node).equals(node)) {
            parent.put(node, parent.get(parent.get(node)));
            node = parent.get(node);
        }
        return node;
    }

    private void union(Map<String, String> parent, String a, String b) {
        String rootA = find(parent, a);
        String rootB = find(parent, b);
        if (!rootA.equals(rootB)) {
            parent.put(rootA, rootB);
        }
    }
}""",
                "time_complexity": "O(N · K log(N · K))",
                "time_why": "Union operations take nearly constant time; sorting the emails in each merged account dominates runtime.",
                "space_complexity": "O(N · K)",
                "space_why": "The parent map and grouping map store each unique email once, taking O(N · K) space.",
                "when_to_use": "The optimal interview approach for merging accounts without quadratic graph construction.",
            },
        ],
        "walkthrough": {
            "input": 'accounts = [["John","a@m.com","b@m.com"],["John","c@m.com"],["John","a@m.com","d@m.com"]]',
            "result": 'The merged accounts are [["John","a@m.com","b@m.com","d@m.com"],["John","c@m.com"]].',
            "columns": ["step", "account processed", "unions performed", "disjoint roots", "status"],
            "rows": [
                ["1", "John: a, b", "union(a, b)", "{a: b, b: b}", "a and b linked"],
                ["2", "John: c", "c is isolated", "{c: c}", "c is separate root"],
                ["3", "John: a, d", "union(a, d)", "{a: b, b: d, d: d}", "b linked to d; a, b, d merged"],
                ["4", "grouping", "root d: [a, b, d], root c: [c]", "sort emails", "2 merged accounts produced"],
            ],
        },
        "mistakes": [
            {
                "name": "Merging accounts by name instead of email",
                "wrong": "Assuming accounts with the same person name belong to the same person merges two different people with the same name.",
                "right": "Only merge accounts that share at least one identical email address.",
            },
            {
                "name": "Forgetting to sort emails in the output",
                "wrong": "Returning emails in arbitrary hash map order fails test cases requiring sorted email lists.",
                "right": "Call `Collections.sort(emails)` before creating the final result row.",
            },
            {
                "name": "Missing transitive connections across accounts",
                "wrong": "Only merging accounts that share an email with the first account fails chained links A-B and B-C.",
                "right": "Union-Find naturally flattens transitive connections through root representatives.",
            },
        ],
        "edge_cases": [
            {
                "input": "Two accounts with the same name but no common emails",
                "expected": "Remain two separate accounts",
                "why": "Different people can have the same name; emails are the true identity.",
            },
            {
                "input": "Account with a single email",
                "expected": "Returned as a valid single-email account",
                "why": "Single-email accounts form independent singleton components.",
            },
            {
                "input": "Chained accounts: A shares with B, B shares with C",
                "expected": "All three accounts merged into one",
                "why": "Transitive email sharing unifies the entire chain into a single root.",
            },
            {
                "input": "Accounts already having duplicate emails within the same account",
                "expected": "Duplicate emails deduplicated in the merged list",
                "why": "The parent map keys deduplicate multiple occurrences of the same email.",
            },
        ],
        "interview_script": [
            "I need to merge accounts that share emails and return each person's emails in sorted order.",
            "The obvious way I could try is building a pairwise email graph and running BFS, taking O(N · K²) space.",
            "The key point I observe is that people can share names, but email addresses uniquely identify individuals.",
            "So I use Union-Find to connect each email to the first email, taking O(N · K log(N · K)) time and O(N · K) space.",
            "I will test accounts sharing names but different emails, chained accounts, and single-email accounts.",
        ],
        "follow_ups": [
            {
                "question": "What if emails are added incrementally in a streaming service?",
                "answer": "Union-Find naturally supports dynamic stream additions by calling union on each new connection.",
            },
            {
                "question": "Can this be solved using integer IDs instead of email strings?",
                "answer": "Yes, mapping emails to integer IDs allows using primitive arrays for parent and rank arrays.",
            },
            {
                "question": "What if an account has no emails at all?",
                "answer": "Return the account with just the owner name and an empty email list.",
            },
        ],
        "related_slugs": ["lc-323", "lc-684", "lc-547"],
    },
]
