from __future__ import annotations

JAVA_HELPERS = r"""
import java.util.*;

public final class Helpers {
    private Helpers() {}

    public static String readAll(Scanner sc) {
        StringBuilder sb = new StringBuilder();
        while (sc.hasNextLine()) {
            if (sb.length() > 0) sb.append('\n');
            sb.append(sc.nextLine());
        }
        return sb.toString();
    }

    public static String nextNonEmpty(Scanner sc) {
        while (sc.hasNextLine()) {
            String line = sc.nextLine();
            if (!line.trim().isEmpty()) {
                return line;
            }
        }
        return "";
    }

    public static int parseInt(String s) {
        return Integer.parseInt(s.trim());
    }

    public static long parseLong(String s) {
        return Long.parseLong(s.trim());
    }

    public static double parseDouble(String s) {
        return Double.parseDouble(s.trim());
    }

    public static boolean parseBoolean(String s) {
        return Boolean.parseBoolean(s.trim());
    }

    public static String parseString(String s) {
        String t = s.trim();
        if (t.length() >= 2 && t.startsWith("\"") && t.endsWith("\"")) {
            return unescape(t.substring(1, t.length() - 1));
        }
        return t;
    }

    public static int[] parseIntArray(String s) {
        List<Integer> values = parseIntList(s);
        int[] arr = new int[values.size()];
        for (int i = 0; i < values.size(); i++) arr[i] = values.get(i);
        return arr;
    }

    public static long[] parseLongArray(String s) {
        List<Long> values = new ArrayList<>();
        for (String token : splitArray(s)) values.add(Long.parseLong(token));
        long[] arr = new long[values.size()];
        for (int i = 0; i < values.size(); i++) arr[i] = values.get(i);
        return arr;
    }

    public static String[] parseStringArray(String s) {
        List<String> values = parseStringList(s);
        return values.toArray(new String[0]);
    }

    public static char[] parseCharArray(String s) {
        List<String> values = parseStringList(s);
        char[] arr = new char[values.size()];
        for (int i = 0; i < values.size(); i++) {
            String v = values.get(i);
            arr[i] = v.isEmpty() ? '\0' : v.charAt(0);
        }
        return arr;
    }

    public static int[][] parseIntMatrix(String s) {
        List<List<Integer>> rows = parseIntMatrixList(s);
        int[][] matrix = new int[rows.size()][];
        for (int i = 0; i < rows.size(); i++) {
            List<Integer> row = rows.get(i);
            matrix[i] = new int[row.size()];
            for (int j = 0; j < row.size(); j++) matrix[i][j] = row.get(j);
        }
        return matrix;
    }

    public static List<Integer> parseIntList(String s) {
        List<Integer> values = new ArrayList<>();
        for (String token : splitArray(s)) {
            if (!token.isEmpty()) values.add(Integer.parseInt(token));
        }
        return values;
    }

    public static List<String> parseStringList(String s) {
        List<String> values = new ArrayList<>();
        for (String token : splitQuoted(s)) values.add(token);
        return values;
    }

    public static List<List<Integer>> parseIntMatrixList(String s) {
        String t = s.trim();
        List<List<Integer>> rows = new ArrayList<>();
        if (t.equals("[]")) return rows;
        if (t.startsWith("[")) t = t.substring(1);
        if (t.endsWith("]")) t = t.substring(0, t.length() - 1);
        int depth = 0;
        int start = 0;
        for (int i = 0; i < t.length(); i++) {
            char c = t.charAt(i);
            if (c == '[') {
                if (depth == 0) start = i;
                depth++;
            } else if (c == ']') {
                depth--;
                if (depth == 0) rows.add(parseIntList(t.substring(start, i + 1)));
            }
        }
        return rows;
    }

    public static ListNode parseListNode(String s) {
        List<Integer> values = parseIntList(s);
        ListNode dummy = new ListNode(0);
        ListNode cur = dummy;
        for (int v : values) {
            cur.next = new ListNode(v);
            cur = cur.next;
        }
        return dummy.next;
    }

    public static TreeNode parseTreeNode(String s) {
        List<String> tokens = splitNullable(s);
        if (tokens.isEmpty() || tokens.get(0).equalsIgnoreCase("null")) return null;
        TreeNode root = new TreeNode(Integer.parseInt(tokens.get(0)));
        Queue<TreeNode> q = new ArrayDeque<>();
        q.add(root);
        int i = 1;
        while (!q.isEmpty() && i < tokens.size()) {
            TreeNode node = q.poll();
            if (i < tokens.size() && !tokens.get(i).equalsIgnoreCase("null")) {
                node.left = new TreeNode(Integer.parseInt(tokens.get(i)));
                q.add(node.left);
            }
            i++;
            if (i < tokens.size() && !tokens.get(i).equalsIgnoreCase("null")) {
                node.right = new TreeNode(Integer.parseInt(tokens.get(i)));
                q.add(node.right);
            }
            i++;
        }
        return root;
    }

    public static String format(Object value) {
        if (value == null) return "null";
        if (value instanceof int[] arr) return formatIntArray(arr);
        if (value instanceof long[] arr) return formatLongArray(arr);
        if (value instanceof double[] arr) return formatDoubleArray(arr);
        if (value instanceof char[] arr) return formatCharArray(arr);
        if (value instanceof String[] arr) return formatStringArray(arr);
        if (value instanceof int[][] matrix) return formatIntMatrix(matrix);
        if (value instanceof ListNode node) return formatListNode(node);
        if (value instanceof TreeNode node) return formatTreeNode(node);
        if (value instanceof List<?> list) return formatList(list);
        if (value instanceof String str) return "\"" + escape(str) + "\"";
        if (value instanceof Double || value instanceof Float) {
            return stripTrailingZeros(String.format(Locale.US, "%.10f", ((Number) value).doubleValue()));
        }
        if (value instanceof Boolean || value instanceof Number) return String.valueOf(value);
        return String.valueOf(value);
    }

    public static String formatIntArray(int[] arr) {
        if (arr == null) return "null";
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < arr.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(arr[i]);
        }
        return sb.append(']').toString();
    }

    public static String formatLongArray(long[] arr) {
        if (arr == null) return "null";
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < arr.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(arr[i]);
        }
        return sb.append(']').toString();
    }

    public static String formatDoubleArray(double[] arr) {
        if (arr == null) return "null";
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < arr.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(stripTrailingZeros(String.format(Locale.US, "%.10f", arr[i])));
        }
        return sb.append(']').toString();
    }

    public static String formatCharArray(char[] arr) {
        if (arr == null) return "null";
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < arr.length; i++) {
            if (i > 0) sb.append(',');
            sb.append('"').append(arr[i]).append('"');
        }
        return sb.append(']').toString();
    }

    public static String formatStringArray(String[] arr) {
        if (arr == null) return "null";
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < arr.length; i++) {
            if (i > 0) sb.append(',');
            sb.append('"').append(escape(arr[i])).append('"');
        }
        return sb.append(']').toString();
    }

    public static String formatIntMatrix(int[][] matrix) {
        if (matrix == null) return "null";
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < matrix.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(formatIntArray(matrix[i]));
        }
        return sb.append(']').toString();
    }

    public static String formatListNode(ListNode node) {
        StringBuilder sb = new StringBuilder("[");
        Set<ListNode> seen = Collections.newSetFromMap(new IdentityHashMap<>());
        boolean first = true;
        while (node != null) {
            if (!seen.add(node)) break;
            if (!first) sb.append(',');
            sb.append(node.val);
            first = false;
            node = node.next;
        }
        return sb.append(']').toString();
    }

    public static String formatTreeNode(TreeNode root) {
        if (root == null) return "[]";
        List<String> out = new ArrayList<>();
        Queue<TreeNode> q = new ArrayDeque<>();
        q.add(root);
        while (!q.isEmpty()) {
            TreeNode node = q.poll();
            if (node == null) {
                out.add("null");
                continue;
            }
            out.add(String.valueOf(node.val));
            q.add(node.left);
            q.add(node.right);
        }
        int end = out.size() - 1;
        while (end >= 0 && out.get(end).equals("null")) end--;
        return "[" + String.join(",", out.subList(0, end + 1)) + "]";
    }

    public static String formatList(List<?> list) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            if (i > 0) sb.append(',');
            Object item = list.get(i);
            if (item instanceof String str) sb.append('"').append(escape(str)).append('"');
            else sb.append(format(item));
        }
        return sb.append(']').toString();
    }

    public static boolean outputsEqual(String actual, String expected, String compare) {
        String a = normalize(actual);
        String e = normalize(expected);
        if (a.equals(e)) return true;
        if ("any_order".equals(compare)) {
            return sameMultiset(a, e);
        }
        return false;
    }

    public static String normalize(String s) {
        if (s == null) return "";
        return s.trim().replace(" ", "").replace("\r", "");
    }

    private static boolean sameMultiset(String a, String e) {
        if (a.startsWith("[") && e.startsWith("[")) {
            List<String> left = tokenizeTop(a);
            List<String> right = tokenizeTop(e);
            Collections.sort(left);
            Collections.sort(right);
            return left.equals(right);
        }
        return a.equals(e);
    }

    private static List<String> tokenizeTop(String s) {
        String t = s.trim();
        if (t.startsWith("[")) t = t.substring(1);
        if (t.endsWith("]")) t = t.substring(0, t.length() - 1);
        List<String> items = new ArrayList<>();
        int depth = 0;
        boolean quote = false;
        StringBuilder cur = new StringBuilder();
        for (int i = 0; i < t.length(); i++) {
            char c = t.charAt(i);
            if (c == '"' && (i == 0 || t.charAt(i - 1) != '\\')) quote = !quote;
            if (!quote) {
                if (c == '[' || c == '{') depth++;
                if (c == ']' || c == '}') depth--;
                if (c == ',' && depth == 0) {
                    items.add(cur.toString());
                    cur.setLength(0);
                    continue;
                }
            }
            cur.append(c);
        }
        if (cur.length() > 0) items.add(cur.toString());
        return items;
    }

    private static List<String> splitArray(String s) {
        String t = stripBrackets(s);
        if (t.isEmpty()) return List.of();
        List<String> out = new ArrayList<>();
        for (String part : t.split(",")) {
            String token = part.trim();
            if (!token.isEmpty()) out.add(token);
        }
        return out;
    }

    private static List<String> splitQuoted(String s) {
        String t = stripBrackets(s);
        List<String> out = new ArrayList<>();
        if (t.isEmpty()) return out;
        boolean quote = false;
        StringBuilder cur = new StringBuilder();
        for (int i = 0; i < t.length(); i++) {
            char c = t.charAt(i);
            if (c == '"' && (i == 0 || t.charAt(i - 1) != '\\')) {
                quote = !quote;
                continue;
            }
            if (c == ',' && !quote) {
                out.add(unescape(cur.toString().trim()));
                cur.setLength(0);
                continue;
            }
            cur.append(c);
        }
        if (cur.length() > 0) out.add(unescape(cur.toString().trim()));
        return out;
    }

    private static List<String> splitNullable(String s) {
        String t = stripBrackets(s);
        if (t.isEmpty()) return List.of();
        List<String> out = new ArrayList<>();
        for (String part : t.split(",")) out.add(part.trim());
        return out;
    }

    private static String stripBrackets(String s) {
        String t = s.trim();
        if (t.startsWith("[")) t = t.substring(1);
        if (t.endsWith("]")) t = t.substring(0, t.length() - 1);
        return t.trim();
    }

    private static String unescape(String s) {
        return s.replace("\\\"", "\"").replace("\\\\", "\\").replace("\\n", "\n");
    }

    private static String escape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private static String stripTrailingZeros(String s) {
        if (!s.contains(".")) return s;
        int end = s.length() - 1;
        while (end > 0 && s.charAt(end) == '0') end--;
        if (s.charAt(end) == '.') end--;
        return s.substring(0, end + 1);
    }
}
""".strip()


