import {
  AgyGroupsClustersView,
  type ClusterGroupState,
  type ClusterNode,
  type ClusterSet,
} from "../agy-groups-clusters-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<ClusterGroupState>;

const PRACTICE = '[["Alex","a@m.com","b@m.com"],["Alex","b@m.com","c@m.com"],["Bob","d@m.com"]]';
const TRAP = "The Name Match Trap";

const CODE = [
  "List<List<String>> accountsMerge(List<List<String>> accounts) {",
  "    Map<String, String> parent = new HashMap<>();",
  "    Map<String, String> owner = new HashMap<>();",
  "    for (List<String> account : accounts) {",
  "        String name = account.get(0);",
  "        String first = account.get(1);",
  "        for (int i = 1; i < account.size(); i++) {",
  "            String email = account.get(i);",
  "            parent.putIfAbsent(email, email);",
  "            owner.put(email, name);",
  "            union(parent, first, email);",
  "        }",
  "    }",
  "    Map<String, List<String>> groups = new HashMap<>();",
  "    for (String email : parent.keySet()) {",
  "        groups.computeIfAbsent(find(parent, email), key -> new ArrayList<>()).add(email);",
  "    }",
  "    List<List<String>> out = new ArrayList<>();",
  "    for (Map.Entry<String, List<String>> entry : groups.entrySet()) {",
  "        List<String> emails = entry.getValue();",
  "        Collections.sort(emails);",
  "        List<String> row = new ArrayList<>();",
  "        row.add(owner.get(entry.getKey()));",
  "        row.addAll(emails);",
  "        out.add(row);",
  "    }",
  "    return out;",
  "}",
  "",
  "String find(Map<String, String> parent, String node) {",
  "    while (!parent.get(node).equals(node)) {",
  "        parent.put(node, parent.get(parent.get(node)));",
  "        node = parent.get(node);",
  "    }",
  "    return node;",
  "}",
  "",
  "void union(Map<String, String> parent, String a, String b) {",
  "    String rootA = find(parent, a);",
  "    String rootB = find(parent, b);",
  "    if (!rootA.equals(rootB)) {",
  "        parent.put(rootA, rootB);",
  "    }",
  "}",
];

function parseInput(input: string): string[][] {
  try {
    const raw = input.trim();
    const parsed = JSON.parse(raw) as string[][];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // fallback
  }
  return [
    ["John", "a@m.com", "b@m.com"],
    ["John", "c@m.com"],
    ["John", "a@m.com", "d@m.com"],
  ];
}

function solve(accounts: string[][]): string[][] {
  const parent = new Map<string, string>();
  const owner = new Map<string, string>();

  const find = (x: string): string => {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)!)!);
      x = parent.get(x)!;
    }
    return x;
  };

  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) {
      parent.set(ra, rb);
    }
  };

  for (const account of accounts) {
    const name = account[0];
    const first = account[1];
    for (let i = 1; i < account.length; i++) {
      const email = account[i];
      if (!parent.has(email)) parent.set(email, email);
      owner.set(email, name);
      union(first, email);
    }
  }

  const groups = new Map<string, string[]>();
  for (const email of parent.keys()) {
    const root = find(email);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(email);
  }

  const out: string[][] = [];
  for (const [root, emails] of groups.entries()) {
    emails.sort();
    out.push([owner.get(root)!, ...emails]);
  }

  out.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  return out;
}

function answerText(input: string): string {
  const accounts = parseInput(input);
  return JSON.stringify(solve(accounts));
}

function buildNodes(
  allEmails: string[],
  parent: Map<string, string>,
  owner: Map<string, string>,
  activeEmail?: string,
): ClusterNode[] {
  return allEmails.map((email, idx) => {
    const p = parent.get(email) ?? email;
    const name = owner.get(email) ?? "User";
    let tone: ClusterNode["tone"] = "idle";
    if (email === activeEmail) {
      tone = "edge";
    } else if (p === email) {
      tone = "hit";
    }
    return {
      id: idx,
      label: email,
      parent: p,
      sub: `${name}: ${p}`,
      tone,
    };
  });
}

