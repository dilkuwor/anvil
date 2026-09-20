"""Stack problems. See SOLUTION_GUIDE.md in this folder."""

from __future__ import annotations

SOLUTIONS: list[dict] = [
    {
        "slugs": ["balanced-brackets"],
        "pattern": "Stack",
        "trigger": "A string of brackets, and you must say whether every opener is closed in the right order.",
        "summary": (
            "Read left to right and keep openers on a stack. A closer must match the most recent unmatched opener. "
            "At the end the stack must be empty."
        ),
        "approaches": [
            {
                "name": "Strip matching pairs until nothing changes",
                "idea": "Repeatedly delete every \"()\", \"[]\", and \"{}\". Leftovers mean the string was not balanced.",
                "steps": [
                    "While the string still changes, replace \"()\", \"[]\", and \"{}\" with empty.",
                    "Each pass removes the innermost matching pairs.",
                    "If nothing is left, the brackets were balanced. Leftovers mean they were not.",
                ],
                "code": """class Solution {
    public boolean isValid(String s) {
        String prev = "";
        while (!s.equals(prev)) {
            prev = s;
            s = s.replace("()", "").replace("[]", "").replace("{}", "");
        }
        return s.isEmpty();
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Each pass copies the whole string, and a long nesting needs a pass per pair.",
                "space_complexity": "O(n)",
                "space_why": "Each replace builds a new string up to the length of s.",
                "when_to_use": "Say it. Fine on a short string. Do not code it in an interview.",
                "is_optimal": False,
            },
            {
                "name": "Stack of openers",
                "idea": "The closer you just read must match the opener that is still waiting on top of the stack.",
                "steps": [
                    "Read left to right. Push '(', '[', or '{'.",
                    "On a closer, the stack must hold the matching opener: pop it. Empty or a mismatch is false.",
                    "At the end the stack must be empty, so every opener got a closer.",
                ],
                "code": """import java.util.*;

class Solution {
    public boolean isValid(String s) {
        Deque<Character> st = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '[' || c == '{') {
                st.push(c);
            } else {
                if (st.isEmpty()) return false;
                char o = st.pop();
                if ((c == ')' && o != '(') || (c == ']' && o != '[') || (c == '}' && o != '{')) {
                    return false;
                }
            }
        }
        return st.isEmpty();
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each character is pushed or popped at most once.",
                "space_complexity": "O(n)",
                "space_why": "The stack holds unmatched openers, at most the whole string.",
                "when_to_use": "The version to write. One pass.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": 's = "([)]"',
            "columns": ["char", "stack", "action"],
            "rows": [
                ["(", "[(]", "push opener"],
                ["[", "[(][", "push opener"],
                [")", "[(]", "pop [, but ) does not match ["],
            ],
            "result": "The answer is false: the closer does not match the latest opener.",
        },
        "mistakes": [
            {
                "name": "Counting kinds, ignoring order",
                "wrong": "A counter per kind, so \"([)]\" looks fine because each closer has an opener.",
                "right": "Order matters. The closer must match the latest unmatched opener, which a stack holds.",
            },
            {
                "name": "Leaving the stack unchecked",
                "wrong": "Returning true as soon as every closer matched, while openers are still on the stack.",
                "right": "Return `st.isEmpty()`. Leftover openers were never closed.",
            },
            {
                "name": "Popping an empty stack",
                "wrong": "Calling pop on the first closer, like \"]\".",
                "right": "If the stack is empty on a closer, return false.",
            },
        ],
        "edge_cases": [
            {"input": '"()"', "expected": "true", "why": "One matching pair."},
            {"input": '"(]"', "expected": "false", "why": "Wrong kind of closer."},
            {"input": '"([)]"', "expected": "false", "why": "Crossed pairs: counts match, order does not."},
            {"input": '"]"', "expected": "false", "why": "A closer with no opener."},
            {"input": '"{[]}"', "expected": "true", "why": "Nested pairs, inner first."},
        ],
        "interview_script": [
            "I need to say whether every bracket in s closes in the right order.",
            "I could keep deleting (), [], and {} until the string stops changing. That is O(n²).",
            "The key point: I match each closer with the latest opener that is still open.",
            "So I push openers on a stack and pop on a closer. Empty or a mismatch is false. The stack must finish empty.",
            "That is O(n) time. I will test a crossing like ([)], a lone closer, and nested {[]}.",
        ],
        "follow_ups": [
            {
                "question": "Only one kind of bracket.",
                "answer": "A counter is enough: plus on open, minus on close, never negative, end at 0.",
            },
            {
                "question": "Return the index of the first mismatch.",
                "answer": "Store indices on the stack. On a bad closer, return that index. Leftover openers: the first leftover index.",
            },
            {
                "question": "The string also holds letters.",
                "answer": "Skip letters. Only push and match the six bracket characters.",
            },
        ],
        "related_slugs": ["lc-20", "lc-394", "lc-22"],
    },
    {
        "slugs": ["lc-150"],
        "pattern": "Stack",
        "trigger": "Evaluate a reverse Polish (postfix) expression: numbers, then an operator that uses the last two values.",
        "summary": (
            "Push numbers. An operator pops the right operand, then the left, applies the operator, and pushes the result. "
            "Integer divide truncates toward 0."
        ),
        "approaches": [
            {
                "name": "Rewrite the token list in place",
                "idea": "Find the first operator, replace it and the two values before it with the result, and repeat.",
                "steps": [
                    "Copy the tokens into a list.",
                    "Scan left for the first + - * /. The two tokens before it are left then right.",
                    "Replace those three tokens with the result, then scan again.",
                    "When one token remains, parse it.",
                ],
                "code": """import java.util.*;

class Solution {
    public int evalRPN(String[] tokens) {
        List<String> list = new ArrayList<>(Arrays.asList(tokens));
        while (list.size() > 1) {
            for (int i = 0; i < list.size(); i++) {
                String t = list.get(i);
                if (t.equals("+") || t.equals("-") || t.equals("*") || t.equals("/")) {
                    int left = Integer.parseInt(list.get(i - 2));
                    int right = Integer.parseInt(list.get(i - 1));
                    int v = switch (t) {
                        case "+" -> left + right;
                        case "-" -> left - right;
                        case "*" -> left * right;
                        default -> left / right;
                    };
                    list.subList(i - 2, i + 1).clear();
                    list.add(i - 2, String.valueOf(v));
                    break;
                }
            }
        }
        return Integer.parseInt(list.get(0));
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Each operator forces a new left-to-right scan of the shrinking list.",
                "space_complexity": "O(n)",
                "space_why": "The list holds the tokens and each partial result.",
                "when_to_use": "Say it to show you know postfix is left to right. Then use a stack.",
                "is_optimal": False,
            },
            {
                "name": "Stack of numbers",
                "idea": "Numbers wait on a stack. An operator consumes the top two, right first, and pushes the result.",
                "steps": [
                    "Read tokens left to right.",
                    "A number is pushed.",
                    "An operator pops right, then left, applies + - * /, and pushes that value.",
                    "The last value on the stack is the answer.",
                ],
                "code": """import java.util.*;

class Solution {
    public int evalRPN(String[] tokens) {
        Deque<Integer> stack = new ArrayDeque<>();
        for (String token : tokens) {
            switch (token) {
                case "+", "-", "*", "/" -> {
                    int right = stack.pop();
                    int left = stack.pop();
                    stack.push(switch (token) {
                        case "+" -> left + right;
                        case "-" -> left - right;
                        case "*" -> left * right;
                        default -> left / right;
                    });
                }
                default -> stack.push(Integer.parseInt(token));
            }
        }
        return stack.pop();
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each token is pushed once and popped at most once.",
                "space_complexity": "O(n)",
                "space_why": "The stack holds numbers that have not been used yet.",
                "when_to_use": "The version to write. One pass.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": 'tokens = ["2","1","+","3","*"]',
            "columns": ["token", "action", "stack"],
            "rows": [
                ["2", "push number", "[2]"],
                ["1", "push number", "[2, 1]"],
                ["+", "pop 1 then 2, push 2+1=3", "[3]"],
                ["3", "push number", "[3, 3]"],
                ["*", "pop 3 then 3, push 9", "[9]"],
            ],
            "result": "The answer is 9, from (2 + 1) * 3.",
        },
        "mistakes": [
            {
                "name": "Operand order",
                "wrong": "Popping left first, then right, so 4 13 5 / + becomes 5/13.",
                "right": "Pop right first, then left. Subtraction and division are not symmetric.",
            },
            {
                "name": "Flooring a negative divide",
                "wrong": "Using a floor-toward-minus-infinity divide, so -7/2 becomes -4.",
                "right": "Java `/` truncates toward 0, so -7/2 is -3. Do not use `Math.floorDiv`.",
            },
            {
                "name": "Treating a negative as an operator",
                "wrong": "Switching on the first character, so \"-7\" is read as minus.",
                "right": "Only the four tokens `+ - * /` are operators. Everything else is `Integer.parseInt`.",
            },
        ],
        "edge_cases": [
            {"input": '["2","1","+","3","*"]', "expected": "9", "why": "(2+1)*3."},
            {"input": '["4","13","5","/","+"]', "expected": "6", "why": "Right operand is on top: 13/5, then +4."},
            {"input": '["-7","2","/"]', "expected": "-3", "why": "Truncate toward 0, not toward minus infinity."},
            {
                "input": '["10","6","9","3","+","-11","*","/","*","17","+","5","+"]',
                "expected": "22",
                "why": "A longer mix of minus, times, and divide.",
            },
        ],
        "interview_script": [
            "I am given postfix tokens and I need the integer value.",
            "I could scan the list, replace the first operator and its two values with the result, and repeat. That is O(n²).",
            "The key point: I apply an operator to the two most recent unused numbers, right on top.",
            "So I push numbers. On an operator I pop right, then left, and push the result. Divide truncates toward 0.",
            "That is O(n) time. I will test a negative divide and a case like 4 13 5 / +.",
        ],
        "follow_ups": [
            {
                "question": "The expression is infix with + and *.",
                "answer": "That is Basic Calculator II: apply * and / as you go, and keep + and - as signed numbers on a stack.",
            },
            {
                "question": "There may be parentheses.",
                "answer": "Use two stacks, or recurse inside each pair. That is Basic Calculator I.",
            },
            {
                "question": "Return the expression tree, not the value.",
                "answer": "The stack holds nodes. An operator pops two children and pushes a new parent.",
            },
        ],
        "related_slugs": ["lc-227", "lc-394", "lc-71"],
    },
    {
        "slugs": ["lc-155"],
        "pattern": "Design: min stack",
        "trigger": "A stack that must also return the current minimum, and every call should take one step.",
        "summary": (
            "Store each value with the minimum of the stack at that depth. "
            "Push, pop, top, and getMin then all read or write the top pair."
        ),
        "approaches": [
            {
                "name": "Scan for the min on every getMin",
                "idea": "A normal stack of values. getMin walks the whole stack.",
                "steps": [
                    "push, pop, and top use a normal stack of ints.",
                    "On getMin, walk every value and keep the smallest.",
                    "Correct, but each getMin rereads the whole stack.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[] process(String[] operations, int[] values) {
        MinStack stack = new MinStack();
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "push" -> stack.push(values[i]);
                case "pop" -> stack.pop();
                case "top" -> out.add(stack.top());
                case "getMin" -> out.add(stack.getMin());
                default -> {}
            }
        }
        int[] arr = new int[out.size()];
        for (int i = 0; i < out.size(); i++) arr[i] = out.get(i);
        return arr;
    }
}

class MinStack {
    private final Deque<Integer> stack = new ArrayDeque<>();

    public MinStack() {}

    public void push(int val) {
        stack.push(val);
    }

    public void pop() {
        stack.pop();
    }

    public int top() {
        return stack.peek();
    }

    public int getMin() {
        int min = Integer.MAX_VALUE;
        for (int x : stack) min = Math.min(min, x);
        return min;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "getMin walks every value still on the stack.",
                "space_complexity": "O(n)",
                "space_why": "The stack stores each pushed value.",
                "when_to_use": "Say it. Then store the running min so getMin is one read.",
                "is_optimal": False,
            },
            {
                "name": "Each value stores the min at that depth",
                "idea": "Push (val, min(val, min below)). The top pair's second field is getMin.",
                "steps": [
                    "The stack holds pairs: the value, and the min of the stack including that value.",
                    "On push, the new min is val if the stack is empty, else min(val, the min on top).",
                    "pop, top, and getMin all use the top pair: value at [0], min at [1].",
                ],
                "code": """import java.util.*;

class Solution {
    public int[] process(String[] operations, int[] values) {
        MinStack stack = new MinStack();
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "push" -> stack.push(values[i]);
                case "pop" -> stack.pop();
                case "top" -> out.add(stack.top());
                case "getMin" -> out.add(stack.getMin());
                default -> {}
            }
        }
        int[] arr = new int[out.size()];
        for (int i = 0; i < out.size(); i++) arr[i] = out.get(i);
        return arr;
    }
}

class MinStack {
    private final Deque<int[]> stack = new ArrayDeque<>();

    public MinStack() {}

    public void push(int val) {
        int min = stack.isEmpty() ? val : Math.min(val, stack.peek()[1]);
        stack.push(new int[] {val, min});
    }

    public void pop() {
        stack.pop();
    }

    public int top() {
        return stack.peek()[0];
    }

    public int getMin() {
        return stack.peek()[1];
    }
}
""",
                "time_complexity": "O(1)",
                "time_why": "Each call only reads or writes the top pair.",
                "space_complexity": "O(n)",
                "space_why": "One pair per pushed value.",
                "when_to_use": "The version to write. One stack, no scan.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "push -2, push 0, push -3, getMin, pop, top, getMin",
            "columns": ["op", "stack (val, min)", "out"],
            "rows": [
                ["push -2", "[(-2, -2)]", "-"],
                ["push 0", "[(-2, -2), (0, -2)]", "-"],
                ["push -3", "[(-2, -2), (0, -2), (-3, -3)]", "-"],
                ["getMin", "same", "-3"],
                ["pop", "[(-2, -2), (0, -2)]", "-"],
                ["top", "same", "0"],
                ["getMin", "same", "-2"],
            ],
            "result": "The recorded answers are [-3, 0, -2].",
        },
        "mistakes": [
            {
                "name": "One min field that never comes back",
                "wrong": "A single `min` variable. After you pop the min, you have forgotten the min below it.",
                "right": "Store the running min with every value, so a pop restores the min below.",
            },
            {
                "name": "Updating min only when val is strictly smaller",
                "wrong": "Skipping a second copy of the same min, then popping the first copy loses getMin.",
                "right": "The pair's min is `Math.min(val, peek min)`, so equal mins are kept.",
            },
            {
                "name": "Empty stack on the first push",
                "wrong": "Reading `peek()` to compute the min before anything is pushed.",
                "right": "If the stack is empty, the new min is val itself.",
            },
        ],
        "edge_cases": [
            {
                "input": '["MinStack","push","push","push","getMin","pop","top","getMin"]\n[0,-2,0,-3,0,0,0,0]',
                "expected": "[-3,0,-2]",
                "why": "A new min is pushed, then popped, and the old min returns.",
            },
            {
                "input": '["MinStack","push","push","getMin","top"]\n[0,1,2,0,0]',
                "expected": "[1,2]",
                "why": "The min is below the top.",
            },
            {
                "input": '["MinStack","push","push","getMin","pop","getMin"]\n[0,0,0,0,0,0]',
                "expected": "[0,0]",
                "why": "Two copies of the same min.",
            },
            {
                "input": '["MinStack","push","getMin","top"]\n[0,5,0,0]',
                "expected": "[5,5]",
                "why": "One value: top and min are the same.",
            },
        ],
        "interview_script": [
            "I need a stack that also returns the current minimum, and each call should take one step.",
            "I could scan the whole stack on getMin. That is O(n) per call.",
            "The key point: I store the min at each depth, so it never needs a value that sits above it.",
            "So I push each value with the min of the stack at that time. pop, top, and getMin all use the top pair.",
            "That is O(1) per call and O(n) space. I will test a new min, a duplicate min, and getMin after popping the min.",
        ],
        "follow_ups": [
            {
                "question": "Use two stacks instead of pairs.",
                "answer": "A value stack and a min stack. Push onto mins when val is <= the current min, and pop mins when that value leaves.",
            },
            {
                "question": "getMin on a queue, not a stack.",
                "answer": "A queue is FIFO, so a running min on the back is not enough. Use a deque of candidates, as in sliding-window maximum.",
            },
            {
                "question": "Constant extra space besides the values.",
                "answer": "Encode the min into the stored value with differences. Easy to get wrong; pairs are the interview answer.",
            },
        ],
        "related_slugs": ["minimum-tracker-stack", "lc-895", "lc-146"],
    },
    {
        "slugs": ["lc-20"],
        "pattern": "Stack",
        "trigger": "A string of (), [], {}, and you must say whether they close in the right order.",
        "summary": (
            "Push the closer each opener expects. A closer must equal the top of the stack. "
            "The stack must be empty at the end."
        ),
        "approaches": [
            {
                "name": "Strip matching pairs until nothing changes",
                "idea": "Repeatedly delete every \"()\", \"[]\", and \"{}\". Leftovers mean the string was not valid.",
                "steps": [
                    "While the string still changes, replace \"()\", \"[]\", and \"{}\" with empty.",
                    "Each pass removes the innermost matching pairs.",
                    "If nothing is left, the string is valid.",
                ],
                "code": """class Solution {
    public boolean isValid(String s) {
        String prev = "";
        while (!s.equals(prev)) {
            prev = s;
            s = s.replace("()", "").replace("[]", "").replace("{}", "");
        }
        return s.isEmpty();
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Each pass copies the whole string, and deep nesting needs a pass per pair.",
                "space_complexity": "O(n)",
                "space_why": "Each replace builds a new string up to the length of s.",
                "when_to_use": "Say it. Then a stack.",
                "is_optimal": False,
            },
            {
                "name": "Push the expected closer",
                "idea": "An opener writes the closer it wants. A closer must be exactly that character on top.",
                "steps": [
                    "On '(', push ')'. On '[', push ']'. On '{', push '}'.",
                    "On a closer, the stack must be non-empty and pop must equal this character.",
                    "At the end the stack must be empty.",
                ],
                "code": """import java.util.*;

class Solution {
    public boolean isValid(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            switch (c) {
                case '(' -> stack.push(')');
                case '[' -> stack.push(']');
                case '{' -> stack.push('}');
                default -> {
                    if (stack.isEmpty() || stack.pop() != c) return false;
                }
            }
        }
        return stack.isEmpty();
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each character is pushed or popped at most once.",
                "space_complexity": "O(n)",
                "space_why": "The stack holds one expected closer per unmatched opener.",
                "when_to_use": "The version to write. The pop check is one comparison.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": 's = "{[]}"',
            "columns": ["char", "stack", "action"],
            "rows": [
                ["{", "[}]", "push the closer this opener wants"],
                ["[", "[}][]]", "push ]"],
                ["]", "[}]", "pop, matches ]"],
                ["}", "[]", "pop, matches }"],
            ],
            "result": "The stack is empty, so the answer is true.",
        },
        "mistakes": [
            {
                "name": "Crossing pairs",
                "wrong": "Accepting \"([)]\" because each kind has a match somewhere.",
                "right": "The closer must equal the top of the stack, which is the latest unmatched opener's closer.",
            },
            {
                "name": "Not checking empty before pop",
                "wrong": "Calling pop on a leading closer.",
                "right": "If the stack is empty on a closer, return false.",
            },
            {
                "name": "Ignoring leftover openers",
                "wrong": "Returning true after the loop without checking the stack.",
                "right": "Return `stack.isEmpty()`.",
            },
        ],
        "edge_cases": [
            {"input": '"()"', "expected": "true", "why": "One pair."},
            {"input": '"()[]{}"', "expected": "true", "why": "Several pairs in a row."},
            {"input": '"(]"', "expected": "false", "why": "Wrong closer."},
            {"input": '"([)]"', "expected": "false", "why": "Crossed pairs."},
            {"input": '"{[]}"', "expected": "true", "why": "Nested, inner pair first."},
        ],
        "interview_script": [
            "I need to say whether the brackets in s close in the right order.",
            "I could keep deleting matching pairs until the string stops changing. That is O(n²).",
            "The key point: I match each closer with the latest opener that is still open.",
            "So I push the closer each opener wants, and a closer must equal a pop. The stack must finish empty.",
            "That is O(n) time. I will test ([)], a lone closer, and nested {[]}.",
        ],
        "follow_ups": [
            {
                "question": "Only parentheses, no square or curly.",
                "answer": "A running count works: never negative, end at 0. Mixed kinds still need a stack.",
            },
            {
                "question": "Longest valid substring, not a yes/no.",
                "answer": "Store indices on the stack. When a pair closes, the gap to the new top is a valid length.",
            },
            {
                "question": "Generate every valid string of n pairs.",
                "answer": "That is Generate Parentheses: backtracking with an open count and a close count.",
            },
        ],
        "related_slugs": ["balanced-brackets", "lc-394", "lc-22"],
    },
    {
        "slugs": ["lc-227"],
        "pattern": "Stack",
        "trigger": "Evaluate an infix string of + - * / with no parentheses, and * / bind tighter than + -.",
        "summary": (
            "Keep the last operator. On a new operator (or the end), apply the last one: + and - push a signed number, "
            "* and / combine with the top. Then add the stack."
        ),
        "approaches": [
            {
                "name": "Split the string on the last + or -",
                "idea": "Find the last + or -, evaluate the left as + -, the right as * /, then combine. Copies the string at every operator.",
                "steps": [
                    "Drop spaces. Search from the right for a + or -.",
                    "The left substring is another + - problem. The right substring is only * and /.",
                    "If there is no + or -, search from the right for * or / and split there.",
                    "A piece with no operator is an integer.",
                ],
                "code": """class Solution {
    public int calculate(String s) {
        return evalAdd(s.replace(" ", ""));
    }

    private int evalAdd(String s) {
        for (int i = s.length() - 1; i >= 0; i--) {
            char c = s.charAt(i);
            if (c == '+' || c == '-') {
                int left = evalAdd(s.substring(0, i));
                int right = evalMul(s.substring(i + 1));
                return c == '+' ? left + right : left - right;
            }
        }
        return evalMul(s);
    }

    private int evalMul(String s) {
        for (int i = s.length() - 1; i >= 0; i--) {
            char c = s.charAt(i);
            if (c == '*' || c == '/') {
                int left = evalMul(s.substring(0, i));
                int right = Integer.parseInt(s.substring(i + 1));
                return c == '*' ? left * right : left / right;
            }
        }
        return Integer.parseInt(s);
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Each operator copies the left and right pieces, and a long sum copies almost all of s each time.",
                "space_complexity": "O(n)",
                "space_why": "Each split holds a new substring, and the call depth follows the operators.",
                "when_to_use": "Say it to show precedence: + - split last. Then one stack, no copies.",
                "is_optimal": False,
            },
            {
                "name": "One stack, apply * / now",
                "idea": "Remember the last operator. + and - push a signed number. * and / update the top at once.",
                "steps": [
                    "operator starts as '+'. Build the current number digit by digit. Skip spaces.",
                    "When you hit a new operator, or the last character, apply the remembered operator to that number.",
                    "+ pushes the number, - pushes -number, * and / pop and push the product or quotient.",
                    "Then set operator to this character and reset the number. At the end, add the stack.",
                ],
                "code": """import java.util.*;

class Solution {
    public int calculate(String s) {
        Deque<Integer> stack = new ArrayDeque<>();
        int number = 0;
        char operator = '+';
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (Character.isDigit(c)) number = number * 10 + (c - '0');
            if ((!Character.isDigit(c) && c != ' ') || i == s.length() - 1) {
                switch (operator) {
                    case '+' -> stack.push(number);
                    case '-' -> stack.push(-number);
                    case '*' -> stack.push(stack.pop() * number);
                    default -> stack.push(stack.pop() / number);
                }
                operator = c;
                number = 0;
            }
        }
        int total = 0;
        while (!stack.isEmpty()) total += stack.pop();
        return total;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each character is read once, and each number is pushed and popped at most once.",
                "space_complexity": "O(n)",
                "space_why": "The stack holds one signed number per + or - term.",
                "when_to_use": "The version to write. One pass, no second list of operators.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": 's = "3+2*2"',
            "columns": ["i", "char", "last op", "number", "stack", "apply"],
            "rows": [
                ["0", "3", "+", "3", "[]", "still building"],
                ["1", "+", "+", "0", "[3]", "+ pushes 3, last op becomes +"],
                ["2", "2", "+", "2", "[3]", "still building"],
                ["3", "*", "+", "0", "[3, 2]", "+ pushes 2, last op becomes *"],
                ["4", "2", "*", "2", "[3, 4]", "end: pop 2 * 2, push 4"],
            ],
            "result": "The stack sums to 7.",
        },
        "mistakes": [
            {
                "name": "Left to right with no precedence",
                "wrong": "Doing 3+2*2 as (3+2)*2 = 10.",
                "right": "Apply * and / when you see them. + and - wait as signed numbers.",
            },
            {
                "name": "Dropping the last number",
                "wrong": "Only applying an operator when you see the next operator, so a string that ends on a digit is ignored.",
                "right": "Treat the last index like an operator: apply the remembered operator to the number you just built.",
            },
            {
                "name": "Integer divide of a subtraction",
                "wrong": "Computing 14-3/2 as 5, or as a float.",
                "right": "3/2 is 1 toward 0, then 14-1=13. The stack holds 14 and then -3/2 = -1.",
            },
        ],
        "edge_cases": [
            {"input": '"3+2*2"', "expected": "7", "why": "* binds tighter than +."},
            {"input": '" 3/2 "', "expected": "1", "why": "Spaces, and integer divide toward 0."},
            {"input": '" 3+5 / 2 "', "expected": "5", "why": "Spaces around both operators."},
            {"input": '"14-3/2"', "expected": "13", "why": "Minus a quotient, not (14-3)/2."},
        ],
        "interview_script": [
            "I need to evaluate + - * / with no parentheses. * and / bind tighter, and divide truncates toward 0.",
            "I could split the string on the last + or - and recurse. That is O(n²) because each split copies s.",
            "The key point: I remember the last operator and apply it when the next operator (or the end) arrives.",
            "I push a signed number for + and -, and I combine with the top for * and /. Then I add the stack.",
            "That is O(n) time. I will test spaces, 3+2*2, and 14-3/2.",
        ],
        "follow_ups": [
            {
                "question": "Parentheses are allowed.",
                "answer": "Recurse on a '(', and return from a ')'. The same last-operator stack works inside each level.",
            },
            {
                "question": "The numbers can be negative with a unary minus.",
                "answer": "Treat a minus after an operator or at the start as a sign on the number, not as a binary minus.",
            },
            {
                "question": "Return the postfix tokens instead of the value.",
                "answer": "That is the shunting-yard path into Evaluate Reverse Polish Notation.",
            },
        ],
        "related_slugs": ["lc-150", "lc-8", "lc-394"],
    },
    {
        "slugs": ["lc-394"],
        "pattern": "Stack",
        "trigger": "A nested encoded string of the form k[substring], and you must expand every repeat.",
        "summary": (
            "On '[' park the count and the text so far. Decode the inside. On ']' repeat that inside and add it "
            "onto the parked text."
        ),
        "approaches": [
            {
                "name": "Expand the innermost k[inner] and repeat",
                "idea": "Find the first ']', take the k[inner] that ends there, replace it with the repeated inner text, and loop.",
                "steps": [
                    "While s still holds a '[', find the first ']'.",
                    "Walk left to the matching '[' and then over the digits of k.",
                    "Build the inner text repeated k times, and splice it into s in place of k[inner].",
                    "When no '[' remains, s is decoded.",
                ],
                "code": """class Solution {
    public String decodeString(String s) {
        while (s.indexOf('[') >= 0) {
            int close = s.indexOf(']');
            int open = s.lastIndexOf('[', close);
            int i = open - 1;
            while (i >= 0 && Character.isDigit(s.charAt(i))) i--;
            int k = Integer.parseInt(s.substring(i + 1, open));
            String inner = s.substring(open + 1, close);
            StringBuilder repeated = new StringBuilder();
            for (int t = 0; t < k; t++) repeated.append(inner);
            s = s.substring(0, i + 1) + repeated + s.substring(close + 1);
        }
        return s;
    }
}
""",
                "time_complexity": "O(n · L)",
                "time_why": "Each expansion copies the current string, and nested repeats expand in layers (L is the decoded length).",
                "space_complexity": "O(L)",
                "space_why": "Each new copy of s grows toward the decoded text.",
                "when_to_use": "Say it. Then one pass with two stacks, no splicing.",
                "is_optimal": False,
            },
            {
                "name": "Two stacks: counts and texts",
                "idea": "'[' parks the current count and the current text. ']' repeats the inner text onto the parked text.",
                "steps": [
                    "Digits build count. Letters append to current.",
                    "On '[', push count and current, then reset both.",
                    "On ']', pop the outer text and the repeat. Append current that many times onto the outer text.",
                    "That outer text becomes current. At the end, current is the answer.",
                ],
                "code": """import java.util.*;

class Solution {
    public String decodeString(String s) {
        Deque<Integer> counts = new ArrayDeque<>();
        Deque<StringBuilder> texts = new ArrayDeque<>();
        StringBuilder current = new StringBuilder();
        int count = 0;
        for (char c : s.toCharArray()) {
            if (Character.isDigit(c)) {
                count = count * 10 + (c - '0');
            } else if (c == '[') {
                counts.push(count);
                texts.push(current);
                count = 0;
                current = new StringBuilder();
            } else if (c == ']') {
                StringBuilder outer = texts.pop();
                int repeat = counts.pop();
                for (int k = 0; k < repeat; k++) outer.append(current);
                current = outer;
            } else {
                current.append(c);
            }
        }
        return current.toString();
    }
}
""",
                "time_complexity": "O(n + L)",
                "time_why": "Each character of s is processed once, and each output letter is appended once.",
                "space_complexity": "O(n + L)",
                "space_why": "The stacks follow the nesting, and the builders hold the decoded text.",
                "when_to_use": "The version to write. No shared index, one left-to-right pass.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": 's = "3[a2[c]]"',
            "columns": ["read", "action", "counts", "current", "texts"],
            "rows": [
                ["3 [", "park 3 and empty text", "[3]", "", "[empty]"],
                ["a", "append", "[3]", "a", "[empty]"],
                ["2 [", "park 2 and a", "[3, 2]", "", "[empty, a]"],
                ["c", "append", "[3, 2]", "c", "[empty, a]"],
                ["]", "c x 2 onto a", "[3]", "acc", "[empty]"],
                ["]", "acc x 3 onto empty", "[]", "accaccacc", "[]"],
            ],
            "result": "The answer is accaccacc.",
        },
        "mistakes": [
            {
                "name": "Single-digit counts only",
                "wrong": "Setting count = c - '0' instead of multiplying by 10, so 100[leetcode] repeats once.",
                "right": "`count = count * 10 + (c - '0')`, and reset count to 0 on '['.",
            },
            {
                "name": "Appending after ']' to the inner builder",
                "wrong": "Leaving `current` as the inner text, so the next letters attach inside the last repeat.",
                "right": "After a ']', current becomes the outer builder you just popped and extended.",
            },
            {
                "name": "Forgetting nested brackets",
                "wrong": "Finding the matching ']' with a scan that ignores nesting, so 3[a2[c]] is split wrong.",
                "right": "Let '[' push a new current. Nesting is the stack.",
            },
        ],
        "edge_cases": [
            {"input": '"3[a]2[bc]"', "expected": '"aaabcbc"', "why": "Two repeats side by side."},
            {"input": '"3[a2[c]]"', "expected": '"accaccacc"', "why": "A repeat nested inside a repeat."},
            {"input": '"2[abc]3[cd]ef"', "expected": '"abcabccdcdcdef"', "why": "Letters after the last bracket stay as they are."},
            {"input": '"100[leetcode]"', "expected": "100 copies of leetcode", "why": "A three-digit count."},
        ],
        "interview_script": [
            "I need to expand k[substring], and the repeats can nest.",
            "I could keep expanding the innermost k[inner] by splicing the string. That is O(n · L).",
            "The key point: I park the count and the text on '[', and on ']' I repeat the inner text onto that parked text.",
            "So I keep a stack of counts and a stack of texts, plus the current builder.",
            "That is O(n + L) time. I will test a nested case, a multi-digit count, and letters after the last bracket.",
        ],
        "follow_ups": [
            {
                "question": "k can be 0.",
                "answer": "The same loop: repeat 0 times appends nothing. Still push and pop on the brackets.",
            },
            {
                "question": "The encoding uses nested braces of several kinds.",
                "answer": "The same two stacks. You only need to match each opener with its own closer.",
            },
            {
                "question": "Stream the output without building one huge string.",
                "answer": "You still have to expand inner repeats before outer ones. A stack of readers can yield letters one by one.",
            },
        ],
        "related_slugs": ["lc-20", "lc-71", "lc-227"],
    },
    {
        "slugs": ["lc-71"],
        "pattern": "Stack",
        "trigger": "A Unix path with slashes, '.', and '..', and you must return the simplified absolute path.",
        "summary": (
            "Split on slash, skip empty parts and '.', and pop the last folder on '..' if there is one. "
            "Join what remains with a leading slash."
        ),
        "approaches": [
            {
                "name": "Build a string and cut on '..'",
                "idea": "Walk the parts. A folder name is appended. '..' cuts back to the previous slash.",
                "steps": [
                    "Split the path on '/'.",
                    "Skip the empty parts and '.'.",
                    "On '..', cut `out` back to its last '/', or to empty if none.",
                    "Otherwise append '/' and the folder name. If out is empty at the end, return '/'.",
                ],
                "code": """class Solution {
    public String simplifyPath(String path) {
        String[] parts = path.split("/");
        String out = "";
        for (String part : parts) {
            if (part.isEmpty() || part.equals(".")) continue;
            if (part.equals("..")) {
                int cut = out.lastIndexOf('/');
                out = cut < 0 ? "" : out.substring(0, cut);
            } else {
                out = out + "/" + part;
            }
        }
        return out.isEmpty() ? "/" : out;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Each folder can copy the whole path so far into a new string.",
                "space_complexity": "O(n)",
                "space_why": "The growing string is the simplified path.",
                "when_to_use": "Say it. Then keep folders on a stack and join once.",
                "is_optimal": False,
            },
            {
                "name": "Stack of folder names",
                "idea": "Each real folder is pushed. '..' pops if the stack is not empty. Root never goes above '/'.",
                "steps": [
                    "Split on '/' and skip the empty parts and '.'.",
                    "On '..', pop if the stack is not empty. Do not push '..'.",
                    "Any other name is a folder: push it.",
                    "Join the stack from bottom to top with '/'. Empty stack is '/'.",
                ],
                "code": """import java.util.*;

class Solution {
    public String simplifyPath(String path) {
        Deque<String> stack = new ArrayDeque<>();
        for (String part : path.split("/")) {
            if (part.isEmpty() || part.equals(".")) continue;
            if (part.equals("..")) {
                if (!stack.isEmpty()) stack.pop();
            } else {
                stack.push(part);
            }
        }
        StringBuilder out = new StringBuilder();
        Iterator<String> it = stack.descendingIterator();
        while (it.hasNext()) out.append('/').append(it.next());
        return out.length() == 0 ? "/" : out.toString();
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each part is pushed or popped at most once, then joined once.",
                "space_complexity": "O(n)",
                "space_why": "The stack holds the folders that remain.",
                "when_to_use": "The version to write. One split, one join.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": 'path = "/a/./b/../../c/"',
            "columns": ["part", "action", "stack"],
            "rows": [
                ["a", "push", "[a]"],
                [".", "skip", "[a]"],
                ["b", "push", "[a, b]"],
                ["..", "pop b", "[a]"],
                ["..", "pop a", "[]"],
                ["c", "push", "[c]"],
            ],
            "result": "The answer is /c.",
        },
        "mistakes": [
            {
                "name": "Going above root",
                "wrong": "Pushing '..' when the stack is empty, so the path starts with /..",
                "right": "If the stack is empty, '..' is a no-op. Root stays '/'.",
            },
            {
                "name": "Treating '//' or '.' as folders",
                "wrong": "Pushing empty names or '.'.",
                "right": "Skip empty parts (from '//') and skip '.'. They do not change the path.",
            },
            {
                "name": "Returning an empty string",
                "wrong": "Joining zero folders as \"\".",
                "right": "An empty stack is the root: return \"/\".",
            },
        ],
        "edge_cases": [
            {"input": '"/home/"', "expected": '"/home"', "why": "Drop the trailing slash."},
            {"input": '"/../"', "expected": '"/"', "why": "'..' at root does nothing."},
            {"input": '"/home//foo/"', "expected": '"/home/foo"', "why": "Double slash is an empty part."},
            {"input": '"/a/./b/../../c/"', "expected": '"/c"', "why": "'.' is skip, '..' pops twice, then c."},
        ],
        "interview_script": [
            "I need the simplified absolute path: no '.', no '..', no extra slashes.",
            "I could append folder names onto a string and cut back to the last slash on '..'. That is O(n²).",
            "The key point: I treat a folder as a stack entry, and '..' pops if anything is there.",
            "So I split on '/', skip empty and '.', pop on '..', and push any other name. Then I join with a leading slash.",
            "That is O(n) time. I will test /../, double slashes, and /a/./b/../../c/.",
        ],
        "follow_ups": [
            {
                "question": "The path is relative, not absolute.",
                "answer": "Same stack. If it does not start with '/', do not force a leading slash when the stack is empty.",
            },
            {
                "question": "Symbolic links in a map from folder to target.",
                "answer": "When you push a name, if it is a link, push the target's parts instead, still honouring '..'.",
            },
            {
                "question": "You must not use split.",
                "answer": "Scan with two pointers between slashes and apply the same skip / pop / push rules.",
            },
        ],
        "related_slugs": ["lc-151", "lc-394", "lc-20"],
    },
    {
        "slugs": ["lc-739"],
        "pattern": "Monotonic stack",
        "trigger": "For each day, how many days until a warmer one (the next strictly bigger value).",
        "summary": (
            "Keep waiting days on a stack, last in nearest the door. A warmer day lets them out from the door inwards. "
            "Equal is not warmer."
        ),
        "approaches": [
            {
                "name": "From each day, scan forward",
                "idea": "For day i, walk j = i+1, i+2, ... until a strictly warmer day, and store j-i.",
                "steps": [
                    "Make an answer array of zeros (no warmer day stays 0).",
                    "For each i, scan j to the right.",
                    "On the first temperatures[j] > temperatures[i], store j - i and stop that i.",
                ],
                "code": """class Solution {
    public int[] dailyTemperatures(int[] temperatures) {
        int n = temperatures.length;
        int[] out = new int[n];
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                if (temperatures[j] > temperatures[i]) {
                    out[i] = j - i;
                    break;
                }
            }
        }
        return out;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Each day may reread every later day.",
                "space_complexity": "O(1)",
                "space_why": "Besides the output, only the two indices.",
                "when_to_use": "Say it. Then a stack of waiting days.",
                "is_optimal": False,
            },
            {
                "name": "Waiting room of days",
                "idea": "Days wait on a stack for a warmer day. The last one in sits nearest the door and leaves first.",
                "steps": [
                    "The stack holds indices of days still waiting, temperatures decreasing toward the door.",
                    "On day i, while the door's day is colder than today, let it out: wait is i minus that day.",
                    "Let a day out only when today's temperature is strictly greater.",
                    "Then push i. Days still waiting at the end stay 0.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[] dailyTemperatures(int[] temperatures) {
        int[] out = new int[temperatures.length];
        Deque<Integer> pending = new ArrayDeque<>();
        for (int i = 0; i < temperatures.length; i++) {
            while (!pending.isEmpty() && temperatures[pending.peek()] < temperatures[i]) {
                int day = pending.pop();
                out[day] = i - day;
            }
            pending.push(i);
        }
        return out;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each day is pushed once and popped at most once.",
                "space_complexity": "O(n)",
                "space_why": "The stack holds days that are still waiting.",
                "when_to_use": "The version to write. One pass.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "temperatures = [71, 71, 72]",
            "columns": ["day", "temp", "stack", "who leaves", "wait"],
            "rows": [
                ["0", "71", "[0]", "none", "-"],
                ["1", "71", "[0, 1]", "none: 71 is not warmer than 71", "-"],
                ["2", "72", "[]", "day 1, then day 0", "1, then 2"],
            ],
            "result": "The answer is [2, 1, 0].",
        },
        "mistakes": [
            {
                "name": "The Equal Day Trap",
                "wrong": "Letting a day out when the new day is equal, using `>=`.",
                "right": "Equal is not warmer. Let a day out only with a strict >, or days with the same temperature get a wrong wait.",
            },
            {
                "name": "Storing temperatures, not indices",
                "wrong": "A stack of values, so you cannot compute how many days it waited.",
                "right": "Store indices. The wait is `i - day`.",
            },
            {
                "name": "Filling 0 too early",
                "wrong": "Writing 0 when the next day is not warmer, instead of letting the day keep waiting.",
                "right": "Leave the slot at 0 until a warmer day pops it, or until the row ends.",
            },
        ],
        "edge_cases": [
            {"input": "[73,74,75,71,69,72,76,73]", "expected": "[1,1,4,2,1,1,0,0]", "why": "A dip, then a new high."},
            {"input": "[30,40,50,60]", "expected": "[1,1,1,0]", "why": "Strictly rising: each wait is 1."},
            {"input": "[71,71,72]", "expected": "[2,1,0]", "why": "Equal is not warmer (the Equal Day Trap)."},
            {"input": "[90,80,70]", "expected": "[0,0,0]", "why": "Never warmer: every wait stays 0."},
        ],
        "interview_script": [
            "I need, for each day, how many days until a strictly warmer one, or 0 if none.",
            "I could, from each day, scan forward until a warmer day. That is O(n²).",
            "The key point: I keep days waiting on a stack, last in nearest the door. A warmer day lets them out from the door inwards.",
            "I pop while today's temperature is strictly greater, and I store i minus that day. Equal does not pop.",
            "That is O(n) time and O(n) space. I will test equals, a falling row, and a dip then a new high.",
        ],
        "follow_ups": [
            {
                "question": "The row wraps around (circular).",
                "answer": "Walk the row twice, still using indices mod n, and stop a day once it has an answer.",
            },
            {
                "question": "Next smaller day, not warmer.",
                "answer": "Same stack, flip the compare to `>`.",
            },
            {
                "question": "Return the warmer temperature, not the wait.",
                "answer": "Store `temperatures[i]` when you pop, instead of `i - day`.",
            },
        ],
        "related_slugs": ["lc-84", "lc-239", "lc-42"],
    },
    {
        "slugs": ["lc-84"],
        "pattern": "Monotonic stack",
        "trigger": "Largest rectangle under a row of bars, or how far one bar can stretch before something smaller stops it.",
        "summary": (
            "Every bar starts a rectangle that grows to the right. A shorter bar blocks the taller ones. "
            "A blocked rectangle is finished, so it is measured, including how far it reaches left."
        ),
        "approaches": [
            {
                "name": "From each bar, walk left and right",
                "idea": "The rectangle of height heights[i] stretches while the neighbour is at least as tall.",
                "steps": [
                    "For each bar i, walk left while heights[L-1] >= heights[i].",
                    "Walk right while heights[R+1] >= heights[i].",
                    "Area is heights[i] * (R - L + 1). Keep the max.",
                ],
                "code": """class Solution {
    public int largestRectangleArea(int[] heights) {
        int best = 0, n = heights.length;
        for (int i = 0; i < n; i++) {
            int left = i, right = i;
            while (left > 0 && heights[left - 1] >= heights[i]) left--;
            while (right + 1 < n && heights[right + 1] >= heights[i]) right++;
            best = Math.max(best, heights[i] * (right - left + 1));
        }
        return best;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Each bar may walk over the whole row to find its two walls.",
                "space_complexity": "O(1)",
                "space_why": "Only the two edges and the best area.",
                "when_to_use": "Say it to show the rectangle of one bar. Then finish rectangles with a stack.",
                "is_optimal": False,
            },
            {
                "name": "Growing rectangles on a stack",
                "idea": "Bars on the stack are still growing right. A shorter bar blocks them, so those rectangles are measured.",
                "steps": [
                    "The stack holds indices of bars still growing, heights increasing.",
                    "Walk i from 0 to n. At i == n, treat the height as 0 so leftover bars finish.",
                    "While the top bar is at least as tall as this height, it is blocked: pop it.",
                    "Its left wall is the new top (or -1 if none). Width is i - leftWall - 1. Area is height * width.",
                    "Then push i. Keep the largest area.",
                ],
                "code": """import java.util.*;

class Solution {
    public int largestRectangleArea(int[] heights) {
        Deque<Integer> stack = new ArrayDeque<>();
        int best = 0;
        for (int i = 0; i <= heights.length; i++) {
            int height = i == heights.length ? 0 : heights[i];
            while (!stack.isEmpty() && heights[stack.peek()] >= height) {
                int barHeight = heights[stack.pop()];
                int leftWall = stack.isEmpty() ? -1 : stack.peek();
                best = Math.max(best, barHeight * (i - leftWall - 1));
            }
            stack.push(i);
        }
        return best;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each bar is pushed once and popped at most once.",
                "space_complexity": "O(n)",
                "space_why": "The stack holds indices of bars that are still growing.",
                "when_to_use": "The version to write. One pass, finish leftover bars with a closing height of 0.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "heights = [2,1,5,6,2,3]",
            "columns": ["i", "height", "stack", "blocked", "width", "best"],
            "rows": [
                ["0", "2", "[0]", "-", "-", "0"],
                ["1", "1", "[1]", "bar 0 (h=2)", "1-(-1)-1=1", "2"],
                ["2", "5", "[1, 2]", "-", "-", "2"],
                ["3", "6", "[1, 2, 3]", "-", "-", "2"],
                ["4", "2", "[1, 4]", "h=6 then h=5", "1, then 4-1-1=2", "10"],
                ["5", "3", "[1, 4, 5]", "-", "-", "10"],
                ["6", "0", "[]", "leftover 3, 2, 1", "1, 4, 6", "10"],
            ],
            "result": "The answer is 10, from height 5 across two bars.",
        },
        "mistakes": [
            {
                "name": "The Left Reach Trap",
                "wrong": "Measuring a blocked bar as width 1, or as i minus the bar's own index.",
                "right": "A blocked bar's rectangle does not start at the bar. It reaches left over every taller bar, to just after the growing bar below it, or to bar 0 if none is left: width = i - leftWall - 1.",
            },
            {
                "name": "Leaving leftover bars unmeasured",
                "wrong": "Stopping at i = n-1, so a rising row never pops.",
                "right": "After the last real bar, use height 0 so every leftover bar is blocked and measured.",
            },
            {
                "name": "Using a strict > when popping",
                "wrong": "Leaving an equal bar on the stack, so width misses the rest of a plateau.",
                "right": "Pop while `heights[top] >= height`, so equal bars finish too.",
            },
        ],
        "edge_cases": [
            {"input": "[2,1,5,6,2,3]", "expected": "10", "why": "Height 5 stretches over the 6 (the Left Reach Trap)."},
            {"input": "[2,4]", "expected": "4", "why": "A two-bar rise: the 4 itself, or 2 across both."},
            {"input": "[1]", "expected": "1", "why": "One bar."},
            {"input": "[1,1,1]", "expected": "3", "why": "A plateau: width is the whole row."},
        ],
        "interview_script": [
            "I need the largest rectangle that fits under the bars.",
            "I could, from each bar, walk left and right until a shorter bar. That is O(n²).",
            "The key point: I grow a bar's rectangle right until a shorter bar blocks it, and it also reaches left over taller bars.",
            "I keep growing bars on a stack. On a block I pop, and width is i minus the new top minus 1. I finish leftovers with height 0.",
            "That is O(n) time. I will test [2,1,5,6,2,3], a single bar, and a plateau.",
        ],
        "follow_ups": [
            {
                "question": "Each bar has its own width, not 1.",
                "answer": "Store prefix sums of widths. The width of a popped bar is prefix[i] - prefix[leftWall+1].",
            },
            {
                "question": "Largest rectangle of 1s in a binary matrix.",
                "answer": "Treat each row as a histogram of consecutive 1s above it, and run this algorithm on every row.",
            },
            {
                "question": "Largest square under the bars.",
                "answer": "Same walls, but the side is min(height, width), and you maximise side*side.",
            },
        ],
        "related_slugs": ["lc-739", "lc-42", "lc-239"],
    },
    {
        "slugs": ["minimum-tracker-stack"],
        "pattern": "Design: min stack",
        "trigger": "Design a stack that returns the current minimum as well as the top, and every call should take one step.",
        "summary": (
            "Keep a value stack and a min stack. Push onto the min stack when the new value is <= the current min. "
            "Pop the min stack when that same value leaves."
        ),
        "approaches": [
            {
                "name": "Scan for the min on every getMin",
                "idea": "A normal stack of values. getMin walks every value still stored.",
                "steps": [
                    "push, pop, and top use a normal stack.",
                    "On getMin, walk the stack and keep the smallest.",
                    "Correct, but each getMin rereads every value.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[] process(String[] operations, int[] values) {
        MinStack stack = new MinStack();
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "push" -> stack.push(values[i]);
                case "pop" -> stack.pop();
                case "top" -> out.add(stack.top());
                case "getMin" -> out.add(stack.getMin());
                default -> {}
            }
        }
        int[] arr = new int[out.size()];
        for (int i = 0; i < out.size(); i++) arr[i] = out.get(i);
        return arr;
    }
}

class MinStack {
    private final Deque<Integer> values = new ArrayDeque<>();

    public MinStack() {}

    public void push(int val) {
        values.push(val);
    }

    public void pop() {
        values.pop();
    }

    public int top() {
        return values.peek();
    }

    public int getMin() {
        int min = Integer.MAX_VALUE;
        for (int x : values) min = Math.min(min, x);
        return min;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "getMin walks every value still on the stack.",
                "space_complexity": "O(n)",
                "space_why": "The stack stores each pushed value.",
                "when_to_use": "Say it. Then keep a second stack of mins.",
                "is_optimal": False,
            },
            {
                "name": "Value stack plus min stack",
                "idea": "mins.peek() is the current min. Push a min when val is <= that, and pop a min when that value leaves.",
                "steps": [
                    "The values stack holds every push. The mins stack holds a decreasing history of mins.",
                    "On a push, always push val onto values. Push val onto mins when the mins stack is empty or val <= mins.peek().",
                    "On pop, if the leaving value equals mins.peek(), pop mins too.",
                    "The top is values.peek(). getMin is mins.peek().",
                ],
                "code": """import java.util.*;

class Solution {
    public int[] process(String[] operations, int[] values) {
        MinStack stack = new MinStack();
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "push" -> stack.push(values[i]);
                case "pop" -> stack.pop();
                case "top" -> out.add(stack.top());
                case "getMin" -> out.add(stack.getMin());
                default -> {}
            }
        }
        int[] arr = new int[out.size()];
        for (int i = 0; i < out.size(); i++) arr[i] = out.get(i);
        return arr;
    }
}

class MinStack {
    private final Deque<Integer> values = new ArrayDeque<>();
    private final Deque<Integer> mins = new ArrayDeque<>();

    public MinStack() {}

    public void push(int val) {
        values.push(val);
        if (mins.isEmpty() || val <= mins.peek()) mins.push(val);
    }

    public void pop() {
        int v = values.pop();
        if (v == mins.peek()) mins.pop();
    }

    public int top() {
        return values.peek();
    }

    public int getMin() {
        return mins.peek();
    }
}
""",
                "time_complexity": "O(1)",
                "time_why": "Each call only pushes or pops the top of one or two stacks.",
                "space_complexity": "O(n)",
                "space_why": "values stores every push; mins stores each new or tied min.",
                "when_to_use": "The version to write. Two stacks, no scan, no pairs.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "push 0, push 1, push -1, getMin, pop, getMin, pop, getMin",
            "columns": ["op", "values", "mins", "out"],
            "rows": [
                ["push 0", "[0]", "[0]", "-"],
                ["push 1", "[0, 1]", "[0]", "-"],
                ["push -1", "[0, 1, -1]", "[0, -1]", "-"],
                ["getMin", "same", "same", "-1"],
                ["pop", "[0, 1]", "[0]", "-"],
                ["getMin", "same", "same", "0"],
                ["pop", "[0]", "[0]", "-"],
                ["getMin", "same", "same", "0"],
            ],
            "result": "The recorded answers are [-1, 0, 0].",
        },
        "mistakes": [
            {
                "name": "Pushing the min only when val is strictly smaller",
                "wrong": "Using `<` so a second copy of the same min is not recorded.",
                "right": "Push onto mins when `val <= mins.peek()`. A tied min must survive after the first copy is popped.",
            },
            {
                "name": "Popping mins on every pop",
                "wrong": "Always popping both stacks, so the min history is shorter than the values.",
                "right": "Pop mins only when the leaving value equals `mins.peek()`.",
            },
            {
                "name": "One min field",
                "wrong": "A single `min` variable that is not restored after the min is popped.",
                "right": "The min stack is the history. A pop of the min reveals the min below.",
            },
        ],
        "edge_cases": [
            {
                "input": '["MinStack","push","push","push","getMin","pop","top","getMin"]\n[0,-2,0,-3,0,0,0,0]',
                "expected": "[-3,0,-2]",
                "why": "A new min is popped and the previous min returns.",
            },
            {
                "input": '["MinStack","push","push","getMin","top"]\n[0,1,2,0,0]',
                "expected": "[1,2]",
                "why": "The min is below the top.",
            },
            {
                "input": '["MinStack","push","push","push","getMin","pop","getMin","pop","getMin"]\n[0,0,1,-1,0,0,0,0,0]',
                "expected": "[-1,0,0]",
                "why": "Tied zeros, then a new min, then two pops.",
            },
            {
                "input": '["MinStack","push","getMin"]\n[0,-5,0]',
                "expected": "[-5]",
                "why": "One value: the min is that value.",
            },
        ],
        "interview_script": [
            "I need a stack with push, pop, top, and getMin, each in one step.",
            "I could scan the values on getMin. That is O(n) per call.",
            "The key point: I only need a history of mins, pushed when a new value is <= the current min.",
            "So I keep a value stack and a min stack. I pop the min stack only when that min value leaves.",
            "That is O(1) per call. I will test a tied min, a new min that is then popped, and getMin after that pop.",
        ],
        "follow_ups": [
            {
                "question": "Store the min next to each value instead of a second stack.",
                "answer": "Push (val, min(val, min below)). getMin reads the top pair. Same cost.",
            },
            {
                "question": "Also return the maximum in one step.",
                "answer": "A third stack of maxes, with the same <= / >= push rule.",
            },
            {
                "question": "All operations on a queue.",
                "answer": "FIFO breaks a single running min. Keep a deque of increasing candidates, as in sliding-window minimum.",
            },
        ],
        "related_slugs": ["lc-155", "lc-895", "lc-146"],
    },
]