LIST_NODE_JAVA = """
public class ListNode {
    public int val;
    public ListNode next;
    public ListNode() {}
    public ListNode(int val) { this.val = val; }
    public ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}
""".strip()


TREE_NODE_JAVA = """
public class TreeNode {
    public int val;
    public TreeNode left;
    public TreeNode right;
    public TreeNode() {}
    public TreeNode(int val) { this.val = val; }
    public TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}
""".strip()


_PARSE_MAP = {
    "int": "Helpers.parseInt",
    "long": "Helpers.parseLong",
    "double": "Helpers.parseDouble",
    "boolean": "Helpers.parseBoolean",
    "char": "Helpers.parseString({src}).charAt(0)",
    "String": "Helpers.parseString",
    "int[]": "Helpers.parseIntArray",
    "long[]": "Helpers.parseLongArray",
    "String[]": "Helpers.parseStringArray",
    "char[]": "Helpers.parseCharArray",
    "int[][]": "Helpers.parseIntMatrix",
    "List<Integer>": "Helpers.parseIntList",
    "List<String>": "Helpers.parseStringList",
    "List<List<Integer>>": "Helpers.parseIntMatrixList",
    "ListNode": "Helpers.parseListNode",
    "TreeNode": "Helpers.parseTreeNode",
}


