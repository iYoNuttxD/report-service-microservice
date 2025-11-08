# Report Service Microservice

A production-ready microservice for aggregating events/logs and generating consolidated reports and metrics. Built with Clean Architecture principles, following the same patterns and standards as other services in the ecosystem.

## 🎯 Overview

The Report Service is responsible for:
- Receiving domain events via NATS and logs/metrics via Fluentd or existing logging pipeline
- Aggregating data with idempotency guarantees
- Generating consolidated reports and indicators
- Exposing authenticated and authorized REST APIs for querying metrics and reports
- Persisting consolidated data in MongoDB (`reports_db`)
- Consulting Open Policy Agent (OPA) for policy-based authorization

## 🏗️ Architecture

This service follows **Clean Architecture** with clear separation of concerns:

```
src/
├── domain/              # Business logic (no framework dependencies)
│   ├── entities/        # Core business entities (Report)
│   ├── value-objects/   # Immutable value objects (Period)
│   ├── ports/           # Interfaces for external dependencies
│   └── services/        # Domain services (AggregationStrategy)
├── features/            # Vertical slices by feature
│   └── reports/
│       ├── application/ # Use cases
│       └── http/        # HTTP handlers and routes
├── infra/               # Infrastructure adapters
│   ├── db/              # Database connection and indexes
│   ├── repositories/    # Data persistence implementations
│   ├── adapters/        # External service adapters
│   │   ├── nats/        # NATS event subscriber
│   │   ├── opa/         # OPA authorization client
│   │   ├── auth/        # JWT authentication
│   │   └── metrics/     # Prometheus metrics
│   └── utils/           # Infrastructure utilities
└── main/                # Application bootstrap
    ├── container.js     # Dependency injection
    ├── app.js           # Express app configuration
    ├── subscribers.js   # Event subscriber setup
    └── server.js        # Server startup
```

### Components

- **ReportController**: Express HTTP handlers for REST API
- **EventSubscriber**: NATS subscription handler for domain events
- **MetricsCollector**: Prometheus metrics collection and exposition
- **ReportsAggregator**: Event aggregation with idempotency
- **AuthPolicyClient**: OPA-based authorization with fail-open option
- **ReportsRepository**: MongoDB persistence layer
- **JwtAuthVerifier**: JWT token verification with JWKS support

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- MongoDB (local or Atlas)
- NATS Server (optional, for event processing)
- OPA Server (optional, for authorization)

### Installation

```bash
# Clone the repository
git clone https://github.com/iYoNuttxD/report-service-microservice.git
cd report-service-microservice

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Running Locally

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## 📋 API Endpoints

### Reports

- `GET /api/v1/reports` - List/query reports with filters
  - Query params: `type`, `from`, `to`, `status`, `page`, `limit`
- `GET /api/v1/reports/:id` - Get single report by ID
- `GET /api/v1/reports/metrics` - Get aggregated metrics snapshot

### Health & Monitoring

- `GET /api/v1/health` - Health check endpoint
- `GET /api/v1/metrics` - Prometheus metrics endpoint
- `GET /api-docs` - Swagger UI documentation
- `GET /api-docs/openapi.yaml` - OpenAPI specification

## 🔐 Authentication & Authorization

### JWT Authentication

When `AUTH_JWT_REQUIRED=true`, all `/api/v1/reports` endpoints require a valid JWT token:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3010/api/v1/reports
```

### OPA Authorization

The service can integrate with Open Policy Agent for fine-grained authorization:

```bash
# Example OPA policy input
{
  "input": {
    "user": {
      "id": "user-123",
      "roles": ["analyst"]
    },
    "action": "read",
    "resource": "reports"
  }
}
```

Set `OPA_FAIL_OPEN=true` to allow requests when OPA is unavailable (default: true).

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | `development` |
| `PORT` | Server port | `3010` |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | `info` |
| **MongoDB** |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017` |
| `REPORTS_MONGO_URI` | Service-specific MongoDB URI (optional) | - |
| `REPORTS_MONGO_DB_NAME` | Database name | `reports_db` |
| `RETENTION_DAYS` | Report retention period (0 = no expiration) | `90` |
| `EVENT_INBOX_TTL_DAYS` | Event inbox TTL for idempotency | `30` |
| **NATS** |
| `NATS_URL` | NATS server URL | `nats://localhost:4222` |
| `NATS_SUBJECTS` | Comma-separated list of subjects | `orders.created,orders.updated,...` |
| `NATS_QUEUE_GROUP` | Queue group name | `report-service` |
| `NATS_JETSTREAM_ENABLED` | Enable JetStream | `false` |
| **Authentication** |
| `AUTH_JWT_REQUIRED` | Require JWT authentication | `false` |
| `AUTH_JWT_ISSUER` | JWT issuer | - |
| `AUTH_JWT_AUDIENCE` | JWT audience | `report-service-api` |
| `AUTH_JWKS_URI` | JWKS URI for public key | - |
| `AUTH_JWT_SECRET` | JWT secret (dev only) | - |
| **Authorization** |
| `OPA_URL` | OPA server URL | `http://localhost:8181` |
| `OPA_POLICY_PATH` | OPA policy path | `/v1/data/reports/allow` |
| `OPA_FAIL_OPEN` | Fail open on OPA errors | `true` |
| `OPA_TIMEOUT_MS` | OPA request timeout | `3000` |
| **API** |
| `API_VERSION` | API version | `v1` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `CORS_ENABLED` | Enable CORS | `true` |
| `CORS_ORIGIN` | CORS allowed origin | `*` |
| `METRICS_ENABLED` | Enable Prometheus metrics | `true` |

