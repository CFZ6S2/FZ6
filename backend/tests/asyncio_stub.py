"""Compatibilidad ligera para pruebas ``asyncio`` sin ``pytest-asyncio``.

Permite ejecutar pruebas marcadas con ``@pytest.mark.asyncio`` incluso si
``pytest-asyncio`` no está instalado, imitando el comportamiento básico del
plugin oficial para no bloquear la suite en entornos minimalistas.
"""

from __future__ import annotations

import asyncio
import inspect
import warnings

import pytest

try:
    import pytest_asyncio  # type: ignore  # noqa: F401

    HAS_PYTEST_ASYNCIO = True
except Exception:
    HAS_PYTEST_ASYNCIO = False


def pytest_addoption(parser: pytest.Parser) -> None:
    """Registrar la opción ``asyncio_mode`` si falta el plugin real."""

    if HAS_PYTEST_ASYNCIO:
        return

    parser.addini("asyncio_mode", "Compatibilidad básica de asyncio", default="auto")


def pytest_configure(config: pytest.Config) -> None:
    """Añadir el marcador ``asyncio`` cuando no hay soporte oficial."""

    if HAS_PYTEST_ASYNCIO:
        return

    config.addinivalue_line(
        "markers", "asyncio: marca pruebas que se ejecutan con asyncio"
    )

    warnings.warn(
        "pytest-asyncio no está instalado; las pruebas async se ejecutarán "
        "usando asyncio.run().",
        RuntimeWarning,
    )


def pytest_pyfunc_call(pyfuncitem: pytest.Function) -> bool | None:
    """Ejecutar corrutinas usando ``asyncio.run`` cuando falta el plugin."""

    if HAS_PYTEST_ASYNCIO:
        return None

    testfunction = pyfuncitem.obj

    if inspect.iscoroutinefunction(testfunction):
        call_args = {
            name: pyfuncitem.funcargs[name]
            for name in pyfuncitem._fixtureinfo.argnames
            if name in pyfuncitem.funcargs
        }

        asyncio.run(testfunction(**call_args))
        return True

    return None
