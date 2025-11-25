# Resumen de avance del proyecto

Este documento recopila, en español y de forma breve, las mejoras más recientes:

- **Copias de seguridad de Firestore**: hay pruebas unitarias completas con clientes simulados que disparan exportaciones, listan respaldos y verifican los archivos mínimos requeridos sin depender de servicios externos. El código vive en `backend/tests/test_backup_service.py`.
- **Compatibilidad de pruebas**: se añadieron "shims" ligeros para ejecutar `@pytest.mark.asyncio` y mantener opciones de cobertura incluso cuando faltan `pytest-asyncio` o `pytest-cov`; están en `backend/tests/asyncio_stub.py` y `backend/tests/cov_stub.py`, registrados vía `backend/tests/conftest.py`.
- **App Check**: el script `webapp/js/firebase-appcheck.js` ahora inicializa reCAPTCHA Enterprise automáticamente en dominios permitidos y admite tokens de depuración persistentes para evitar la espera de 24 h. La guía rápida asociada está en `docs/APP_CHECK_CONEXION_RAPIDA.md`.
- **SDKs de Anthropic**: `docs/ANTHROPIC_SDKS.md` contiene requisitos e instrucciones de instalación en español para los SDK oficiales en Java, Go, C#, Ruby y PHP, incluyendo el uso del espacio de nombres `beta` para funciones en vista previa.

Si necesitas más detalle o prioridad sobre próximos pasos, avísame y los agrego aquí.
