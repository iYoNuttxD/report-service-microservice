# Report Service (PT-BR)

Microserviço de relatórios e indicadores consolidados, construído com Clean Architecture e Vertical Slice, seguindo os mesmos padrões e convenções dos demais serviços do ecossistema (orders-service, delivery-service e notification-service).

- Runtime: Node.js 18+
- Banco: MongoDB (Atlas ou local)
- Mensageria: NATS
- Autorização: OPA (Open Policy Agent)
- Autenticação: JWT/JWKS
- Observabilidade: Logs estruturados + Métricas Prometheus
- Documentação: Swagger UI em `/api-docs`
- Imagem oficial no Docker Hub: [https://hub.docker.com/r/iyonuttxd/report-service](https://hub.docker.com/r/iyonuttxd/report-service)
---

## 📋 Sumário

- [Visão Geral](#-visão-geral)
- [Arquitetura](#-arquitetura)
- [Estrutura de Pastas](#-estrutura-de-pastas)
- [Endpoints](#-endpoints)
- [Configuração (variáveis de ambiente)](#-configuração-variáveis-de-ambiente)
- [Início Rápido (local)](#-início-rápido-local)
- [MongoDB (coleções e índices)](#-mongodb-coleções-e-índices)
- [Mensageria (NATS)](#-mensageria-nats)
- [OPA (Autorização)](#-opa-autorização)
- [Métricas Prometheus](#-métricas-prometheus)
- [Deploy com Docker](#-deploy-com-docker)
- [CI/CD para Docker Hub](#-cicd-para-docker-hub)
- [Azure App Service](#-azure-app-service)
- [Testes](#-testes)
- [Troubleshooting](#-troubleshooting)
- [Licença](#-licença)

---

## 🎯 Visão Geral

O Report Service é responsável por:
- Receber eventos de domínio via NATS e logs/métricas (via pipeline existente/Fluentd).
- Agregar dados com idempotência e gerar relatórios / indicadores.
- Expor APIs REST autenticadas/autorizadas para consulta.
- Persistir dados consolidados no MongoDB (`reports_db`).
- Consultar OPA (Open Policy Agent) para autorização baseada em políticas.

---

## 🏗 Arquitetura

O projeto segue Clean Architecture com Vertical Slice:

```
src/
├── domain/              # Regras de negócio (sem dependências de framework)
│   ├── entities/        # Entidades (Report)
│   ├── value-objects/   # Objetos de valor (Period)
│   ├── ports/           # Interfaces (ports)
│   └── services/        # Serviços de domínio (AggregationStrategy)
├── features/
│   └── reports/
│       ├── application/ # Casos de uso (use cases)
│       └── http/        # Rotas e handlers Express
├── infra/               # Adapters de infraestrutura
│   ├── db/              # Conexão/índices MongoDB
│   ├── repositories/    # Implementações de repositórios
│   ├── adapters/        # NATS, OPA, Auth (JWT), Métricas
│   └── utils/           # Logger e utilitários
└── main/
    ├── container.js     # Injeção de dependências
    ├── app.js           # App Express (middlewares, swagger)
    ├── subscribers.js   # Assinaturas NATS
    └── server.js        # Bootstrap do servidor
```

Princípios:
- Domain não importa infra/framework.
- Handlers HTTP dependem de casos de uso/ports.
- Índices do Mongo centralizados em `infra/db/ensureIndexes.js`.

---

## 🗂 Estrutura de Pastas

- `src/domain`: regras de negócio puras.
- `src/features/reports`: vertical slice de relatórios (HTTP + casos de uso).
- `src/infra`: adapters para Mongo, NATS, OPA, Auth, métricas e utilitários.
- `src/main`: composição da aplicação (container, app, server, subscribers).
- `docs/openapi.yaml`: especificação OpenAPI (Swagger UI em `/api-docs`).

---

## 🔌 Endpoints

- `GET /api/v1/health` — healthcheck.
- `GET /api/v1/metrics` — métricas Prometheus.
- `GET /api/v1/reports` — lista relatórios com filtros básicos:
  - `type`, `from`, `to`, `status`, `page`, `limit`
- `GET /api/v1/reports/:id` — detalhe de relatório.
- `GET /api/v1/reports/metrics` — snapshot de métricas agregadas.
- `GET /api-docs` — Swagger UI
- `GET /api-docs/openapi.yaml` — Spec OpenAPI

Autenticação/Autorização:
- Quando `AUTH_JWT_REQUIRED=true`, endpoints `/api/v1/reports*` exigem JWT Bearer.
- OPA é consultado para autorização fina (fail-open configurável).

---

## ⚙️ Configuração (variáveis de ambiente)

Essenciais:
- `PORT` (default: `3010`)
- `NODE_ENV` (`development` | `production`)
- `LOG_LEVEL` (`info`, `debug`, `warn`, `error`)

MongoDB:
- `MONGODB_URI` (ou `REPORTS_MONGO_URI`) — ex: `mongodb+srv://user:pass@cluster`
- `REPORTS_MONGO_DB_NAME` (default: `reports_db`)
- `RETENTION_DAYS` (TTL de relatórios; default: `90`)
- `EVENT_INBOX_TTL_DAYS` (TTL de idempotência; default: `30`)

NATS:
- `NATS_URL` — ex: `nats://localhost:4222`
- `NATS_SUBJECTS` — ex: `orders.created,orders.updated,delivery.completed`
- `NATS_QUEUE_GROUP` — ex: `report-service`
- `NATS_JETSTREAM_ENABLED` — `false` (ou `true` se aplicável)

Auth / JWT:
- `AUTH_JWT_REQUIRED` — `true`|`false`
- `AUTH_JWT_ISSUER` — ex: `https://auth.example.com`
- `AUTH_JWT_AUDIENCE` — ex: `report-service-api`
- `AUTH_JWKS_URI` — ex: `https://auth.example.com/.well-known/jwks.json`
- `AUTH_JWT_SECRET` — DEV somente (não usar em prod)

OPA:
- `OPA_URL` — ex: `http://localhost:8181`
- `OPA_POLICY_PATH` — ex: `/v1/data/reports/allow`
- `OPA_FAIL_OPEN` — `true` (default)
- `OPA_TIMEOUT_MS` — `3000`

API / CORS / Rate-limit / Métricas:
- `API_VERSION` — `v1`
- `CORS_ENABLED` — `true`
- `CORS_ORIGIN` — `*`
- `RATE_LIMIT_WINDOW_MS` — `60000`
- `RATE_LIMIT_MAX_REQUESTS` — `100`
- `METRICS_ENABLED` — `true`

---

## 🧑‍💻 Início Rápido (local)

```bash
# 1) Clonar e instalar
git clone https://github.com/iYoNuttxD/report-service-microservice.git
cd report-service-microservice
npm install

# 2) Configurar .env
cp .env.example .env
# edite .env com sua URI do MongoDB, OPA, NATS etc.

# 3) Rodar
npm run dev     # desenvolvimento (nodemon)
# ou
npm start       # produção (NODE_ENV=production)

# 4) Testar
curl http://localhost:3010/api/v1/health
curl http://localhost:3010/api-docs
```

---

## 🗄 MongoDB (coleções e índices)

Coleções sugeridas:
- `reports` — documentos de relatórios consolidados (índices por tipo/período, TTL por `generatedAt`).
- `events_inbox` — idempotência por `eventId` (índice único; TTL por `processedAt`).
- `metrics_snapshots` — snapshots agregados (índices por `type` e `snapshotAt`).

Os índices são criados no startup via `ensureIndexes()` (idempotente).  
Se preferir, há scripts de inicialização no diretório `scripts/` (consulte documentação interna, se incluída).

---

## ✉️ Mensageria (NATS)

- Assinatura configurável via `NATS_SUBJECTS`.
- Usa queue group (`NATS_QUEUE_GROUP`) para concorrência segura.
- Idempotência garantida via `events_inbox` (evita duplicar agregações).
- JetStream opcional (`NATS_JETSTREAM_ENABLED`).

---

## ✅ OPA (Autorização)

- Cliente `AuthPolicyClient` consulta OPA com input `{ user, action, resource }`.
- Fail-open configurável: `OPA_FAIL_OPEN=true` permite seguir mesmo com falhas no OPA (útil para alta disponibilidade).

---

## 📈 Métricas Prometheus

Expostas em `/api/v1/metrics`. Exemplos:
- `reports_generated_total`
- `events_processed_total`
- `events_skipped_idempotent_total`
- `aggregation_duration_ms` (histograma)
- `active_reports_count`
- `http_requests_total`, `http_request_duration_ms`

---

## 🐳 Deploy com Docker

Build local:
```bash
docker build -t report-service:latest .
docker run -d --name report-service \
  -p 3010:3010 \
  -e MONGODB_URI="mongodb+srv://user:pass@cluster" \
  -e NATS_URL="nats://nats:4222" \
  report-service:latest
```

Compose (exemplo mínimo):
```yaml
version: '3.8'
services:
  report-service:
    build: .
    ports: ["3010:3010"]
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017
      - REPORTS_MONGO_DB_NAME=reports_db
      - NATS_URL=nats://nats:4222
    depends_on: [mongo, nats]
  mongo:
    image: mongo:6
    ports: ["27017:27017"]
  nats:
    image: nats:latest
    ports: ["4222:4222"]
```

---

## 🚢 CI/CD para Docker Hub

Este repositório inclui um workflow (`.github/workflows/docker-build-and-publish.yml`) que:
- Executa testes.
- Faz build multi-arch (amd64/arm64).
- Publica para o Docker Hub.

Defina os segredos no GitHub (Settings → Secrets and variables → Actions):
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN` (token de acesso ou senha)

Opcional:
- `IMAGE_NAME` (default: `report-service`), se quiser customizar o nome.

---

## ☁️ Azure App Service

Configurações recomendadas:
- Application settings:
  - `PORT=3010`
  - `NODE_ENV=production`
  - `MONGODB_URI`
  - `REPORTS_MONGO_DB_NAME=reports_db`
  - `NATS_URL`, `NATS_SUBJECTS`, `NATS_QUEUE_GROUP`
  - `AUTH_*` e `OPA_*`
  - `METRICS_ENABLED=true`
- Health Check: `/api/v1/health`
- Always On: Enabled (se disponível no plano)
- Se usar imagem Docker do Docker Hub, aponte para `iyonuttxd/report-service:latest` (ou o nome que você definir).

---

## 🧪 Testes

```bash
npm test                # roda todos
npm run test:unit       # unitários
npm run test:coverage   # com cobertura
```

Testes de arquitetura garantem:
- Isolamento de `domain` (sem framework).
- Fluxo de dependências (domain → features → infra).
- Respeito ao slice vertical (sem imports cruzados indevidos).

---

## 🐛 Troubleshooting

- MongoDB:
  - Verifique credenciais/whitelist de IP no Atlas.
  - Teste a conexão:
    ```bash
    node -e "require('mongodb').MongoClient.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017').then(()=>console.log('OK')).catch(e=>console.error(e.message))"
    ```
- NATS:
  - Cheque conectividade/URL.
- OPA:
  - Logará erros e seguirá conforme `OPA_FAIL_OPEN`.
- Swagger:
  - Se `/api-docs` não abrir, valide `docs/openapi.yaml` (aspas em descrições com `:`).
- Porta:
  - O serviço escuta em `process.env.PORT || 3010`.

---

## 📝 Licença

MIT — veja arquivo LICENSE (se aplicável).

---
