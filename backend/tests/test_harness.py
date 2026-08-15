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
