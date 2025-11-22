# 🚀 Quick Start - TuCitaSegura Backend

Guía rápida para tener el backend funcionando en 5 minutos.

## ⚡ Inicio Rápido con Docker

```bash
# 1. Clonar repositorio
git clone https://github.com/your-repo/tucitasegura.git
cd tucitasegura/backend

# 2. Crear archivo .env
cp .env.example .env

# 3. Editar .env mínimo (obligatorio)
nano .env

# Configurar al menos:
# - FIREBASE_PROJECT_ID=your-project-id
# - SECRET_KEY=your-secret-key (generar con comando abajo)
# - DATABASE_URL=postgresql://tucitasegura:changeme@postgres:5432/tucitasegura

# 4. Generar SECRET_KEY seguro
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"
# Copiar el output al .env

# 5. Levantar todo
docker-compose up -d

# 6. Ver logs
docker-compose logs -f api

# 7. Abrir documentación
# http://localhost:8000/docs
```

## ✅ Verificar que Funciona

```bash
# Health check
curl http://localhost:8000/health

# Debería retornar:
# {
#   "status": "healthy",
#   "version": "1.0.0",
#   "timestamp": "...",
#   "services": {...}
# }
```

## 🧪 Probar Endpoints

### 1. Recomendaciones ML

```bash
curl -X POST http://localhost:8000/api/v1/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test123",
    "limit": 5
  }'
```

### 2. Verificar Foto

```bash
curl -X POST http://localhost:8000/api/v1/verify-photo \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/photo.jpg",
    "user_id": "test123",
    "claimed_age": 28
  }'
```

### 3. Verificar Ubicación

```bash
curl -X POST http://localhost:8000/api/v1/verify-location \
  -H "Content-Type: application/json" \
  -d '{
    "claimed_location": {"lat": 40.4168, "lng": -3.7038},
    "user_gps": {"lat": 40.4170, "lng": -3.7040},
    "tolerance_meters": 250
  }'
```

## 🔧 Comandos Útiles

```bash
# Ver todos los contenedores
docker-compose ps

# Parar todo
docker-compose down

# Parar y eliminar volúmenes (CUIDADO: borra la DB)
docker-compose down -v

# Ver logs en tiempo real
docker-compose logs -f

# Solo logs de la API
docker-compose logs -f api

# Reiniciar solo la API
docker-compose restart api

# Ejecutar comando en contenedor
docker-compose exec api python -c "print('Hello')"

# Acceder a shell del contenedor
docker-compose exec api /bin/bash

# Ver DB con psql
docker-compose exec postgres psql -U tucitasegura

# Ver Redis
docker-compose exec redis redis-cli
```

## 📊 Acceder a Servicios

| Servicio | URL | Descripción |
|----------|-----|-------------|
| API Docs | http://localhost:8000/docs | Swagger UI interactivo |
| ReDoc | http://localhost:8000/redoc | Documentación alternativa |
| Health | http://localhost:8000/health | Health check |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Cache |
| Flower | http://localhost:5555 | Celery monitoring |

## 🐛 Troubleshooting

### Error: "Port 8000 already in use"

```bash
# Encontrar proceso usando puerto 8000
lsof -i :8000

# Matar proceso
kill -9 <PID>

# O cambiar puerto en docker-compose.yml
ports:
  - "8001:8000"  # Usar 8001 en vez de 8000
```

### Error: "Connection to database failed"

```bash
# Verificar que postgres esté corriendo
docker-compose ps postgres

# Ver logs de postgres
docker-compose logs postgres

# Reiniciar postgres
docker-compose restart postgres
```

### Error: "Import Error: No module named 'app'"

```bash
# Reconstruir imagen
docker-compose build api

# O instalar localmente
pip install -r requirements.txt
```

## 🔥 Desarrollo Local (Sin Docker)

```bash
# 1. Crear virtual environment
python3 -m venv venv
source venv/bin/activate

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Instalar PostgreSQL y Redis
# Ubuntu:
sudo apt-get install postgresql redis-server

# macOS:
brew install postgresql redis

# 4. Crear base de datos
createdb tucitasegura

# 5. Configurar .env para usar localhost
DATABASE_URL=postgresql://user:password@localhost:5432/tucitasegura
REDIS_URL=redis://localhost:6379/0

# 6. Ejecutar
uvicorn main:app --reload --port 8000

# 7. En otra terminal: Celery worker
celery -A app.tasks worker --loglevel=info
```

## 🚀 Deploy Rápido a Producción

### Railway (1 minuto)

```bash
# 1. Instalar Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Inicializar proyecto
railway init

# 4. Deploy
railway up

# 5. Agregar PostgreSQL addon
railway add postgresql

# 6. Agregar Redis addon
railway add redis

# 7. Configurar variables de entorno en dashboard
# https://railway.app/dashboard
```

### Render (2 minutos)

1. Push código a GitHub
2. Ir a https://render.com
3. New → Web Service
4. Conectar repo
5. Configurar:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Agregar PostgreSQL database
7. Agregar Redis instance
8. Deploy

## 📚 Próximos Pasos

1. ✅ Ver documentación completa: `README.md`
2. ✅ Explorar API interactiva: http://localhost:8000/docs
3. ✅ Leer endpoints disponibles
4. ✅ Probar con datos reales
5. ✅ Integrar con frontend

## 💡 Tips

- Usa **Swagger UI** (http://localhost:8000/docs) para probar endpoints interactivamente
- Los endpoints retornan JSON por defecto
- Todos los endpoints requieren Content-Type: application/json
- Usa **Flower** para monitorear tareas asíncronas
- Revisa logs con `docker-compose logs -f` para debugging

## 🆘 Ayuda

¿Problemas? Abre un issue en GitHub o contacta:
- Email: soporte@tucitasegura.com
- Discord: https://discord.gg/tucitasegura

---

**¡Listo! Ahora tienes el backend funcionando** 🎉