def sanitize_source(source: str) -> str:
    """Strip package declarations so user code stays in the sandbox workspace."""
    lines = []
    for line in source.replace("\r\n", "\n").split("\n"):
        if line.strip().startswith("package "):
            continue
        lines.append(line)
    return "\n".join(lines).strip() + "\n"


def generate_main(signature: dict) -> str:
    class_name = signature.get("class_name", "Solution")
    method_name = signature["method_name"]
    params = signature.get("params", [])
    return_type = signature.get("return_type", "void")
    compare = signature.get("compare", "exact")

    parse_lines = []
    arg_names = []
    for index, param in enumerate(params):
        ptype = param["type"]
        pname = param.get("name", f"arg{index}")
        arg_names.append(pname)
        parser = _PARSE_MAP.get(ptype)
        if parser is None:
            raise ValueError(f"Unsupported Java type in signature: {ptype}")
        if "{src}" in parser:
            parse_lines.append(f"        {ptype} {pname} = {parser.format(src='Helpers.nextNonEmpty(sc)')};")
        else:
            parse_lines.append(f"        {ptype} {pname} = {parser}(Helpers.nextNonEmpty(sc));")

    call = f"sol.{method_name}({', '.join(arg_names)})"
    if return_type == "void":
        invoke = f"        {call};\n        System.out.print(\"\");"
    else:
        invoke = f"        {return_type} result = {call};\n        System.out.print(Helpers.format(result));"

    return f"""
import java.util.*;

public class Main {{
    public static void main(String[] args) throws Exception {{
        Scanner sc = new Scanner(System.in);
        {class_name} sol = new {class_name}();
{chr(10).join(parse_lines)}
{invoke}
    }}

    public static String compareMode() {{
        return "{compare}";
    }}
}}
""".strip()
