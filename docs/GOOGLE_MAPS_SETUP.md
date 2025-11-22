# Configuración de Google Maps API

## Paso 1: Obtener la API Key

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto nuevo o selecciona uno existente
3. Navega a **APIs & Services** > **Credentials**
4. Haz clic en **+ CREATE CREDENTIALS** > **API key**
5. Copia la API key generada

## Paso 2: Habilitar las APIs necesarias

En Google Cloud Console, ve a **APIs & Services** > **Library** y habilita:

- ✅ **Maps JavaScript API**
- ✅ **Places API**
- ✅ **Geocoding API** (opcional, pero recomendado)
- ✅ **Geolocation API** (opcional, para detectar ubicación del usuario)

## Paso 3: Restringir la API Key (Recomendado)

Para seguridad, restringe tu API key:

1. En **Credentials**, haz clic en tu API key
2. En **Application restrictions**:
   - Selecciona **HTTP referrers (web sites)**
   - Agrega tus dominios permitidos:
     ```
     http://localhost:*/*
     http://127.0.0.1:*/*
     https://tudominio.com/*
     ```

3. En **API restrictions**:
   - Selecciona **Restrict key**
   - Marca solo las APIs que habilitaste arriba

## Paso 4: Reemplazar en los archivos HTML

Busca en los siguientes archivos la línea:

```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places,geometry"></script>
```

Y reemplaza `YOUR_GOOGLE_MAPS_API_KEY` con tu API key real.

### Archivos que necesitan la API key:

- ✅ **webapp/buscar-usuarios.html** (línea ~11)
- ✅ **webapp/cita-detalle.html** (si usa mapas)

## Paso 5: Verificar

1. Abre la aplicación en el navegador
2. Abre la consola de desarrollador (F12)
3. Si ves errores de Google Maps, revisa:
   - Que la API key esté correctamente copiada
   - Que las APIs estén habilitadas en Google Cloud
   - Que los dominios estén permitidos en las restricciones

## Costos

Google Maps ofrece **$200 USD en créditos gratuitos** cada mes, lo que cubre aproximadamente:

- 28,000 cargas de mapa
- 100,000 solicitudes de geocodificación
- 40,000 solicitudes de Places API

Para la mayoría de aplicaciones pequeñas/medianas, esto es suficiente para mantenerse en el nivel gratuito.

## Solución de Problemas

### Error: "This API project is not authorized to use this API"

**Solución:** Habilita las APIs necesarias en Google Cloud Console (Paso 2).

### Error: "RefererNotAllowedMapError"

**Solución:** Agrega tu dominio a las restricciones de HTTP referrers (Paso 3).

### Error: "InvalidKeyMapError"

**Solución:** Verifica que hayas copiado correctamente la API key completa.

## Comando rápido para reemplazar (Linux/Mac)

```bash
# Reemplaza YOUR_GOOGLE_MAPS_API_KEY con tu API key real
find webapp -name "*.html" -type f -exec sed -i 's/YOUR_GOOGLE_MAPS_API_KEY/TU_API_KEY_AQUI/g' {} +
```

## Referencias

- [Documentación oficial de Google Maps Platform](https://developers.google.com/maps/documentation)
- [Guía de precios](https://developers.google.com/maps/billing-and-pricing/pricing)
- [Best practices de seguridad](https://developers.google.com/maps/api-security-best-practices)
