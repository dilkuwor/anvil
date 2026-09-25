"""Written solutions for matrix problems."""

from __future__ import annotations

SOLUTIONS: list[dict] = [
    {
        "slugs": ["lc-48"],
        "pattern": "Matrix",
        "trigger": "rotate an n x n grid ninety degrees clockwise in place",
        "summary": (
            "Turn the rows into columns by flipping across the main diagonal. "
            "Then flip each row from left to right. Doing both turns the whole grid ninety degrees clockwise."
        ),
        "approaches": [
            {
                "name": "Copy into a new grid",
                "is_optimal": False,
                "idea": "Write each cell into its rotated position in a fresh grid, then copy everything back.",
                "steps": [
                    "Find the grid dimension n.",
                    "Create a temporary grid of size n by n.",
                    "For every cell at row r and column c, place its value into column c and row n minus 1 minus r of the new grid.",
                    "Copy each value from the temporary grid back into the original grid.",
                    "Return the modified grid.",
                ],
                "code": """class Solution {
    public int[][] rotate(int[][] matrix) {
        int n = matrix.length;
        int[][] temp = new int[n][n];
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < n; c++) {
                temp[c][n - 1 - r] = matrix[r][c];
            }
        }
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < n; c++) {
                matrix[r][c] = temp[r][c];
            }
        }
        return matrix;
    }
}""",
                "time_complexity": "O(n²)",
                "time_why": "We read and write every cell in the grid twice.",
                "space_complexity": "O(n²)",
                "space_why": "We allocate a second grid of size n by n to hold the rotated values.",
                "when_to_use": "Mention it first to show the coordinate mapping before doing it in place.",
            },
            {
                "name": "Flip diagonal then flip rows",
                "is_optimal": True,
                "idea": "Flip across the main diagonal, then reverse each row horizontally using two pointers.",
                "steps": [
                    "Find the grid dimension n.",
                    "Flip across the main diagonal by swapping cell (r, c) with cell (c, r) for every pair where c is greater than r.",
                    "Go through each row one by one.",
                    "Reverse each row by swapping elements from both ends with two pointers until they meet.",
                    "Return the modified grid.",
                ],
                "code": """class Solution {
    public int[][] rotate(int[][] matrix) {
        int n = matrix.length;
        for (int r = 0; r < n; r++) {
            for (int c = r + 1; c < n; c++) {
                int temp = matrix[r][c];
                matrix[r][c] = matrix[c][r];
                matrix[c][r] = temp;
            }
        }
        for (int[] row : matrix) {
            for (int left = 0, right = n - 1; left < right; left++, right--) {
                int temp = row[left];
                row[left] = row[right];
                row[right] = temp;
            }
        }
        return matrix;
    }
}""",
                "time_complexity": "O(n²)",
                "time_why": "We touch each cell once during the diagonal flip and once during the row reverse.",
                "space_complexity": "O(1)",
                "space_why": "We swap numbers directly inside the grid with one temporary variable.",
                "when_to_use": "The standard interview answer: clean two-step in-place rotation with no extra memory.",
            },
            {
                "name": "Four-way cycle swap, ring by ring",
                "idea": "Send every cell straight to where it belongs: four cells trade places in one move, top to right, right to bottom, bottom to left, left to top.",
                "steps": [
                    "Work on one ring of the grid at a time, from the outer ring inwards. A grid of size n has n / 2 rings.",
                    "Inside a ring, take the cell at position i along the top edge together with the three cells it trades places with on the right, bottom and left edges.",
                    "Save the top cell, then move the left cell up into it, the bottom cell into the left, and the right cell into the bottom.",
                    "Write the saved top cell into the right edge, which closes the circle of four.",
                    "Stop one cell short of the corner on each edge, so no cell is moved twice.",
                ],
                "code": """class Solution {
    public int[][] rotate(int[][] matrix) {
        int n = matrix.length;
        for (int ring = 0; ring < n / 2; ring++) {
            int last = n - 1 - ring;
            for (int i = ring; i < last; i++) {
                int offset = i - ring;
                int top = matrix[ring][i];
                matrix[ring][i] = matrix[last - offset][ring];
                matrix[last - offset][ring] = matrix[last][last - offset];
                matrix[last][last - offset] = matrix[i][last];
                matrix[i][last] = top;
            }
        }
        return matrix;
    }
}""",
                "time_complexity": "O(n²)",
                "time_why": "Each cell is picked up and put down once, in groups of four.",
                "space_complexity": "O(1)",
                "space_why": "One saved value holds the cell that is being displaced.",
                "when_to_use": "When each cell may be written only once, or when you want the idea behind rotating an array in place: follow the cycle each value belongs to. The four offsets are the fiddly part, so write one ring out on paper first.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]",
            "result": "The grid is rotated ninety degrees clockwise to [[7, 4, 1], [8, 5, 2], [9, 6, 3]].",
            "columns": ["step", "stage", "what happens", "grid state"],
            "rows": [
                ["0", "start", "original numbers", "[[1, 2, 3], [4, 5, 6], [7, 8, 9]]"],
                ["1", "diagonal", "swap across main diagonal", "[[1, 4, 7], [2, 5, 8], [3, 6, 9]]"],
                ["2", "row 0", "reverse row 0 from [1, 4, 7] to [7, 4, 1]", "[[7, 4, 1], [2, 5, 8], [3, 6, 9]]"],
                ["3", "row 1", "reverse row 1 from [2, 5, 8] to [8, 5, 2]", "[[7, 4, 1], [8, 5, 2], [3, 6, 9]]"],
                ["4", "row 2", "reverse row 2 from [3, 6, 9] to [9, 6, 3]", "[[7, 4, 1], [8, 5, 2], [9, 6, 3]]"],
            ],
        },
        "mistakes": [
            {
                "name": "The Double Swap Trap",
                "wrong": "Running the column loop from 0 to n - 1 swaps cells twice and undoes the flip.",
                "right": "Start the column loop at `r + 1` so each pair across the diagonal is swapped once.",
            },
            {
                "name": "Reversing columns instead of rows",
                "wrong": "Reversing columns after the diagonal flip rotates counter-clockwise instead of clockwise.",
                "right": "Reverse each row horizontally from left to right to turn clockwise.",
            },
            {
                "name": "Mixing up four-way cycle coordinates",
                "wrong": "Rotating cell by cell in rings and miscalculating the four corner offsets.",
                "right": "Write one ring out on paper and read the four offsets off it before coding, or sidestep the offsets altogether with the diagonal flip and row reversal.",
            },
        ],
        "edge_cases": [
            {
                "input": "matrix = [[1]]",
                "expected": "[[1]]",
                "why": "A single element grid stays the same.",
            },
            {
                "input": "matrix = [[1, 2], [3, 4]]",
                "expected": "[[3, 1], [4, 2]]",
                "why": "The smallest even grid with only one outer ring.",
            },
            {
                "input": "matrix = [[5, 1, 9, 11], [2, 4, 8, 10], [13, 3, 6, 7], [15, 14, 12, 16]]",
                "expected": "[[15, 13, 2, 5], [14, 3, 4, 1], [12, 6, 8, 9], [16, 7, 10, 11]]",
                "why": "A four by four grid with an outer and an inner ring.",
            },
            {
                "input": "matrix = [[-1, -2], [-3, -4]]",
                "expected": "[[-3, -1], [-4, -2]]",
                "why": "Negative values rotate the same way.",
            },
        ],
        "interview_script": [
            "I need to rotate an n by n grid ninety degrees clockwise directly in place.",
            "The obvious way is to allocate a second grid where I copy each cell, taking O(n²) time and O(n²) space.",
            "The key point: I can decompose clockwise rotation into flipping across the diagonal, then flipping each row.",
            "So I swap across the diagonal and reverse each row with two pointers, taking O(n²) time and O(1) space.",
            "I will test a one-by-one grid, a two-by-two grid, and negative numbers.",
        ],
        "follow_ups": [
            {
                "question": "How would you rotate ninety degrees counter-clockwise in place?",
                "answer": "Flip across the main diagonal, then reverse each column vertically from top to bottom.",
            },
            {
                "question": "How would you rotate one hundred eighty degrees in place?",
                "answer": "Reverse each row horizontally and then reverse the order of all rows vertically.",
            },
            {
                "question": "Can you rotate a non-square matrix in place?",
                "answer": "No, because the row and column dimensions swap, requiring a newly sized grid.",
            },
        ],
        "related_slugs": ["lc-54", "lc-73", "lc-286"],
    },
    {
        "slugs": ["lc-54"],
        "pattern": "Matrix",
        "trigger": "read a grid in clockwise spiral order from outside to inside",
        "summary": (
            "Walk the four outer walls: top row rightward, right column downward, "
            "bottom row leftward, and left column upward. Shrink each wall inward as soon as you finish it."
        ),
        "approaches": [
            {
                "name": "Step with direction vectors and seen grid",
                "is_optimal": False,
                "idea": "Step forward in the current direction until hitting a boundary or visited cell, then turn right.",
                "steps": [
                    "Return an empty list if the grid has no rows.",
                    "Allocate a seen boolean grid of size m by n to track visited cells.",
                    "Set up the four direction steps for moving right, down, left, and up.",
                    "Step forward cell by cell, adding each value to the output list and marking it seen.",
                    "If the next step is outside the grid or already seen, turn ninety degrees to the right.",
                    "Stop once every cell in the grid has been visited.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<Integer> spiralOrder(int[][] matrix) {
        List<Integer> out = new ArrayList<>();
        if (matrix.length == 0) {
            return out;
        }
        int rows = matrix.length;
        int cols = matrix[0].length;
        boolean[][] seen = new boolean[rows][cols];
        int[][] dirs = {{0, 1}, {1, 0}, {0, -1}, {-1, 0}};

        int r = 0;
        int c = 0;
        int d = 0;
        for (int i = 0; i < rows * cols; i++) {
            out.add(matrix[r][c]);
            seen[r][c] = true;
            int nr = r + dirs[d][0];
            int nc = c + dirs[d][1];
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !seen[nr][nc]) {
                r = nr;
                c = nc;
            } else {
                d = (d + 1) % 4;
                r += dirs[d][0];
                c += dirs[d][1];
            }
        }
        return out;
    }
}""",
                "time_complexity": "O(m × n)",
                "time_why": "We visit each cell in the grid exactly once.",
                "space_complexity": "O(m × n)",
                "space_why": "The seen grid stores a boolean flag for every cell.",
                "when_to_use": "Mention it when the grid has irregular walls or obstacles.",
            },
            {
                "name": "Four boundary pointers",
                "is_optimal": True,
                "idea": "Keep four walls: top, bottom, left, and right, shrinking each wall inward after walking it.",
                "steps": [
                    "Set the four boundary pointers: top at 0, bottom at m - 1, left at 0, and right at n - 1.",
                    "Walk along the top boundary from left to right, then move top down by one.",
                    "Walk down the right boundary from top to bottom, then move right left by one.",
                    "If top is still at or above bottom, walk left along the bottom boundary, then move bottom up by one.",
                    "If left is still at or before right, walk up along the left boundary, then move left right by one.",
                    "Repeat the loop until the boundaries cross.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<Integer> spiralOrder(int[][] matrix) {
        List<Integer> out = new ArrayList<>();
        if (matrix.length == 0) {
            return out;
        }
        int top = 0;
        int bottom = matrix.length - 1;
        int left = 0;
        int right = matrix[0].length - 1;

        while (top <= bottom && left <= right) {
            for (int c = left; c <= right; c++) {
                out.add(matrix[top][c]);
            }
            top++;

            for (int r = top; r <= bottom; r++) {
                out.add(matrix[r][right]);
            }
            right--;

            if (top <= bottom) {
                for (int c = right; c >= left; c--) {
                    out.add(matrix[bottom][c]);
                }
                bottom--;
            }

            if (left <= right) {
                for (int r = bottom; r >= top; r--) {
                    out.add(matrix[r][left]);
                }
                left++;
            }
        }
        return out;
    }
}""",
                "time_complexity": "O(m × n)",
                "time_why": "Every number in the grid is visited once and added to the output list.",
                "space_complexity": "O(1)",
                "space_why": "Only four boundary integers are kept, using constant extra memory beyond the output list.",
                "when_to_use": "The standard interview answer for reading a rectangular grid in spiral order.",
            },
            {
                "name": "Peel the top row, then turn the grid",
                "idea": "Read the whole top row, drop it, turn what is left a quarter turn anticlockwise, and the next part of the spiral is the new top row.",
                "steps": [
                    "If the grid has no rows or no columns, stop.",
                    "Add every number in the top row to the answer, left to right.",
                    "Take the rows below it and build a new grid turned a quarter turn anticlockwise, so the old right column becomes the new top row.",
                    "Repeat on the new grid until nothing is left.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<Integer> spiralOrder(int[][] matrix) {
        List<Integer> out = new ArrayList<>();
        int[][] grid = matrix;
        while (grid.length > 0 && grid[0].length > 0) {
            for (int value : grid[0]) {
                out.add(value);
            }
            int rows = grid.length - 1;
            int cols = grid[0].length;
            int[][] turned = new int[cols][rows];
            for (int r = 0; r < rows; r++) {
                for (int c = 0; c < cols; c++) {
                    turned[cols - 1 - c][r] = grid[r + 1][c];
                }
            }
            grid = turned;
        }
        return out;
    }
}""",
                "time_complexity": "O(m × n × (m + n))",
                "time_why": "Every round copies what is left of the grid, and one round goes per row and per column.",
                "space_complexity": "O(m × n)",
                "space_why": "Each round builds a fresh turned copy of the rest of the grid.",
                "when_to_use": "When you would rather not carry four walls at all. There is nothing to shrink and nothing to check, so the single-row and single-column grids that break the wall version cannot go wrong here.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]",
            "result": "The spiral order is [1, 2, 3, 6, 9, 8, 7, 4, 5].",
            "columns": ["step", "wall", "numbers read", "bounds remaining"],
            "rows": [
                ["1", "top row", "[1, 2, 3]", "top=1, bottom=2, left=0, right=2"],
                ["2", "right column", "[6, 9]", "top=1, bottom=2, left=0, right=1"],
                ["3", "bottom row", "[8, 7]", "top=1, bottom=1, left=0, right=1"],
                ["4", "left column", "[4]", "top=1, bottom=1, left=1, right=1"],
                ["5", "center cell", "[5]", "boundaries cross, stop"],
            ],
        },
        "mistakes": [
            {
                "name": "The Duplicate Sweep Trap",
                "wrong": "Omitting the check for `top <= bottom` before moving left duplicates numbers on single-row grids.",
                "right": "Always check `top <= bottom` before the bottom walk, and `left <= right` before the left walk.",
            },
            {
                "name": "Double visiting corner cells",
                "wrong": "Visiting corner cells in both adjacent walks by not shrinking boundaries immediately.",
                "right": "Adjust the boundary pointer immediately after each side finishes.",
            },
            {
                "name": "Off-by-one on column boundary",
                "wrong": "Setting right boundary to n instead of n - 1 causing out of bounds access.",
                "right": "Use zero-based indexing: left is 0, right is n - 1, top is 0, bottom is m - 1.",
            },
        ],
        "edge_cases": [
            {
                "input": "matrix = [[1, 2, 3, 4]]",
                "expected": "[1, 2, 3, 4]",
                "why": "A single row grid finishes on the first rightward walk.",
            },
            {
                "input": "matrix = [[1], [2], [3], [4]]",
                "expected": "[1, 2, 3, 4]",
                "why": "A single column grid walks straight down without turning.",
            },
            {
                "input": "matrix = [[1]]",
                "expected": "[1]",
                "why": "A single cell grid adds its only number and stops.",
            },
            {
                "input": "matrix = [[1, 2], [3, 4]]",
                "expected": "[1, 2, 4, 3]",
                "why": "A small two by two square grid.",
            },
        ],
        "interview_script": [
            "I need to visit all numbers in an m by n grid in clockwise spiral order.",
            "The obvious way is tracking visited cells with a boolean grid that I check at each step, taking O(m × n) time and O(m × n) space.",
            "The key point: each round strips four walls, so I can use four boundary pointers to shrink the rectangle.",
            "So I walk each wall and shrink the pointers inward, taking O(m × n) time and O(1) space.",
            "I will test a single row, a single column, a one-by-one grid, and a two-by-two square.",
        ],
        "follow_ups": [
            {
                "question": "How would you fill an n by n grid in spiral order with numbers from 1 to n²?",
                "answer": "Use the same four boundary pointers, writing an increasing counter into the cells instead of reading.",
            },
            {
                "question": "How would you find only the kth element without walking all cells?",
                "answer": "Count how many complete perimeter layers fit before k and jump straight to the correct ring.",
            },
            {
                "question": "What if the grid is stored on disk in row-major order and too large for memory?",
                "answer": "Spiral access has poor cache locality; reading layer chunks into a buffer minimizes disk seeks.",
            },
        ],
        "related_slugs": ["lc-48", "lc-73", "lc-200"],
    },
    {
        "slugs": ["lc-73"],
        "pattern": "Matrix",
        "trigger": "if an element is 0, set its entire row and column to 0 in place",
        "summary": (
            "Use the first row and first column as marker boards to remember which rows and columns need zeroes. "
            "Keep two flags for whether the first row and column themselves started with zero."
        ),
        "approaches": [
            {
                "name": "Row and column boolean arrays",
                "is_optimal": False,
                "idea": "Remember which rows and columns have a zero in two boolean arrays, then zero them in a second pass.",
                "steps": [
                    "Create a boolean array for rows of size m and another for columns of size n.",
                    "Scan every cell in the grid, marking its row and column true whenever a zero is found.",
                    "Scan the grid a second time.",
                    "If either the row flag or the column flag is true, set the cell value to zero.",
                    "Return the modified grid.",
                ],
                "code": """class Solution {
    public int[][] setZeroes(int[][] matrix) {
        int rows = matrix.length;
        int cols = matrix[0].length;
        boolean[] zeroRows = new boolean[rows];
        boolean[] zeroCols = new boolean[cols];

        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (matrix[r][c] == 0) {
                    zeroRows[r] = true;
                    zeroCols[c] = true;
                }
            }
        }

        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (zeroRows[r] || zeroCols[c]) {
                    matrix[r][c] = 0;
                }
            }
        }
        return matrix;
    }
}""",
                "time_complexity": "O(m × n)",
                "time_why": "We scan the entire grid twice, doing constant work per cell.",
                "space_complexity": "O(m + n)",
                "space_why": "We allocate two boolean arrays of length m and n.",
                "when_to_use": "Mention it first as the simple and clear approach before saving extra memory.",
            },
            {
                "name": "First row and column marker storage",
                "is_optimal": True,
                "idea": "Use the grid's own first row and column to hold the zero markers, using constant extra memory.",
                "steps": [
                    "Check whether the first row or first column starts with any zero, storing that in two boolean flags.",
                    "Look through the inner cells from row 1 and column 1; if a cell is zero, write zero into its row header and column header.",
                    "Look through the inner cells again; if its row header or column header is zero, set the cell to zero.",
                    "If the first row originally had a zero, fill the first row with zeroes.",
                    "If the first column originally had a zero, fill the first column with zeroes.",
                ],
                "code": """class Solution {
    public int[][] setZeroes(int[][] matrix) {
        int rows = matrix.length;
        int cols = matrix[0].length;
        boolean firstRowZero = false;
        boolean firstColZero = false;

        for (int c = 0; c < cols; c++) {
            if (matrix[0][c] == 0) {
                firstRowZero = true;
            }
        }
        for (int r = 0; r < rows; r++) {
            if (matrix[r][0] == 0) {
                firstColZero = true;
            }
        }

        for (int r = 1; r < rows; r++) {
            for (int c = 1; c < cols; c++) {
                if (matrix[r][c] == 0) {
                    matrix[r][0] = 0;
                    matrix[0][c] = 0;
                }
            }
        }

        for (int r = 1; r < rows; r++) {
            for (int c = 1; c < cols; c++) {
                if (matrix[r][0] == 0 || matrix[0][c] == 0) {
                    matrix[r][c] = 0;
                }
            }
        }

        if (firstRowZero) {
            for (int c = 0; c < cols; c++) {
                matrix[0][c] = 0;
            }
        }
        if (firstColZero) {
            for (int r = 0; r < rows; r++) {
                matrix[r][0] = 0;
            }
        }
        return matrix;
    }
}""",
                "time_complexity": "O(m × n)",
                "time_why": "We make a few constant-time passes over the grid cells.",
                "space_complexity": "O(1)",
                "space_why": "We use the grid itself for storage plus two primitive boolean flags.",
                "when_to_use": "The optimal interview solution achieving true constant auxiliary memory.",
            },
            {
                "name": "Mark with a stand-in value the grid cannot hold",
                "idea": "Pick one value the grid can never contain and write it over every cell that must end up zero, so the real zeroes are still the only zeroes while you work.",
                "steps": [
                    "Agree one value the grid cannot hold, such as `Integer.MIN_VALUE` when the numbers are known to be larger.",
                    "Go over every cell. When you find a real zero, write the stand-in value over each non-zero cell in its row and in its column.",
                    "Leave real zeroes alone while marking, so they still say where the work is.",
                    "Go over the grid once more and turn every stand-in value into a zero.",
                ],
                "code": """class Solution {
    public int[][] setZeroes(int[][] matrix) {
        int rows = matrix.length;
        int cols = matrix[0].length;
        int mark = Integer.MIN_VALUE;

        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (matrix[r][c] == 0) {
                    for (int k = 0; k < cols; k++) {
                        if (matrix[r][k] != 0) {
                            matrix[r][k] = mark;
                        }
                    }
                    for (int k = 0; k < rows; k++) {
                        if (matrix[k][c] != 0) {
                            matrix[k][c] = mark;
                        }
                    }
                }
            }
        }

        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (matrix[r][c] == mark) {
                    matrix[r][c] = 0;
                }
            }
        }
        return matrix;
    }
}""",
                "time_complexity": "O(m × n × (m + n))",
                "time_why": "Every real zero sweeps its whole row and column, and a zero can sit in every cell.",
                "space_complexity": "O(1)",
                "space_why": "Only the stand-in value is kept. The marks live in the grid itself.",
                "when_to_use": "When the first row and column are not yours to borrow, because they hold headers or the grid is shared. Ask what values the grid can hold first: this needs one spare value, and it is slower.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "matrix = [[1, 1, 1], [1, 0, 1], [1, 1, 1]]",
            "result": "The middle row and middle column are set to zero.",
            "columns": ["step", "action", "headers marked", "grid state"],
            "rows": [
                ["1", "check border rows", "firstRowZero=false, firstColZero=false", "border clean"],
                ["2", "scan inner cell (1, 1)", "cell is 0, so set row 1 header and col 1 header to 0", "matrix[1][0]=0, matrix[0][1]=0"],
                ["3", "update inner cells", "row 1 and col 1 are zeroed from headers", "[[1, 0, 1], [0, 0, 0], [1, 0, 1]]"],
                ["4", "check border flags", "both flags were false, so borders keep their values", "final answer ready"],
            ],
        },
        "mistakes": [
            {
                "name": "The Cascade Trap",
                "wrong": "Setting a row or column to zero immediately creates new zeroes that cascade across the whole grid.",
                "right": "Only record where the zeroes are on the first pass; set the zeroes on a separate second pass.",
            },
            {
                "name": "Overwriting the top-left corner",
                "wrong": "Using matrix[0][0] to track both row 0 and column 0 without separate flags.",
                "right": "Track row 0 and column 0 with two separate boolean flags so neither border corrupts the other.",
            },
            {
                "name": "Zeroing the header rows too early",
                "wrong": "Filling row 0 or column 0 with zeroes before updating the inner cells wipes out all markers.",
                "right": "Update inner cells using the header markers first, and handle row 0 and column 0 last.",
            },
        ],
        "edge_cases": [
            {
                "input": "matrix = [[0]]",
                "expected": "[[0]]",
                "why": "A single cell with zero remains zero.",
            },
            {
                "input": "matrix = [[1, 0, 3]]",
                "expected": "[[0, 0, 0]]",
                "why": "A single row with a zero zeroes out the whole row.",
            },
            {
                "input": "matrix = [[1], [0], [3]]",
                "expected": "[[0], [0], [0]]",
                "why": "A single column with a zero zeroes out the whole column.",
            },
            {
                "input": "matrix = [[1, 2], [3, 4]]",
                "expected": "[[1, 2], [3, 4]]",
                "why": "A grid with no zeroes remains unchanged.",
            },
        ],
        "interview_script": [
            "I need to set the entire row and column to zero for any cell that holds a zero, in place.",
            "The obvious way uses boolean arrays for rows and columns, taking O(m × n) time and O(m + n) space.",
            "The key point: I can use the first row and column of the grid itself as my marker arrays.",
            "So I mark the borders and apply zeroes in a second pass, taking O(m × n) time and O(1) space.",
            "I will test a grid with no zeroes, a single row, a single column, and a one-by-one grid.",
        ],
        "follow_ups": [
            {
                "question": "Can you do this with zero extra boolean flags?",
                "answer": "Use matrix[0][0] for row 0 and keep one variable for column 0.",
            },
            {
                "question": "What if the matrix is sparse with only a few zeroes?",
                "answer": "Collect the coordinate pairs of the zeroes in a list and only zero those specific rows and columns.",
            },
            {
                "question": "What if the matrix is read-only?",
                "answer": "Return a custom view wrapper that reports zero if the queried row or column has a zero in a set.",
            },
        ],
        "related_slugs": ["lc-48", "lc-54", "lc-286"],
    },
    {
        "slugs": ["lc-289"],
        "pattern": "Matrix, state in spare bits",
        "trigger": "Every cell changes at the same moment, and you must update the grid in place.",
        "summary": (
            "Each cell must hold its old state and its new state at the same time. Keep the old state in bit 0 "
            "and write the new state into bit 1. Count neighbours with `cell & 1`, then shift every cell right by one."
        ),
        "approaches": [
            {
                "name": "Copy the board first",
                "idea": "Read every neighbour from an untouched copy, and write the new states into the board.",
                "steps": [
                    "Make a full copy of the board before changing anything.",
                    "For each cell, count the live cells among its eight neighbours in the copy.",
                    "Apply the four rules to decide whether the cell is live next turn.",
                    "Write that new state into the board. The copy never changes, so every count sees the old state.",
                ],
                "code": """class Solution {
    public int[][] gameOfLife(int[][] board) {
        int rows = board.length;
        int cols = board[0].length;
        int[][] old = new int[rows][cols];
        for (int r = 0; r < rows; r++) {
            old[r] = board[r].clone();
        }
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                int live = 0;
                for (int dr = -1; dr <= 1; dr++) {
                    for (int dc = -1; dc <= 1; dc++) {
                        if (dr == 0 && dc == 0) continue;
                        int nr = r + dr;
                        int nc = c + dc;
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) live += old[nr][nc];
                    }
                }
                boolean alive = old[r][c] == 1;
                board[r][c] = (alive && (live == 2 || live == 3)) || (!alive && live == 3) ? 1 : 0;
            }
        }
        return board;
    }
}
""",
                "time_complexity": "O(m × n)",
                "time_why": "Each cell looks at its eight neighbours once, which is a fixed amount of work per cell.",
                "space_complexity": "O(m × n)",
                "space_why": "The copy holds one value for every cell of the board.",
                "when_to_use": "Say it first. It is correct and easy to explain, but the problem asks you to work in place.",
                "is_optimal": False,
            },
            {
                "name": "Two states in each cell",
                "idea": "A cell only needs one bit, so bit 0 keeps the old state while bit 1 stores the new one.",
                "steps": [
                    "For each cell, count its live neighbours using `board[nr][nc] & 1`, which is always the old state.",
                    "Apply the four rules to the old state and that count.",
                    "If the cell is live next turn, set bit 1 with `board[r][c] |= 2`. Leave bit 0 alone.",
                    "When every cell is done, shift each cell right by one, so the new state moves into bit 0.",
                ],
                "code": """class Solution {
    public int[][] gameOfLife(int[][] board) {
        int rows = board.length;
        int cols = board[0].length;
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                int live = 0;
                for (int dr = -1; dr <= 1; dr++) {
                    for (int dc = -1; dc <= 1; dc++) {
                        if (dr == 0 && dc == 0) continue;
                        int nr = r + dr;
                        int nc = c + dc;
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) live += board[nr][nc] & 1;
                    }
                }
                boolean alive = (board[r][c] & 1) == 1;
                if ((alive && (live == 2 || live == 3)) || (!alive && live == 3)) {
                    board[r][c] |= 2;
                }
            }
        }
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                board[r][c] >>= 1;
            }
        }
        return board;
    }
}
""",
                "time_complexity": "O(m × n)",
                "time_why": "One pass counts eight neighbours per cell, and a second pass shifts each cell once.",
                "space_complexity": "O(1)",
                "space_why": "Both states live inside the board's own numbers. Only a few counters are extra.",
                "when_to_use": "The version to write. Same time as the copy, with no extra board.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "board = [[0,0,0],[1,1,1],[0,0,0]]",
            "columns": ["cell", "old", "live neighbours", "rule", "stored", "new"],
            "rows": [
                ["(0,0)", "0", "2", "dead, needs exactly 3", "0", "0"],
                ["(0,1)", "0", "3", "dead with 3 comes alive", "2 (bits 10)", "1"],
                ["(0,2)", "0", "2: it reads `2 & 1 = 0` for (0,1), the old state", "dead, needs exactly 3", "0", "0"],
                ["(1,0)", "1", "1", "live with fewer than 2 dies", "1 (bits 01)", "0"],
                ["(1,1)", "1", "2", "live with 2 lives on", "3 (bits 11)", "1"],
                ["(1,2)", "1", "1", "live with fewer than 2 dies", "1 (bits 01)", "0"],
                ["(2,1)", "0", "3", "dead with 3 comes alive", "2 (bits 10)", "1"],
                ["all", "-", "-", "shift every cell right by one", "-", "bit 1 becomes the state"],
            ],
            "result": "Cells (2,0) and (2,2) see 2 live neighbours and stay dead. The answer is [[0,1,0],[0,1,0],[0,1,0]].",
        },
        "mistakes": [
            {
                "name": "Writing the new value too early",
                "wrong": "Writing each cell's next state straight into the board as you go.",
                "right": "Later cells would count that new value as a neighbour. Keep the old state in bit 0 and always read it with `cell & 1`.",
            },
            {
                "name": "Counting the cell itself",
                "wrong": "Adding up the whole 3 x 3 square around a cell, including the middle.",
                "right": "Skip `dr == 0 && dc == 0`. Only the eight cells around it count.",
            },
            {
                "name": "Reading off the edge",
                "wrong": "Reading `board[r - 1][c]` on the top row without a check.",
                "right": "Check `0 <= nr < rows` and `0 <= nc < cols` before reading a neighbour.",
            },
            {
                "name": "Forgetting the final shift",
                "wrong": "Returning the board while cells still hold 2 or 3.",
                "right": "Shift every cell right by one at the end, so only the new state is left.",
            },
        ],
        "edge_cases": [
            {"input": "[[1]]", "expected": "[[0]]", "why": "One live cell has no neighbours, so it dies."},
            {"input": "[[1,1],[1,0]]", "expected": "[[1,1],[1,1]]", "why": "The dead corner has exactly three live neighbours."},
            {"input": "[[0,0,0],[1,1,1],[0,0,0]]", "expected": "[[0,1,0],[0,1,0],[0,1,0]]", "why": "The line flips, so writing too early gives a wrong answer here."},
            {"input": "[[1,1],[1,1]]", "expected": "[[1,1],[1,1]]", "why": "Every cell has three live neighbours, so nothing changes."},
            {"input": "[[0,0],[0,0]]", "expected": "[[0,0],[0,0]]", "why": "An empty board stays empty."},
        ],
        "interview_script": [
            "I need to move every cell one step forward, and all cells change at the same moment.",
            "My first idea is to copy the board and count neighbours in the copy. That is O(m × n) time and O(m × n) extra space.",
            "The key point I use: a cell is 0 or 1, so the int has spare bits. Bit 0 can keep the old state while bit 1 holds the new one.",
            "I count neighbours with `cell & 1`, set bit 1 when the cell lives next turn, then shift every cell right. That is O(m × n) time and O(1) space.",
            "I will test a single cell, a full 2 x 2 block, and the line of three that flips.",
        ],
        "follow_ups": [
            {
                "question": "The board is endless. How would you store it?",
                "answer": "Keep only the live cells, as a set of (row, column) pairs. Count neighbours for each live cell and the cells next to it.",
            },
            {
                "question": "The board is too big for memory and arrives one row at a time.",
                "answer": "Keep only three rows at once: the one above, the current one and the one below.",
            },
            {
                "question": "What if the edges wrap around?",
                "answer": "Use `(r + dr + rows) % rows` and the same for columns, so a neighbour off one edge comes from the other.",
            },
            {
                "question": "Run k steps instead of one.",
                "answer": "Run the same step k times. The shift clears bit 1 each time, so the trick keeps working.",
            },
        ],
        "related_slugs": ["lc-73", "lc-48", "lc-130"],
    },
    {
        "slugs": ["lc-36"],
        "pattern": "Seen table per group",
        "trigger": "No value may repeat inside several overlapping groups: each row, each column and each 3 x 3 box.",
        "summary": (
            "Every filled cell belongs to one row, one column and one box, and the box number is `(r / 3) * 3 + c / 3`. "
            "Go over the board once and mark each digit in three seen tables. A digit already marked means the board is invalid."
        ),
        "approaches": [
            {
                "name": "Check each cell against its groups",
                "idea": "For every filled cell, look along its row, down its column and around its box for the same digit.",
                "steps": [
                    "Go over the board one cell at a time and skip the empty cells.",
                    "Look at every other cell in the same row. If one holds the same digit, return false.",
                    "Do the same for every other cell in the same column.",
                    "Do the same for the other cells in its 3 x 3 box, which starts at row `(r / 3) * 3` and column `(c / 3) * 3`.",
                    "If no cell found a clash, return true.",
                ],
                "code": """class Solution {
    public boolean isValidSudoku(String[][] board) {
        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                String cell = board[r][c];
                if (cell.equals(".")) continue;
                if (!fitsHere(board, r, c, cell)) return false;
            }
        }
        return true;
    }

    private boolean fitsHere(String[][] board, int r, int c, String cell) {
        for (int i = 0; i < 9; i++) {
            if (i != c && board[r][i].equals(cell)) return false;
            if (i != r && board[i][c].equals(cell)) return false;
        }
        int top = (r / 3) * 3;
        int left = (c / 3) * 3;
        for (int br = top; br < top + 3; br++) {
            for (int bc = left; bc < left + 3; bc++) {
                if ((br != r || bc != c) && board[br][bc].equals(cell)) return false;
            }
        }
        return true;
    }
}
""",
                "time_complexity": "O(n³)",
                "time_why": "With side n (9 here), each of the n² cells scans a row, a column and a box of about n cells each.",
                "space_complexity": "O(1)",
                "space_why": "It only reads the board. A few loop counters are extra.",
                "when_to_use": "A fine first answer, since the board is small. Say it, then offer the one-pass version.",
                "is_optimal": False,
            },
            {
                "name": "One pass with three seen tables",
                "idea": "Record each digit in its row's table, its column's table and its box's table as you go.",
                "steps": [
                    "Make three 9 x 9 tables of true or false: one for rows, one for columns, one for boxes.",
                    "Go over the board once and skip the empty cells.",
                    "Turn the digit into an index 0 to 8, and find the box with `(r / 3) * 3 + c / 3`.",
                    "If the digit is already marked in the row, the column or the box table, return false.",
                    "Otherwise mark it in all three tables. If the pass ends, return true.",
                ],
                "code": """class Solution {
    public boolean isValidSudoku(String[][] board) {
        boolean[][] rows = new boolean[9][9];
        boolean[][] cols = new boolean[9][9];
        boolean[][] boxes = new boolean[9][9];
        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                String cell = board[r][c];
                if (cell.equals(".")) continue;
                int digit = cell.charAt(0) - '1';
                int box = (r / 3) * 3 + c / 3;
                if (rows[r][digit] || cols[c][digit] || boxes[box][digit]) return false;
                rows[r][digit] = true;
                cols[c][digit] = true;
                boxes[box][digit] = true;
            }
        }
        return true;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Each of the n² cells is read once and checked in three tables at a fixed cost. For 9 x 9 that is 81 cells.",
                "space_complexity": "O(n²)",
                "space_why": "Three tables of n × n marks, which is 243 marks for a 9 x 9 board.",
                "when_to_use": "The version to write. It trades a few hundred marks of memory for a single pass.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": 'row 0 = ["1",".",".",".",".",".",".",".","."], row 1 = [".","1",".",".",".",".",".",".","."], all other cells "."',
            "columns": ["cell", "value", "box", "row seen?", "column seen?", "box seen?", "what happens"],
            "rows": [
                ["(0,0)", "1", "0", "no", "no", "no", "mark 1 in row 0, column 0 and box 0"],
                ["(0,1) to (1,0)", ".", "-", "-", "-", "-", "empty, skip"],
                ["(1,1)", "1", "(1 / 3) * 3 + 1 / 3 = 0", "no", "no", "yes", "same box as (0,0): return false"],
            ],
            "result": "The two 1s share no row and no column, only box 0. The answer is false.",
        },
        "mistakes": [
            {
                "name": "Skipping the box check",
                "wrong": "Checking only the rows and the columns.",
                "right": "Two equal digits can sit in different rows and columns but the same 3 x 3 box. Check the box too.",
            },
            {
                "name": "Wrong box number",
                "wrong": "Using `r / 3 + c / 3`, which gives box 1 for both (0,3) and (3,0).",
                "right": "Multiply the box row by 3: `(r / 3) * 3 + c / 3` gives each of the nine boxes its own number, 0 to 8.",
            },
            {
                "name": "Trying to solve the board",
                "wrong": "Checking whether the empty cells can be filled in.",
                "right": "Only the filled cells must follow the rules. A board with no solution can still be valid.",
            },
            {
                "name": "Comparing text with ==",
                "wrong": "Writing `cell == \".\"` to spot an empty cell.",
                "right": "In Java `==` compares objects, not text. Use `cell.equals(\".\")`.",
            },
        ],
        "edge_cases": [
            {"input": "every cell is \".\"", "expected": "true", "why": "Nothing is filled, so nothing can clash."},
            {"input": "the example board from the problem", "expected": "true", "why": "A normal, partly filled valid board."},
            {"input": "row 0 = [\"1\",\"1\",\".\",\".\",\".\",\".\",\".\",\".\",\".\"], rest \".\"", "expected": "false", "why": "A repeat inside one row."},
            {"input": "the example board with (0,0) changed to \"8\"", "expected": "false", "why": "The 8 now clashes with the 8 lower down in column 0."},
            {"input": "\"1\" at (0,0) and at (1,1), rest \".\"", "expected": "false", "why": "Only the box check catches this one."},
        ],
        "interview_script": [
            "I need to check that no digit repeats in any row, column or 3 x 3 box, looking only at the filled cells.",
            "My first idea is to check each filled cell against its whole row, column and box. With side n that is O(n³) time and O(1) space.",
            "The key point I use: each cell belongs to exactly one row, one column and one box, and the box number is `(r / 3) * 3 + c / 3`.",
            "So I go over the board once and mark each digit in three seen tables. That is O(n²) time and O(n²) space, which is constant for 9 x 9.",
            "I will test an empty board, a row clash, a column clash, and a box clash where the rows and columns differ.",
        ],
        "follow_ups": [
            {
                "question": "Can you use less memory?",
                "answer": "Use one int per row, column and box, with one bit per digit. That is 27 ints instead of 243 marks.",
            },
            {
                "question": "Now solve the Sudoku.",
                "answer": "Use backtracking: put each digit these same tables allow into an empty cell, go deeper, and undo it on a dead end.",
            },
            {
                "question": "Could you do it with a single hash set?",
                "answer": "Yes. Add strings such as `5 in row 0`, `5 in col 3` and `5 in box 1`. A failed add means a repeat.",
            },
            {
                "question": "What changes for a 16 x 16 board with 4 x 4 boxes?",
                "answer": "Only the sizes. The box number becomes `(r / 4) * 4 + c / 4`, and each table has 16 slots.",
            },
        ],
        "related_slugs": ["lc-348", "lc-217", "lc-73"],
    },
]
