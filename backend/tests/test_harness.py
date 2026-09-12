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
