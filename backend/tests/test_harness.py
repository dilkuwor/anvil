from app.execution.harness import generate_main


def test_generate_main_for_two_sum():
    source = generate_main(
        {
            "method_name": "twoSum",
            "params": [{"name": "nums", "type": "int[]"}, {"name": "target", "type": "int"}],
            "return_type": "int[]",
            "compare": "any_order",
        }
    )
    assert "sol.twoSum(nums, target)" in source
    assert "Helpers.parseIntArray" in source
    assert "any_order" in source


def test_generate_main_for_tree():
    source = generate_main(
        {
            "method_name": "levelOrder",
            "params": [{"name": "root", "type": "TreeNode"}],
            "return_type": "List<List<Integer>>",
        }
    )
    assert "Helpers.parseTreeNode" in source
    assert "sol.levelOrder(root)" in source


def test_generate_main_for_list_node_array_and_string_matrix():
    lists = generate_main(
        {
            "method_name": "mergeKLists",
            "params": [{"name": "lists", "type": "ListNode[]"}],
            "return_type": "ListNode",
        }
    )
    assert "Helpers.parseListNodeArray" in lists
    accounts = generate_main(
        {
            "method_name": "accountsMerge",
            "params": [{"name": "accounts", "type": "List<List<String>>"}],
            "return_type": "List<List<String>>",
        }
    )
    assert "Helpers.parseStringMatrixList" in accounts


def test_generated_main_tolerates_a_parameter_named_args():
    """LRU Cache and friends take a parameter called `args`, which used to shadow main's."""
    source = generate_main(
        {
            "method_name": "process",
            "params": [
                {"name": "operations", "type": "String[]"},
                {"name": "args", "type": "int[][]"},
            ],
            "return_type": "int[]",
        }
    )
    assert "public static void main(String[] args)" not in source
    assert "int[][] args = Helpers.parseIntMatrix" in source


def test_node_returns_use_the_typed_formatter():
    """Helpers.format(null) renders "null"; an empty list or tree must render as "[]"."""
    for return_type, formatter in (("ListNode", "formatListNode"), ("TreeNode", "formatTreeNode")):
        source = generate_main(
            {
                "method_name": "solve",
                "params": [{"name": "root", "type": return_type}],
                "return_type": return_type,
            }
        )
        assert f"Helpers.{formatter}(result)" in source


def test_helpers_never_enqueue_null_into_an_array_deque():
    """formatTreeNode enqueues null children on purpose, which ArrayDeque rejects."""
    from app.execution.harness import JAVA_HELPERS

    body = JAVA_HELPERS[JAVA_HELPERS.index("formatTreeNode") :]
    body = body[: body.index("public static String formatList(")]
    assert "new LinkedList<>()" in body
    assert "new ArrayDeque<>()" not in body


def test_helpers_keep_empty_quoted_strings():
    """splitQuoted used to drop [""] to [], breaking Group Anagrams on the empty string."""
    from app.execution.harness import JAVA_HELPERS

    body = JAVA_HELPERS[JAVA_HELPERS.index("private static List<String> splitQuoted") :]
    body = body[: body.index("private static List<String> splitNullable")]
    assert "quoted" in body
    assert "if (quoted || cur.length() > 0)" in body