function buildClusters(
  allEmails: string[],
  parent: Map<string, string>,
  owner: Map<string, string>,
): ClusterSet[] {
  const find = (x: string): string => {
    let curr = x;
    while (parent.get(curr) && parent.get(curr) !== curr) {
      curr = parent.get(curr)!;
    }
    return curr;
  };

  const groups = new Map<string, string[]>();
  for (const email of allEmails) {
    const root = find(email);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(email);
  }

  return Array.from(groups.entries()).map(([root, items]) => ({
    root,
    name: owner.get(root) ?? "Account",
    items,
    tone: "hit",
  }));
}

function pictureFrames(accounts: string[][]): Frame[] {
  const allEmails = Array.from(new Set(accounts.flatMap((a) => a.slice(1))));
  const parent = new Map<string, string>(allEmails.map((e) => [e, e]));
  const owner = new Map<string, string>();
  for (const acc of accounts) {
    for (const email of acc.slice(1)) owner.set(email, acc[0]);
  }

  return [
    {
      scene: "picture",
      caption: "Users have accounts with email tags. Two accounts belong to the same person if they share an email.",
      state: {
        nodes: buildNodes(allEmails, parent, owner),
        clusters: buildClusters(allEmails, parent, owner),
        counter: { label: "email tags", value: allEmails.length },
        note: { text: "accounts with email tags", tone: "accent" },
      },
    },
    {
      scene: "picture",
      caption: "People can have multiple email addresses across different records, creating linked chains of tags.",
      state: {
        nodes: buildNodes(allEmails, parent, owner),
        clusters: buildClusters(allEmails, parent, owner),
        counter: { label: "raw accounts", value: accounts.length },
        note: { text: "shared emails link accounts", tone: "teal" },
      },
    },
    {
      scene: "picture",
      caption: "Our goal is to merge accounts belonging to the same owner and return sorted lists of emails.",
      state: {
        nodes: buildNodes(allEmails, parent, owner),
        clusters: buildClusters(allEmails, parent, owner),
        counter: { label: "email tags", value: allEmails.length },
        note: { text: "merge and sort emails", tone: "teal" },
      },
    },
  ];
}

