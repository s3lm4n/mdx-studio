from __future__ import annotations

import ast
from pathlib import Path


def test_discovery_runner_accepts_only_version_argv_without_a_shell() -> None:
    source = Path(__file__).parents[1] / "src/mdx_runtime/providers/gromacs.py"
    nodes = list(ast.walk(ast.parse(source.read_text(encoding="utf-8"))))
    argv_values = [
        ast.unparse(node.value)
        for node in nodes
        if isinstance(node, ast.Assign)
        and any(isinstance(target, ast.Name) and target.id == "argv" for target in node.targets)
    ]
    calls = [
        node
        for node in nodes
        if isinstance(node, ast.Call) and ast.unparse(node.func) == "self._run"
    ]

    assert argv_values == ["[str(selected), '--version']"]
    assert len(calls) == 1
    assert [ast.unparse(arg) for arg in calls[0].args] == ["argv"]
    assert {keyword.arg: ast.unparse(keyword.value) for keyword in calls[0].keywords}.get(
        "shell"
    ) == "False"
