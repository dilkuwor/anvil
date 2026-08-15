from app.execution.imports import inject_imports, prepare_source


def test_injects_hashmap_and_list():
    source = """
class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        List<Integer> values = new ArrayList<>();
        return new int[] {};
    }
}
"""
    prepared = inject_imports(source)
    assert "import java.util.HashMap;" in prepared
    assert "import java.util.Map;" in prepared
    assert "import java.util.List;" in prepared
    assert "import java.util.ArrayList;" in prepared
    assert prepared.index("import ") < prepared.index("class Solution")


def test_does_not_duplicate_existing_wildcard():
    source = """
import java.util.*;
class Solution {
    public void solve() {
        Map<Integer, Integer> seen = new HashMap<>();
    }
}
"""
    prepared = inject_imports(source)
    assert prepared.count("import java.util.HashMap;") == 0
    assert prepared.count("import java.util.*;") == 1


def test_does_not_import_java_lang_or_comment_mentions():
    source = """
class Solution {
    // HashMap should not be imported from this comment
    public String name() {
        return Integer.toString(1);
    }
}
"""
    prepared = inject_imports(source)
    assert "import java.util.HashMap;" not in prepared
    assert "import java.lang." not in prepared


def test_skips_user_defined_type_with_same_name():
    source = """
class HashMap {}
class Solution {
    HashMap local = new HashMap();
}
"""
    prepared = inject_imports(source)
    assert "import java.util.HashMap;" not in prepared


def test_prepare_source_strips_package_and_adds_imports():
    source = """
package evil;
class Solution {
    public void solve() {
        PriorityQueue<Integer> heap = new PriorityQueue<>();
        Stream<Integer> stream = heap.stream();
    }
}
"""
    prepared = prepare_source(source)
    assert "package " not in prepared
    assert "import java.util.PriorityQueue;" in prepared
    assert "import java.util.stream.Stream;" in prepared