function slowFrames(accounts: string[][]): Frame[] {
  const allEmails = Array.from(new Set(accounts.flatMap((a) => a.slice(1))));
  const parent = new Map<string, string>(allEmails.map((e) => [e, e]));
  const owner = new Map<string, string>();
  for (const acc of accounts) {
    for (const email of acc.slice(1)) owner.set(email, acc[0]);
  }

  return [
    {
      scene: "slow",
      caption: "The slow way adds bidirectional graph edges between every pair of emails in the same account.",
      state: {
        nodes: buildNodes(allEmails, parent, owner),
        clusters: buildClusters(allEmails, parent, owner),
        counter: { label: "pairwise edges", value: "O(N · K²)" },
        note: { text: "all-pairs graph construction", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Creating pairwise edges between all emails wastes quadratic time and memory on dense subgraphs.",
      state: {
        nodes: buildNodes(allEmails, parent, owner),
        clusters: buildClusters(allEmails, parent, owner),
        counter: { label: "graph overhead", value: "high memory" },
        note: { text: "quadratic edge explosion", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Union-Find links each email directly to the first email, forming an efficient star chain.",
      state: {
        nodes: buildNodes(allEmails, parent, owner),
        clusters: buildClusters(allEmails, parent, owner),
        counter: { label: "star links", value: "O(N · K)" },
        note: { text: "linear star links", tone: "teal" },
      },
    },
  ];
}

function insightFrames(accounts: string[][]): Frame[] {
  const allEmails = Array.from(new Set(accounts.flatMap((a) => a.slice(1))));
  const parent = new Map<string, string>(allEmails.map((e) => [e, e]));
  const owner = new Map<string, string>();
  for (const acc of accounts) {
    for (const email of acc.slice(1)) owner.set(email, acc[0]);
  }

  return [
    {
      scene: "insight",
      caption: "Never merge accounts by name: two different people can share the exact same name tag.",
      state: {
        nodes: buildNodes(allEmails, parent, owner),
        clusters: buildClusters(allEmails, parent, owner),
        note: { text: "names are not unique", tone: "accent" },
      },
    },
    {
      scene: "insight",
      caption: "Merge accounts only when an email tag matches, uniting the root leaders of their address chains.",
      state: {
        nodes: buildNodes(allEmails, parent, owner),
        clusters: buildClusters(allEmails, parent, owner),
        note: { text: "match email tags only", tone: "teal" },
      },
    },
  ];
}

function solutionFrames(accounts: string[][]): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];

  const parent = new Map<string, string>();
  const owner = new Map<string, string>();
  const allEmails: string[] = [];

  const find = (x: string): string => {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)!)!);
      x = parent.get(x)!;
    }
    return x;
  };

  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) {
      parent.set(ra, rb);
    }
  };

  frames.push({
    scene,
    codeLine: 1,
    caption: "Set up parent and owner maps. Each email will point to its root leader in the address chain.",
    state: {
      nodes: [],
      clusters: [],
      counter: { label: "processed", value: 0 },
      note: { text: "maps ready for union find", tone: "accent" },
    },
  });

  let askedTrap = false;

  for (let accIdx = 0; accIdx < accounts.length; accIdx++) {
    const account = accounts[accIdx];
    const name = account[0];
    const first = account[1];

    for (let i = 1; i < account.length; i++) {
      const email = account[i];
      if (!parent.has(email)) {
        parent.set(email, email);
        allEmails.push(email);
      }
      owner.set(email, name);
    }

    for (let i = 2; i < account.length; i++) {
      union(first, account[i]);
    }

    if (!askedTrap && accIdx === 1 && accounts[0][0] === accounts[1][0] && accounts[0].slice(1).every((e) => !accounts[1].slice(1).includes(e))) {
      askedTrap = true;
      const trapQuiz: StoryQuiz = {
        kind: "choice",
        question: `Account 1 and Account 2 are both named "${name}" but share no emails. Should we union them?`,
        options: [
          "no: different people can share the same name, so only matching emails prove identity",
          "yes: accounts with matching names always belong to the same person",
        ],
        answer: 0,
        why: "Names are not unique; email addresses represent true individual identity.",
      };

      frames.push({
        scene,
        codeLine: 10,
        caption: `${TRAP}: accounts share name "${name}" but have disjoint emails; keep their chains separate.`,
        state: {
          nodes: buildNodes(allEmails, parent, owner, first),
          clusters: buildClusters(allEmails, parent, owner),
          counter: { label: "name collision", value: name },
          note: { text: "do not merge by name alone", tone: "coral" },
        },
        quiz: trapQuiz,
      });

      frames.push({
        scene,
        codeLine: 10,
        caption: `Preserved separate root leaders for distinct "${name}" accounts without email overlap.`,
        state: {
          nodes: buildNodes(allEmails, parent, owner),
          clusters: buildClusters(allEmails, parent, owner),
          counter: { label: "disjoint accounts", value: "kept apart" },
          note: { text: "merged by email only", tone: "teal" },
        },
      });
    } else {
      frames.push({
        scene,
        codeLine: 10,
        caption: `Processed account for ${name}. Email tags linked to star root ${first}.`,
        state: {
          nodes: buildNodes(allEmails, parent, owner, first),
          clusters: buildClusters(allEmails, parent, owner),
          counter: { label: "account", value: `${name} (${first})` },
          note: { text: `linked emails under ${first}`, tone: "accent" },
        },
      });
    }
  }

  const result = solve(accounts);

  frames.push({
    scene,
    codeLine: 26,
    caption: `All accounts merged into clean packets with sorted emails. The answer is ${JSON.stringify(result)}.`,
    state: {
      nodes: buildNodes(allEmails, parent, owner),
      clusters: buildClusters(allEmails, parent, owner),
      counter: { label: "merged accounts", value: result.length },
      note: { text: "all accounts merged and sorted", tone: "accent" },
    },
  });

  frames.push({
    scene,
    codeLine: 26,
    caption: "Time: O(N · K log(N · K)). Star unions are fast; sorting emails per account dominates.",
    state: {
      nodes: buildNodes(allEmails, parent, owner),
      clusters: buildClusters(allEmails, parent, owner),
      note: { text: "time complexity", tone: "accent" },
    },
  });

  frames.push({
    scene,
    codeLine: 26,
    caption: "Space: O(N · K). The parent map and grouping map store each unique email once.",
    state: {
      nodes: buildNodes(allEmails, parent, owner),
      clusters: buildClusters(allEmails, parent, owner),
      note: { text: "space complexity", tone: "accent" },
    },
  });

  return frames;
}

