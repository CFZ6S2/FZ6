"""Lightweight pytest-cov compatibility shim.

Allows running the test suite in environments where ``pytest-cov`` isn't
installed by registering the coverage-related options declared in
``pyproject.toml``. If the real plugin is present, this shim stays inert.
"""

import warnings

import pytest

try:
    import pytest_cov  # type: ignore  # noqa: F401

    HAS_PYTEST_COV = True
except Exception:
    HAS_PYTEST_COV = False


def pytest_addoption(parser: pytest.Parser) -> None:
    if HAS_PYTEST_COV:
        return

    group = parser.getgroup("cov", "coverage options")
    group.addoption("--cov", action="append", default=[], help="Stub coverage option")
    group.addoption(
        "--cov-report",
        action="append",
        default=[],
        help="Stub coverage report option",
    )
    group.addoption(
        "--cov-fail-under",
        action="store",
        default=None,
        help="Stub coverage threshold option",
    )


def pytest_configure(config: pytest.Config) -> None:
    if config.pluginmanager.has_plugin("pytest_cov"):
        return

    warnings.warn(
        "pytest-cov not installed; coverage options are being ignored.",
        RuntimeWarning,
    )