## 🐳 Docker Deployment

### Build Image

```bash
docker build -t report-service:latest .
```

### Run Container

```bash
docker run -d \
  --name report-service \
  -p 3010:3010 \
  -e MONGODB_URI=mongodb://mongo:27017 \
  -e NATS_URL=nats://nats:4222 \
  report-service:latest
```

### Docker Compose

```yaml
version: '3.8'

services:
  report-service:
    build: .
    ports:
      - "3010:3010"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017
      - NATS_URL=nats://nats:4222
    depends_on:
      - mongo
      - nats

  mongo:
    image: mongo:6
    ports:
      - "27017:27017"

  nats:
    image: nats:latest
    ports:
      - "4222:4222"
```

## ☁️ Azure App Service Deployment

### Prerequisites

- Azure CLI installed
- Azure subscription

### Deployment Steps

```bash
# Login to Azure
az login

# Create resource group
az group create --name report-service-rg --location eastus

# Create App Service plan
az appservice plan create \
  --name report-service-plan \
  --resource-group report-service-rg \
  --sku B1 \
  --is-linux

# Create web app
az webapp create \
  --name report-service-app \
  --resource-group report-service-rg \
  --plan report-service-plan \
  --runtime "NODE|18-lts"

# Configure environment variables
az webapp config appsettings set \
  --name report-service-app \
  --resource-group report-service-rg \
  --settings \
    NODE_ENV=production \
    MONGODB_URI="your-mongodb-uri" \
    NATS_URL="your-nats-url"

# Deploy from GitHub (or use Azure Container Registry)
az webapp deployment source config \
  --name report-service-app \
  --resource-group report-service-rg \
  --repo-url https://github.com/iYoNuttxD/report-service-microservice \
  --branch main \
  --manual-integration

# Check health
curl https://report-service-app.azurewebsites.net/api/v1/health
```

## 📊 Metrics

The service exposes Prometheus-compatible metrics:

- `reports_generated_total` - Counter of reports generated by type and status
- `events_processed_total` - Counter of events processed by type
- `events_skipped_idempotent_total` - Counter of duplicate events skipped
- `aggregation_duration_ms` - Histogram of aggregation duration
- `active_reports_count` - Gauge of active reports by type
- `http_requests_total` - Counter of HTTP requests by method, path, and status
- `http_request_duration_ms` - Histogram of HTTP request duration

Plus default Node.js metrics (CPU, memory, event loop, etc.)

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Unit Tests

```bash
npm run test:unit
```

### Architecture Tests

The project includes architecture tests to enforce:
- Domain layer isolation (no framework dependencies)
- Clean dependency flow (domain → features → infra)
- Vertical slice boundaries

```bash
npm test tests/architecture
```

## 🔍 Event Aggregation

### Idempotency

Events are processed exactly once using the `events_inbox` collection:
- Each event must have a unique `id`
- Duplicate events are automatically skipped
- Inbox entries expire after `EVENT_INBOX_TTL_DAYS`

### Aggregation Strategies

Custom aggregation logic can be registered per event type:

```javascript
strategy.register('orders.created', (event, indicators) => {
  return {
    ...indicators,
    totalOrders: (indicators.totalOrders || 0) + 1,
    totalOrderValue: (indicators.totalOrderValue || 0) + event.data.total
  }
})
```

Default strategy: count events by type

## 📈 Report Types

- `orders` - Order-related metrics
- `delivery` - Delivery performance metrics
- `notifications` - Notification statistics
- `general` - Generic event aggregation

Reports are generated per period (default: daily) with automatic rollup.

## 🔐 Security

- Helmet.js for HTTP security headers
- Rate limiting per IP
- JWT token verification with JWKS
- OPA policy-based authorization
- PII masking in logs
- Non-root Docker user

## 🐛 Troubleshooting

### MongoDB Connection Issues

```bash
# Test MongoDB connection
node -e "require('mongodb').MongoClient.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017').then(() => console.log('✓ Connected')).catch(e => console.error('✗ Error:', e.message))"
```

### NATS Connection Issues

```bash
# Check NATS server
curl -i http://localhost:8222/varz

# Test NATS connection
node -e "require('nats').connect({ servers: process.env.NATS_URL || 'nats://localhost:4222' }).then(nc => { console.log('✓ Connected'); nc.close(); }).catch(e => console.error('✗ Error:', e.message))"
```

### Service Not Starting

Check logs for specific errors:
```bash
npm start 2>&1 | grep -i error
```

Common issues:
- Missing environment variables
- MongoDB/NATS unavailable
- Port already in use

## 📝 License

MIT License - see LICENSE file for details

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📧 Contact

- Author: iYoNuttxD
- GitHub: [@iYoNuttxD](https://github.com/iYoNuttxD)

---

**Note**: This service is part of a microservices ecosystem including orders-service, delivery-service, and notification-service. Ensure consistent configuration across services for proper integration.