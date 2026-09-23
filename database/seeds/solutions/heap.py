"""Heap and Priority Queue problems. See SOLUTION_GUIDE.md in this folder."""

from __future__ import annotations

SOLUTIONS: list[dict] = [
    {
        "slugs": ["lc-1046"],
        "pattern": "Heap / top K",
        "trigger": "repeatedly smashing the two largest numbers together until at most one remains",
        "summary": (
            "Insert all stone weights into a max-heap. "
            "Repeatedly take out the two heaviest stones and put any non-zero difference back until at most one stone is left."
        ),
        "approaches": [
            {
                "name": "Repeated array sorting",
                "is_optimal": False,
                "idea": "Sort the active portion of the array after every smash to find the two heaviest stones.",
                "steps": [
                    "Track the number of active stones starting at the full array length.",
                    "Loop while the count of active stones is greater than one.",
                    "Sort the active slice of the array in ascending order.",
                    "Calculate the difference between the two largest values at the end.",
                    "If the difference is zero, decrease the count by two, otherwise write the difference and decrease by one.",
                    "Return the last remaining stone weight, or zero if no stones remain.",
                ],
                "code": """import java.util.*;

class Solution {
    public int lastStoneWeight(int[] stones) {
        int n = stones.length;
        while (n > 1) {
            Arrays.sort(stones, 0, n);
            int diff = stones[n - 1] - stones[n - 2];
            if (diff == 0) {
                n -= 2;
            } else {
                stones[n - 2] = diff;
                n -= 1;
            }
        }
        return n == 1 ? stones[0] : 0;
    }
}
""",
                "time_complexity": "O(n² log n)",
                "time_why": "We perform up to n smashes, sorting the array at each step.",
                "space_complexity": "O(1)",
                "space_why": "Sorting happens directly within the input array using constant extra memory.",
                "when_to_use": "Mention it first as the direct simulation before introducing the heap.",
            },
            {
                "name": "Max-heap simulation",
                "is_optimal": True,
                "idea": "Keep all stone weights in a max-heap to extract the two heaviest stones in logarithmic time.",
                "steps": [
                    "Create a priority queue configured with reverse order to act as a max-heap.",
                    "Add every stone weight from the input array into the heap.",
                    "While the heap holds more than one stone, pull the two largest stones out.",
                    "If the two stone weights differ, add their positive difference back into the heap.",
                    "Return the single remaining stone weight, or zero if the heap is empty.",
                ],
                "code": """import java.util.*;

class Solution {
    public int lastStoneWeight(int[] stones) {
        PriorityQueue<Integer> heap = new PriorityQueue<>(Comparator.reverseOrder());
        for (int stone : stones) {
            heap.add(stone);
        }
        while (heap.size() > 1) {
            int first = heap.poll();
            int second = heap.poll();
            if (first != second) {
                heap.add(first - second);
            }
        }
        return heap.isEmpty() ? 0 : heap.peek();
    }
}
""",
                "time_complexity": "O(n log n)",
                "time_why": "Each smash pulls and pushes elements in logarithmic time across at most n smashes.",
                "space_complexity": "O(n)",
                "space_why": "The max-heap stores up to n stone weights.",
                "when_to_use": "The standard interview approach for repeated maximum element retrieval.",
            },
        ],
        "walkthrough": {
            "input": "stones = [2, 7, 4, 1, 8, 1]",
            "columns": ["heap before", "two largest pulled", "difference", "heap after"],
            "rows": [
                ["[8, 7, 4, 2, 1, 1]", "8 and 7", "1", "[4, 2, 1, 1, 1]"],
                ["[4, 2, 1, 1, 1]", "4 and 2", "2", "[2, 1, 1, 1]"],
                ["[2, 1, 1, 1]", "2 and 1", "1", "[1, 1, 1]"],
                ["[1, 1, 1]", "1 and 1", "0", "[1]"],
            ],
            "result": "The last remaining stone weight is 1.",
        },
        "mistakes": [
            {
                "name": "The Upside-Down Trap",
                "wrong": "Writing `new PriorityQueue<>()` which retrieves the smallest stones first.",
                "right": "Pass `Comparator.reverseOrder()` so the queue pulls the largest stones first.",
            },
            {
                "name": "Reinserting zero difference into heap",
                "wrong": "Pushing 0 back into the heap when both stones have equal weight.",
                "right": "Only add back when `first != second` so completely destroyed stones are removed.",
            },
            {
                "name": "Calling peek on an empty heap",
                "wrong": "Directly returning `heap.peek()` without checking if all stones were destroyed.",
                "right": "Check `heap.isEmpty()` and return 0 when no stones remain.",
            },
        ],
        "edge_cases": [
            {"input": "stones = [1]", "expected": "1", "why": "A single stone remains intact."},
            {"input": "stones = [2, 2]", "expected": "0", "why": "Two identical stones destroy each other completely."},
            {"input": "stones = [3, 7, 2]", "expected": "2", "why": "An odd number of stones resulting in one survivor."},
            {"input": "stones = [1, 1, 1, 1]", "expected": "0", "why": "Four identical stones destroying each other in pairs."},
        ],
        "interview_script": [
            "I need to repeatedly smash the two heaviest stones together until at most one remains.",
            "The obvious way is sorting the array after each smash, taking O(n² log n) time and O(1) space.",
            "The key point: I only ever need the two largest numbers, which a max-heap gives in logarithmic time.",
            "So I pull the top two from a max-heap and push back their difference, taking O(n log n) time and O(n) space.",
            "I will test a single stone, two identical stones that destroy each other, and three distinct stones.",
        ],
        "follow_ups": [
            {
                "question": "What if stone weights are small integers bounded by 1,000?",
                "answer": "Use an array of frequency counts to find the largest stones in O(max_weight) time without a heap.",
            },
            {
                "question": "Can we simulate this with an array-based bucket sort?",
                "answer": "Yes, bucket counting allows linear time smashes when the max weight is small.",
            },
            {
                "question": "What if stones can be smashed in groups of three?",
                "answer": "Extract the three largest elements and reinsert the difference between the largest and the sum of the other two.",
            },
        ],
        "related_slugs": ["lc-215", "lc-973", "lc-295"],
    },
    {
        "slugs": ["lc-215"],
        "pattern": "Heap / top K",
        "trigger": "find the kth largest element in an unsorted array",
        "summary": (
            "Keep a min-heap of size k. "
            "For each number, add it to the heap and drop the smallest whenever the heap has more than k items. The kth largest element stays at the top."
        ),
        "approaches": [
            {
                "name": "Full array sort",
                "is_optimal": False,
                "idea": "Sort the entire array in ascending order and read the element at length minus k.",
                "steps": [
                    "Sort the input array in ascending order using the standard sorting helper.",
                    "Locate the target value at index array length minus k.",
                    "Return that value directly as the answer.",
                ],
                "code": """import java.util.*;

class Solution {
    public int findKthLargest(int[] nums, int k) {
        Arrays.sort(nums);
        return nums[nums.length - k];
    }
}
""",
                "time_complexity": "O(n log n)",
                "time_why": "Sorting all n elements in the array dominates the running time.",
                "space_complexity": "O(1)",
                "space_why": "The dual-pivot quicksort runs in place within the array.",
                "when_to_use": "Mention it first as the simplest baseline before optimizing with a heap.",
            },
            {
                "name": "Min-heap of fixed size k",
                "is_optimal": True,
                "idea": "Track the k largest elements in a min-heap, evicting the smallest whenever size exceeds k.",
                "steps": [
                    "Create a min-heap of integers to hold at most k elements.",
                    "For each value in the array, add the value into the min-heap.",
                    "If the min-heap size exceeds k, drop the smallest element from the top.",
                    "Return the top of the min-heap, which is the kth largest element.",
                ],
                "code": """import java.util.*;

class Solution {
    public int findKthLargest(int[] nums, int k) {
        PriorityQueue<Integer> heap = new PriorityQueue<>(k);
        for (int value : nums) {
            heap.add(value);
            if (heap.size() > k) {
                heap.poll();
            }
        }
        return heap.peek();
    }
}
""",
                "time_complexity": "O(n log k)",
                "time_why": "Each of the n elements triggers a log k heap push or poll.",
                "space_complexity": "O(k)",
                "space_why": "The min-heap never holds more than k plus one items.",
                "when_to_use": "Optimal in an interview when k is much smaller than n or input arrives as a stream.",
            },
            {
                "name": "Quickselect on the k-th position",
                "idea": "Sorting the whole array does far more than the question asks: pick one value as a pivot, push everything smaller to its left and everything larger to its right, then keep only the side that holds the position you want.",
                "steps": [
                    "In ascending order the answer sits at position `nums.length - k`, so that is the position to hunt for.",
                    "Pick a value from the live range at random and call it the pivot.",
                    "Rearrange the range into three blocks: values below the pivot, values equal to it, then values above it.",
                    "If the wanted position lands inside the equal block, the pivot is the answer.",
                    "Otherwise narrow the range to the one side that still holds the position, and pick a new pivot there.",
                ],
                "code": """import java.util.*;

class Solution {
    public int findKthLargest(int[] nums, int k) {
        int target = nums.length - k;
        int lo = 0, hi = nums.length - 1;
        Random random = new Random(42);
        while (true) {
            int pivot = nums[lo + random.nextInt(hi - lo + 1)];
            // Three blocks: [lo, lt) below the pivot, [lt, gt] equal, (gt, hi] above.
            int lt = lo, gt = hi, i = lo;
            while (i <= gt) {
                if (nums[i] < pivot) {
                    swap(nums, i++, lt++);
                } else if (nums[i] > pivot) {
                    swap(nums, i, gt--);
                } else {
                    i++;
                }
            }
            if (target < lt) {
                hi = lt - 1;
            } else if (target > gt) {
                lo = gt + 1;
            } else {
                return pivot;
            }
        }
    }

    private void swap(int[] a, int i, int j) {
        int tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
    }
}
""",
                "time_complexity": "O(n) average, O(n²) worst",
                "time_why": "Each round looks at the live range once, and a random pivot halves that range on average, so the passes add up to about 2n.",
                "space_complexity": "O(1)",
                "space_why": "The blocks are built inside the input array, and the loop replaces the recursive calls.",
                "when_to_use": "When they ask for linear time, or for the whole top k and not one value: the same run leaves the k largest sitting in the last k slots. It needs the array in memory, so a stream still wants the heap.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [3, 2, 1, 5, 6, 4], k = 2",
            "columns": ["number seen", "heap before", "action taken", "heap after"],
            "rows": [
                ["3", "[]", "add 3", "[3]"],
                ["2", "[3]", "add 2", "[2, 3]"],
                ["1", "[2, 3]", "add 1, size exceeds 2, drop 1", "[2, 3]"],
                ["5", "[2, 3]", "add 5, size exceeds 2, drop 2", "[3, 5]"],
                ["6", "[3, 5]", "add 6, size exceeds 2, drop 3", "[5, 6]"],
                ["4", "[5, 6]", "add 4, size exceeds 2, drop 4", "[5, 6]"],
            ],
            "result": "The top of the min-heap is 5, which is the 2nd largest element.",
        },
        "mistakes": [
            {
                "name": "The Keep-Everything Trap",
                "wrong": "Storing all n elements in a max-heap, taking O(n) memory.",
                "right": "Use a min-heap bounded by size k so memory is only O(k) and runtime is O(n log k).",
            },
            {
                "name": "Wrong index after sorting",
                "wrong": "Returning `nums[k - 1]` after an ascending sort.",
                "right": "In ascending order, the kth largest element is at index `nums.length - k`.",
            },
            {
                "name": "Using k as a 0-based offset",
                "wrong": "Confusing 1-based kth largest with 0-based indexing.",
                "right": "Keep the heap size at exactly k elements so the root represents the kth largest.",
            },
        ],
        "edge_cases": [
            {"input": "nums = [1], k = 1", "expected": "1", "why": "A single element array."},
            {"input": "nums = [2, 2, 2], k = 2", "expected": "2", "why": "An array containing duplicate numbers."},
            {"input": "nums = [-1, -2, -3], k = 1", "expected": "-1", "why": "Negative numbers compared correctly."},
            {"input": "nums = [5, 4, 3, 2, 1], k = 5", "expected": "1", "why": "Finding the smallest element when k equals n."},
        ],
        "interview_script": [
            "I need to find the kth largest element in an unsorted array.",
            "The obvious way is sorting the entire array, which I can do in O(n log n) time and O(1) space.",
            "The key point: I only need the k largest values, so a min-heap of size k can track them.",
            "So I push each number into a min-heap and evict the smallest, taking O(n log k) time and O(k) space.",
            "I will test a single element, duplicate values, negative numbers, and k equal to array length.",
        ],
        "follow_ups": [
            {
                "question": "Can we achieve O(n) average time complexity?",
                "answer": "Yes, quickselect partitions the array around a pivot and discards half the array on each step.",
            },
            {
                "question": "What are the trade-offs between quickselect and a min-heap for streaming data?",
                "answer": "Quickselect requires all data in memory, while a min-heap processes incoming streams with O(k) memory.",
            },
            {
                "question": "What if k is very close to n?",
                "answer": "Use a max-heap of size n - k + 1 to find the equivalent smallest element faster.",
            },
        ],
        "related_slugs": ["lc-1046", "lc-973", "lc-230"],
    },
    {
        "slugs": ["lc-23"],
        "pattern": "Heap / top K",
        "trigger": "an array of k sorted linked lists that must be merged into one single sorted list",
        "summary": (
            "Put the head of each non-empty list into a min-heap. "
            "Pull the smallest node, attach it to our merged list, and push its next node into the heap until all lists are empty."
        ),
        "approaches": [
            {
                "name": "Merge lists one by one",
                "is_optimal": False,
                "idea": "Merge each linked list into a running accumulated list using two-way list merging.",
                "steps": [
                    "If the input array is empty, return null.",
                    "Set the running result head to the first list in the array.",
                    "For each subsequent list, merge it with the running result using two pointers.",
                    "Continue the process until all k lists have been merged.",
                    "Return the final merged list head.",
                ],
                "code": """class Solution {
    public ListNode mergeKLists(ListNode[] lists) {
        if (lists == null || lists.length == 0) return null;
        ListNode head = lists[0];
        for (int i = 1; i < lists.length; i++) {
            head = mergeTwo(head, lists[i]);
        }
        return head;
    }

    private ListNode mergeTwo(ListNode l1, ListNode l2) {
        ListNode dummy = new ListNode(0);
        ListNode curr = dummy;
        while (l1 != null && l2 != null) {
            if (l1.val <= l2.val) {
                curr.next = l1;
                l1 = l1.next;
            } else {
                curr.next = l2;
                l2 = l2.next;
            }
            curr = curr.next;
        }
        curr.next = l1 != null ? l1 : l2;
        return dummy.next;
    }
}
""",
                "time_complexity": "O(k² · n)",
                "time_why": "Merging each list takes time proportional to the accumulated list size across all k lists.",
                "space_complexity": "O(1)",
                "space_why": "Merging is done in place by rewiring existing node pointers.",
                "when_to_use": "Mention it first as the obvious incremental baseline before introducing the min-heap.",
            },
            {
                "name": "Min-heap of active list heads",
                "is_optimal": True,
                "idea": "Track the current head of each list with a min-heap to pick the overall smallest node in O(log k) time.",
                "steps": [
                    "Create a priority queue comparing nodes by their integer values.",
                    "Add the head node of each non-empty list into the heap.",
                    "Create a dummy start node and maintain a tail pointer.",
                    "While the heap is not empty, pull the smallest node and attach it to the tail.",
                    "If the pulled node has a next neighbour, add that next node into the heap.",
                    "Return the next pointer of the dummy node as the merged head.",
                ],
                "code": """import java.util.*;

class Solution {
    public ListNode mergeKLists(ListNode[] lists) {
        if (lists == null || lists.length == 0) return null;
        PriorityQueue<ListNode> heap = new PriorityQueue<>(Comparator.comparingInt(n -> n.val));
        for (ListNode node : lists) {
            if (node != null) heap.add(node);
        }
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        while (!heap.isEmpty()) {
            ListNode node = heap.poll();
            tail.next = node;
            tail = node;
            if (node.next != null) {
                heap.add(node.next);
            }
        }
        tail.next = null;
        return dummy.next;
    }
}
""",
                "time_complexity": "O(N log k)",
                "time_why": "Every one of the N total nodes is added to and removed from a heap of size at most k.",
                "space_complexity": "O(k)",
                "space_why": "The priority queue holds at most k node references simultaneously.",
                "when_to_use": "The classic, optimal interview solution for k-way list merging.",
            },
            {
                "name": "Divide and conquer, merging in pairs",
                "idea": "Pair the lists up and merge each pair, which halves how many lists are left; after log k rounds only one list remains.",
                "steps": [
                    "If the array of lists is empty, return null.",
                    "Take the lists two at a time and merge each pair with the ordinary two-list merge, writing the result back to the front of the array.",
                    "An odd list left over at the end of a round has nothing to pair with, so carry it forward untouched.",
                    "The count of lists halves each round, so repeat until one list is left and return it.",
                ],
                "code": """class Solution {
    public ListNode mergeKLists(ListNode[] lists) {
        if (lists == null || lists.length == 0) return null;
        int remaining = lists.length;
        while (remaining > 1) {
            int written = 0;
            for (int i = 0; i < remaining; i += 2) {
                ListNode second = i + 1 < remaining ? lists[i + 1] : null;
                lists[written++] = mergeTwo(lists[i], second);
            }
            remaining = written;
        }
        return lists[0];
    }

    private ListNode mergeTwo(ListNode a, ListNode b) {
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        while (a != null && b != null) {
            if (a.val <= b.val) {
                tail.next = a;
                a = a.next;
            } else {
                tail.next = b;
                b = b.next;
            }
            tail = tail.next;
        }
        tail.next = a != null ? a : b;
        return dummy.next;
    }
}
""",
                "time_complexity": "O(N log k)",
                "time_why": "Each round moves all N nodes once, and the number of lists halves, so there are log k rounds.",
                "space_complexity": "O(1)",
                "space_why": "Merging rewires the nodes that are already there, and the rounds are a loop, not nested calls.",
                "when_to_use": "When no priority queue is on hand, or comparing two items is expensive and you want plain pairwise compares. It is the shape of an external merge sort, which joins sorted files on disk two at a time.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "lists = [[1, 4, 5], [1, 3, 4], [2, 6]]",
            "columns": ["heap state", "pulled node", "next added", "merged list tail"],
            "rows": [
                ["[1(list0), 1(list1), 2(list2)]", "1(list0)", "4", "1"],
                ["[1(list1), 2(list2), 4(list0)]", "1(list1)", "3", "1 -> 1"],
                ["[2(list2), 3(list1), 4(list0)]", "2(list2)", "6", "1 -> 1 -> 2"],
                ["[3(list1), 4(list0), 6(list2)]", "3(list1)", "4", "1 -> 1 -> 2 -> 3"],
            ],
            "result": "The merged sorted list is 1 -> 1 -> 2 -> 3 -> 4 -> 4 -> 5 -> 6.",
        },
        "mistakes": [
            {
                "name": "The Empty List Trap",
                "wrong": "Pushing list heads into the heap without checking `if (node != null)`.",
                "right": "Filter out null heads before adding them to avoid a null pointer error inside the comparator.",
            },
            {
                "name": "Not clearing tail next pointer",
                "wrong": "Leaving `tail.next` attached to leftover nodes from previous links.",
                "right": "Set `tail.next = null` after the loop finishes to prevent cycle creation.",
            },
            {
                "name": "Comparing node identities instead of values",
                "wrong": "Allowing the priority queue to compare nodes by memory address.",
                "right": "Explicitly pass `Comparator.comparingInt(n -> n.val)` so nodes are ordered by numeric value.",
            },
        ],
        "edge_cases": [
            {"input": "lists = []", "expected": "null", "why": "An empty array of lists returns null."},
            {"input": "lists = [null]", "expected": "null", "why": "An array containing a single empty list returns null."},
            {"input": "lists = [[], [1]]", "expected": "[1]", "why": "A combination of empty and non-empty lists."},
            {"input": "lists = [[1], [0]]", "expected": "[0, 1]", "why": "Two single-element lists merged in order."},
        ],
        "interview_script": [
            "I need to merge k sorted linked lists into a single sorted list.",
            "The obvious way is merging lists one by one, which I can do in O(k² · n) time and O(1) space.",
            "The key point: I know the next smallest node is always one of the k current list heads.",
            "So I keep the k heads in a min-heap, which takes O(N log k) time and O(k) space.",
            "I will test an empty array of lists, lists with null heads, single-element lists, and lists of different lengths.",
        ],
        "follow_ups": [
            {
                "question": "How does the min-heap compare to divide-and-conquer pairing?",
                "answer": "Both take O(N log k) time; heap uses O(k) memory while divide-and-conquer uses O(log k) call stack.",
            },
            {
                "question": "What if data is distributed across multiple machines?",
                "answer": "Each worker machine streams its lowest value to a coordinator maintaining the min-heap.",
            },
            {
                "question": "Can we do this without extra memory if lists can be destructively consumed?",
                "answer": "Divide-and-conquer pairwise merging uses O(log k) stack space and zero auxiliary heap memory.",
            },
        ],
        "related_slugs": ["lc-21", "lc-215", "lc-295"],
    },
    {
        "slugs": ["lc-253"],
        "pattern": "Heap / top K",
        "trigger": "given meeting time intervals, find the minimum number of conference rooms required",
        "summary": (
            "Sort meetings by start time. "
            "Use a min-heap to track the end times of ongoing meetings; if the earliest meeting finishes before the next starts, reuse that room by polling it."
        ),
        "approaches": [
            {
                "name": "Scan open rooms linearly",
                "is_optimal": False,
                "idea": "For each meeting, scan a list of currently open room end times and reuse the first available room.",
                "steps": [
                    "If the input array is empty, return zero.",
                    "Sort all meetings in ascending order by their start times.",
                    "Maintain a list of integers storing the end time of each active room.",
                    "For each meeting, scan the list to find a room whose end time is at or before the meeting start time.",
                    "If an available room is found, update its end time, otherwise append a new room to the list.",
                    "Return the total number of rooms in the list.",
                ],
                "code": """import java.util.*;

class Solution {
    public int minMeetingRooms(int[][] intervals) {
        if (intervals == null || intervals.length == 0) return 0;
        Arrays.sort(intervals, Comparator.comparingInt(a -> a[0]));
        List<Integer> rooms = new ArrayList<>();
        for (int[] m : intervals) {
            int assigned = -1;
            for (int i = 0; i < rooms.size(); i++) {
                if (rooms.get(i) <= m[0]) {
                    assigned = i;
                    break;
                }
            }
            if (assigned != -1) {
                rooms.set(assigned, m[1]);
            } else {
                rooms.add(m[1]);
            }
        }
        return rooms.size();
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Scanning the room list for each meeting takes linear time, leading to quadratic time overall.",
                "space_complexity": "O(n)",
                "space_why": "The list holds up to n room end times in the worst case.",
                "when_to_use": "Mention it first as the simple linear scan before speeding up room search with a heap.",
            },
            {
                "name": "Min-heap of meeting end times",
                "is_optimal": True,
                "idea": "Order meetings by start time and use a min-heap to dynamically track room release times.",
                "steps": [
                    "If the input array is empty, return zero.",
                    "Sort all meetings in ascending order by their start times.",
                    "Create a min-heap of integers to represent room end times.",
                    "For each meeting, if the earliest ending room in the heap ends before or at start time, poll it.",
                    "Add the current meeting end time to the heap.",
                    "Return the size of the heap as the minimum rooms required.",
                ],
                "code": """import java.util.*;

class Solution {
    public int minMeetingRooms(int[][] intervals) {
        if (intervals == null || intervals.length == 0) return 0;
        Arrays.sort(intervals, Comparator.comparingInt(a -> a[0]));
        PriorityQueue<Integer> ends = new PriorityQueue<>();
        for (int[] meeting : intervals) {
            if (!ends.isEmpty() && ends.peek() <= meeting[0]) {
                ends.poll();
            }
            ends.add(meeting[1]);
        }
        return ends.size();
    }
}
""",
                "time_complexity": "O(n log n)",
                "time_why": "Sorting takes O(n log n) and each meeting triggers at most one heap push and poll.",
                "space_complexity": "O(n)",
                "space_why": "In the worst case with all overlapping meetings, the heap stores n end times.",
                "when_to_use": "The optimal interview approach for meeting room scheduling.",
            },
            {
                "name": "Line sweep over start and end times",
                "idea": "Forget which meeting uses which room: walk along the clock and count how many meetings are running at once, because the busiest moment is exactly how many rooms you need.",
                "steps": [
                    "Pull the start times into one array and the end times into another, then sort both on their own.",
                    "Walk the sorted starts with one pointer and the sorted ends with a second pointer.",
                    "Before a meeting begins, free a room for every end time at or before its start, taking one off the running count.",
                    "Add one to the running count for the meeting that just began.",
                    "The largest count seen along the way is the answer.",
                ],
                "code": """import java.util.*;

class Solution {
    public int minMeetingRooms(int[][] intervals) {
        if (intervals == null || intervals.length == 0) return 0;
        int n = intervals.length;
        int[] starts = new int[n];
        int[] ends = new int[n];
        for (int i = 0; i < n; i++) {
            starts[i] = intervals[i][0];
            ends[i] = intervals[i][1];
        }
        Arrays.sort(starts);
        Arrays.sort(ends);
        int running = 0, most = 0, end = 0;
        for (int start = 0; start < n; start++) {
            // A room that frees exactly when the next meeting starts can be reused.
            while (end < n && ends[end] <= starts[start]) {
                running--;
                end++;
            }
            running++;
            most = Math.max(most, running);
        }
        return most;
    }
}
""",
                "time_complexity": "O(n log n)",
                "time_why": "Sorting the two arrays dominates; each pointer then moves forward n times in total.",
                "space_complexity": "O(n)",
                "space_why": "The two arrays of times hold one entry per meeting.",
                "when_to_use": "When the question turns into counting rather than assigning: how many meetings run at once, or when the building is busiest. It is the same sweep Merge Intervals uses, keeping the peak count instead of the blocks.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "intervals = [[0, 30], [5, 10], [15, 20]]",
            "columns": ["meeting [start, end]", "earliest end in heap", "action taken", "heap of ends"],
            "rows": [
                ["[0, 30]", "none", "allocate room 1", "[30]"],
                ["[5, 10]", "30", "5 < 30, conflict: allocate room 2", "[10, 30]"],
                ["[15, 20]", "10", "15 >= 10, reuse room: poll 10, add 20", "[20, 30]"],
            ],
            "result": "The heap size is 2, so 2 rooms are required.",
        },
        "mistakes": [
            {
                "name": "The Back-to-Back Trap",
                "wrong": "Requiring `ends.peek() < meeting[0]` before reusing a room.",
                "right": "Two meetings can share a room if one ends exactly when the other starts: check `<= meeting[0]`.",
            },
            {
                "name": "Sorting by end time instead of start time",
                "wrong": "Sorting intervals by end time, which breaks chronological room allocation.",
                "right": "Sort intervals by start time so meetings are evaluated in the order they begin.",
            },
            {
                "name": "Modifying input intervals without checking null",
                "wrong": "Calling `intervals.length` without checking if the array reference is null.",
                "right": "Guard with `if (intervals == null || intervals.length == 0) return 0;` at the beginning.",
            },
        ],
        "edge_cases": [
            {"input": "intervals = []", "expected": "0", "why": "Zero meetings require zero rooms."},
            {"input": "intervals = [[7, 10]]", "expected": "1", "why": "A single meeting requires one room."},
            {"input": "intervals = [[1, 5], [5, 10]]", "expected": "1", "why": "Consecutive meetings can share the same room."},
            {"input": "intervals = [[1, 10], [2, 9], [3, 8]]", "expected": "3", "why": "All meetings overlap simultaneously."},
        ],
        "interview_script": [
            "I need to find the minimum number of conference rooms required for all meetings.",
            "The obvious way is to check every open room for each meeting, taking O(n²) time and O(n) space.",
            "The key point: I only care about the earliest room to free up, so a min-heap tracks room end times.",
            "So I sort by start time and reuse rooms with a min-heap, taking O(n log n) time and O(n) space.",
            "I will test zero meetings, back-to-back meetings that touch, completely overlapping meetings, and a single meeting.",
        ],
        "follow_ups": [
            {
                "question": "Can we solve this using a sweep-line algorithm?",
                "answer": "Yes, create +1 events for starts and -1 events for ends, sort them, and track maximum prefix sum.",
            },
            {
                "question": "What if each meeting also has a room capacity requirement?",
                "answer": "Track available rooms using a balanced binary search tree or interval tree indexed by room capacity.",
            },
            {
                "question": "Can we solve this with two sorted arrays without a heap?",
                "answer": "Sort start times and end times separately, then advance two pointers to count overlapping intervals.",
            },
        ],
        "related_slugs": ["lc-56", "lc-215", "lc-1046"],
    },
    {
        "slugs": ["lc-295"],
        "pattern": "Heap / top K",
        "trigger": "finding the median of numbers from a continuous stream in real time",
        "summary": (
            "Split numbers into two halves: a max-heap for the smaller half and a min-heap for the larger half. "
            "Keep the two halves balanced so the median sits at the tops of the heaps."
        ),
        "approaches": [
            {
                "name": "Insertion sort into dynamic array",
                "is_optimal": False,
                "idea": "Maintain a sorted list using binary search insertion and compute the median from the middle indices.",
                "steps": [
                    "Maintain a dynamic list to store numbers in sorted order.",
                    "On adding a number, find its insertion position using binary search and insert the value.",
                    "On finding the median, read the middle element if odd, or average the two middle elements if even.",
                ],
                "code": """import java.util.*;

class Solution {
    public double[] process(String[] operations, int[] values) {
        List<Integer> list = new ArrayList<>();
        List<Double> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            if (operations[i].equals("addNum")) {
                int val = values[i];
                int idx = Collections.binarySearch(list, val);
                if (idx < 0) idx = -(idx + 1);
                list.add(idx, val);
            } else if (operations[i].equals("findMedian")) {
                int m = list.size();
                if (m % 2 == 1) {
                    out.add((double) list.get(m / 2));
                } else {
                    out.add((list.get(m / 2 - 1) + list.get(m / 2)) / 2.0);
                }
            }
        }
        double[] arr = new double[out.size()];
        for (int i = 0; i < out.size(); i++) arr[i] = out.get(i);
        return arr;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Inserting an element into an array list takes linear shifting time per operation.",
                "space_complexity": "O(n)",
                "space_why": "The dynamic list stores all n numbers from the stream.",
                "when_to_use": "Mention it first as the simple list baseline before introducing the two-heap pattern.",
            },
            {
                "name": "Two balanced heaps",
                "is_optimal": True,
                "idea": "Split elements into lower and upper halves using a max-heap and min-heap, balancing their sizes.",
                "steps": [
                    "Create a max-heap for the smaller half and a min-heap for the larger half.",
                    "When adding a number, push it to the max-heap, then move the top to the min-heap.",
                    "If the min-heap grows larger than the max-heap, move the top element back to the max-heap.",
                    "When finding the median, return the max-heap top if sizes are odd, or average both tops if even.",
                ],
                "code": """import java.util.*;

class Solution {
    public double[] process(String[] operations, int[] values) {
        MedianFinder finder = new MedianFinder();
        List<Double> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "addNum" -> finder.addNum(values[i]);
                case "findMedian" -> out.add(finder.findMedian());
                default -> {}
            }
        }
        double[] arr = new double[out.size()];
        for (int i = 0; i < out.size(); i++) arr[i] = out.get(i);
        return arr;
    }
}

class MedianFinder {
    private final PriorityQueue<Integer> low = new PriorityQueue<>(Comparator.reverseOrder());
    private final PriorityQueue<Integer> high = new PriorityQueue<>();

    public MedianFinder() {}

    public void addNum(int num) {
        low.add(num);
        high.add(low.poll());
        if (high.size() > low.size()) {
            low.add(high.poll());
        }
    }

    public double findMedian() {
        if (low.size() > high.size()) {
            return low.peek();
        }
        return (low.peek() + high.peek()) / 2.0;
    }
}
""",
                "time_complexity": "O(log n)",
                "time_why": "Adding a number takes O(log n) heap operations and finding the median takes O(1) time.",
                "space_complexity": "O(n)",
                "space_why": "The two heaps together store all n numbers from the stream.",
                "when_to_use": "The optimal interview approach for online median tracking.",
            },
        ],
        "walkthrough": {
            "input": "operations: addNum(1), addNum(2), findMedian(), addNum(3), findMedian()",
            "columns": ["operation", "low max-heap", "high min-heap", "median computed"],
            "rows": [
                ["addNum(1)", "[1]", "[]", "-"],
                ["addNum(2)", "[1]", "[2]", "-"],
                ["findMedian()", "[1]", "[2]", "(1 + 2) / 2.0 = 1.5"],
                ["addNum(3)", "[2, 1]", "[3]", "-"],
                ["findMedian()", "[2, 1]", "[3]", "2.0 (low.peek())"],
            ],
            "result": "The medians computed are 1.5 and 2.0.",
        },
        "mistakes": [
            {
                "name": "The Chopped Half Trap",
                "wrong": "Writing `(low.peek() + high.peek()) / 2` which performs integer truncation.",
                "right": "Divide by `2.0` to return an accurate floating-point double value.",
            },
            {
                "name": "Allowing heap size skew",
                "wrong": "Letting one heap grow more than one element larger than the other.",
                "right": "Rebalance after each insertion so `low.size()` is either equal to or one greater than `high.size()`.",
            },
            {
                "name": "Wrong comparator direction for lower half",
                "wrong": "Using a default min-heap for the lower half numbers.",
                "right": "Use `Comparator.reverseOrder()` so the lower half provides its largest element at the root.",
            },
        ],
        "edge_cases": [
            {"input": "operations = [addNum(1), findMedian()]", "expected": "[1.0]", "why": "A single element stream."},
            {"input": "operations = [addNum(1), addNum(2), findMedian()]", "expected": "[1.5]", "why": "An even number of elements averaged."},
            {"input": "operations = [addNum(-1), addNum(-2), findMedian()]", "expected": "[-1.5]", "why": "Negative numbers averaged correctly."},
            {"input": "operations = [addNum(5), addNum(5), addNum(5), findMedian()]", "expected": "[5.0]", "why": "All identical stream values."},
        ],
        "interview_script": [
            "I need to maintain the median of numbers arriving in a continuous stream.",
            "The obvious way is inserting into a sorted list, taking O(n) time per addition and O(n) space.",
            "The key point: I only need the middle elements, which divide the numbers into lower and upper halves.",
            "So I balance a max-heap for the lower half and a min-heap for the upper half, taking O(log n) time and O(n) space.",
            "I will test a single number stream, even and odd stream lengths, and negative numbers.",
        ],
        "follow_ups": [
            {
                "question": "What if 99% of all numbers from the stream fall between 0 and 100?",
                "answer": "Use a counting bucket array for 0 to 100 to find the median in O(1) time.",
            },
            {
                "question": "How would you find the 90th percentile instead of the median?",
                "answer": "Maintain the two heaps such that the smaller heap holds 90% of elements and the larger holds 10%.",
            },
            {
                "question": "How would you support a remove operation for numbers in the stream?",
                "answer": "Use lazy deletion with a hash map of counts or indexed heaps with node pointers.",
            },
        ],
        "related_slugs": ["lc-215", "lc-23", "lc-1046"],
    },
    {
        "slugs": ["lc-973"],
        "pattern": "Heap / top K",
        "trigger": "finding the k points on a 2D plane closest to the origin",
        "summary": (
            "Keep a max-heap of size k holding the closest points seen so far. "
            "When a new point is closer than the farthest point in the heap, drop the top. The heap retains the k closest points."
        ),
        "approaches": [
            {
                "name": "Sort all points by distance",
                "is_optimal": False,
                "idea": "Sort all points by squared Euclidean distance and return the first k elements.",
                "steps": [
                    "Sort the points array using a distance comparator based on x squared plus y squared.",
                    "Copy the first k elements into a new two-dimensional array.",
                    "Return the resulting array containing the k closest points.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[][] kClosest(int[][] points, int k) {
        Arrays.sort(points, Comparator.comparingInt(p -> p[0] * p[0] + p[1] * p[1]));
        return Arrays.copyOfRange(points, 0, k);
    }
}
""",
                "time_complexity": "O(n log n)",
                "time_why": "Sorting all n points dominates the running time.",
                "space_complexity": "O(log n)",
                "space_why": "The in-place sorting routine uses O(log n) recursion call stack memory.",
                "when_to_use": "Mention it first as the simple sorting baseline before optimizing with a bounded heap.",
            },
            {
                "name": "Max-heap of size k",
                "is_optimal": True,
                "idea": "Use a max-heap of size k to keep the k closest points, evicting farther points as we scan.",
                "steps": [
                    "Create a priority queue comparing points by distance in descending order.",
                    "For each point in the input, add the point to the priority queue.",
                    "If the heap size exceeds k, drop the farthest point from the top.",
                    "Pop all k elements from the heap into a result array.",
                    "Return the result array containing the k closest points.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[][] kClosest(int[][] points, int k) {
        PriorityQueue<int[]> heap = new PriorityQueue<>(
            (a, b) -> Integer.compare(dist(b), dist(a))
        );
        for (int[] point : points) {
            heap.add(point);
            if (heap.size() > k) {
                heap.poll();
            }
        }
        int[][] out = new int[k][];
        for (int i = 0; i < k; i++) {
            out[i] = heap.poll();
        }
        return out;
    }

    private int dist(int[] p) {
        return p[0] * p[0] + p[1] * p[1];
    }
}
""",
                "time_complexity": "O(n log k)",
                "time_why": "We push n points into a heap whose size is bounded by k plus one.",
                "space_complexity": "O(k)",
                "space_why": "The priority queue never holds more than k plus one points.",
                "when_to_use": "The optimal interview approach when k is smaller than n.",
            },
            {
                "name": "Quickselect on the squared distance",
                "idea": "The question does not ask for the k points in order, only for which k they are, so shuffle them around one pivot distance until the k closest happen to sit in the first k slots.",
                "steps": [
                    "Pick one point from the live range at random and take its squared distance as the pivot.",
                    "Move the points around so that closer ones come first, points at the pivot distance sit in the middle, and farther ones go last.",
                    "If the cut after position k falls inside that middle block, the first k slots already hold the k closest, so stop.",
                    "Otherwise narrow the range to the side the cut falls in and pick a new pivot there.",
                    "Return a copy of the first k points.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[][] kClosest(int[][] points, int k) {
        int lo = 0, hi = points.length - 1;
        Random random = new Random(42);
        while (lo < hi) {
            int pivot = dist(points[lo + random.nextInt(hi - lo + 1)]);
            // Three blocks: [lo, lt) closer, [lt, gt] at the pivot distance, (gt, hi] farther.
            int lt = lo, gt = hi, i = lo;
            while (i <= gt) {
                int d = dist(points[i]);
                if (d < pivot) {
                    swap(points, i++, lt++);
                } else if (d > pivot) {
                    swap(points, i, gt--);
                } else {
                    i++;
                }
            }
            if (k <= lt) {
                hi = lt - 1;
            } else if (k > gt + 1) {
                lo = gt + 1;
            } else {
                break;
            }
        }
        return Arrays.copyOfRange(points, 0, k);
    }

    private int dist(int[] p) {
        return p[0] * p[0] + p[1] * p[1];
    }

    private void swap(int[][] a, int i, int j) {
        int[] tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
    }
}
""",
                "time_complexity": "O(n) average, O(n²) worst",
                "time_why": "Each round measures the live range once, and a random pivot cuts that range roughly in half.",
                "space_complexity": "O(1)",
                "space_why": "The points are swapped inside the input array; only the returned copy is new.",
                "when_to_use": "When n is huge and k is close to it, where a heap of size k is no better than sorting. It is the same partition trick as Kth Largest Element, with the distance standing in for the value.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "points = [[1, 3], [-2, 2]], k = 1",
            "columns": ["point", "x^2 + y^2", "heap before", "action taken", "heap after"],
            "rows": [
                ["[1, 3]", "1 + 9 = 10", "[]", "add [1, 3]", "[[1, 3]] (dist 10)"],
                ["[-2, 2]", "4 + 4 = 8", "[[1, 3]]", "add [-2, 2], size > 1, drop [1, 3]", "[[-2, 2]] (dist 8)"],
                ["finish", "-", "[[-2, 2]]", "extract k elements", "[[-2, 2]]"],
            ],
            "result": "The closest point is [[-2, 2]].",
        },
        "mistakes": [
            {
                "name": "The Square Root Trap",
                "wrong": "Calling `Math.sqrt` to calculate distances.",
                "right": "Compare squared distance `x * x + y * y` directly to avoid floating point inaccuracies.",
            },
            {
                "name": "Integer subtraction overflow in comparator",
                "wrong": "Writing `dist(b) - dist(a)` which overflows for large coordinates.",
                "right": "Use `Integer.compare(dist(b), dist(a))` to prevent arithmetic overflow.",
            },
            {
                "name": "Using a min-heap instead of a max-heap",
                "wrong": "Keeping a min-heap which evicts the closest points instead of the farthest.",
                "right": "Use a max-heap so that points farther away are discarded when capacity exceeds k.",
            },
        ],
        "edge_cases": [
            {"input": "points = [[0, 1]], k = 1", "expected": "[[0, 1]]", "why": "A single point with k equals 1."},
            {"input": "points = [[1, 1], [-1, -1]], k = 1", "expected": "[[1, 1]]", "why": "Points with equal distance to the origin."},
            {"input": "points = [[1, 3], [-2, 2]], k = 2", "expected": "[[-2, 2], [1, 3]]", "why": "The value k equals the array length, returning all points."},
            {"input": "points = [[0, 0], [1, 1]], k = 1", "expected": "[[0, 0]]", "why": "A point sitting directly on the origin."},
        ],
        "interview_script": [
            "I need to find the k closest points to the origin on a two-dimensional plane.",
            "The obvious way is sorting all points by distance, which I can do in O(n log n) time and O(log n) space.",
            "The key point: I compare squared distances to avoid square roots, and a max-heap keeps only the k best.",
            "So I push each point into a max-heap of size k, taking O(n log k) time and O(k) space.",
            "I will test a single point, points with identical distances, k equal to the array length, and points with negative coordinates.",
        ],
        "follow_ups": [
            {
                "question": "How would you solve this in O(n) average time?",
                "answer": "Use Quickselect on the squared distances to partition the k closest points into the first k slots.",
            },
            {
                "question": "What if points arrive continuously from a data stream?",
                "answer": "The bounded max-heap of size k handles streaming data seamlessly with O(k) memory.",
            },
            {
                "question": "What if distance is measured using Manhattan distance?",
                "answer": "Change the metric function to absolute value sum `Math.abs(x) + Math.abs(y)` with the same heap logic.",
            },
        ],
        "related_slugs": ["lc-215", "lc-1046", "lc-295"],
    },
]