function cardFrames(accounts: string[][]): Frame[] {
  const scene: SceneId = "card";
  const frames: Frame[] = [];
  const allEmails = Array.from(new Set(accounts.flatMap((a) => a.slice(1))));
  const parent = new Map<string, string>(allEmails.map((e) => [e, e]));
  const owner = new Map<string, string>();
  for (const acc of accounts) {
    for (const email of acc.slice(1)) owner.set(email, acc[0]);
  }

  const quiz1: StoryQuiz = {
    kind: "choice",
    question: "How does Union-Find connect emails that appear in the same account record?",
    options: [
      "unions every email in the account to the account's first email",
      "hashes all emails into a single 64-bit integer",
    ],
    answer: 0,
    why: "Linking each email to the first creates a star graph, connecting all emails with minimal operations.",
  };

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "Why must the emails in each merged account be sorted before producing the final result?",
    options: [
      "the problem requires emails within each account row to appear in alphabetical order",
      "sorting prevents cyclic parent pointers in the disjoint set",
    ],
    answer: 0,
    why: "Hash map iteration order is arbitrary, so sorting guarantees deterministic alphabetical output.",
  };

  frames.push({
    scene,
    caption: "When merging accounts, connect email tags with a disjoint set and group by root leader.",
    state: {
      nodes: buildNodes(allEmails, parent, owner),
      clusters: buildClusters(allEmails, parent, owner),
      note: { text: "email tag chains", tone: "accent" },
    },
    quiz: quiz1,
  });

  frames.push({
    scene,
    caption: "Never merge accounts by owner name alone: different people can share the same name tag.",
    state: {
      nodes: buildNodes(allEmails, parent, owner),
      clusters: buildClusters(allEmails, parent, owner),
      note: { text: "require common email", tone: "teal" },
    },
  });

  frames.push({
    scene,
    caption: "Sort the emails for each merged owner before returning to guarantee alphabetical order.",
    state: {
      nodes: buildNodes(allEmails, parent, owner),
      clusters: buildClusters(allEmails, parent, owner),
      note: { text: "sort email packets", tone: "accent" },
    },
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Remember the email name tag chains: group by shared emails, respect distinct owners, and sort every packet.",
    state: {
      nodes: buildNodes(allEmails, parent, owner),
      clusters: buildClusters(allEmails, parent, owner),
      note: { text: "all accounts merged", tone: "teal" },
    },
  });

  return frames;
}

export const accountsMergeStory: ProblemStory<ClusterGroupState> = {
  slugs: ["lc-721"],
  pattern: "Union find",
  trigger: "merge accounts that share common email addresses and return sorted emails by user",
  insight: "Each account lists a name and emails belonging to one person. Union all emails in an account to the first email, then group all emails by their root leader and sort each group.",
  metaphor: {
    name: "The email name tag chains",
    legend: "tag = email address · chain = linked parent pointers · owner = person name · packet = merged account",
    terms: ["email", "tag", "chain", "owner", "packet", "leader", "root", "union", "merge", "account"],
  },
  traps: [{ name: TRAP, rule: "Only merge accounts that share at least one identical email address." }],
  template: [
    "class Solution:",
    "    List<List<String>> accountsMerge(List<List<String>> accounts):",
    "        link each email to first email in account using Union-Find",
    "        group emails by root leader",
    "        sort emails in each group and prepend account name",
  ],
  complexity: {
    slow: "O(N · K² + N · K log(N · K))",
    time: "O(N · K log(N · K))",
    timeWhy: "union operations take nearly constant time; sorting the emails in each merged account dominates runtime",
    space: "O(N · K)",
    spaceWhy: "the parent map and grouping map store each unique email once, taking O(N · K) space",
  },
  code: CODE,
  examples: [
    {
      label: "John accounts",
      input: '[["John","a@m.com","b@m.com"],["John","c@m.com"],["John","a@m.com","d@m.com"]]',
      expected: '[["John","a@m.com","b@m.com","d@m.com"],["John","c@m.com"]]',
    },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-323", title: "Number of Connected Components in an Undirected Graph" },
    { slug: "lc-684", title: "Redundant Connection" },
  ],
  answer: (input) => answerText(input),
  frames: (input) => {
    const accounts = parseInput(input);
    return [
      ...pictureFrames(accounts),
      ...slowFrames(accounts),
      ...insightFrames(accounts),
      ...solutionFrames(accounts),
      ...cardFrames(accounts),
    ];
  },
  View: AgyGroupsClustersView,
};
