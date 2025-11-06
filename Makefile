.PHONY: help build start stop restart logs status clean deploy backup restore migrate

# Default target
help:
	@echo "Telegram Groups SaaS - Deployment Commands"
	@echo ""
	@echo "Production Commands:"
	@echo "  make deploy          - Deploy application to production"
	@echo "  make deploy-quick    - Quick deploy (skip backup and build)"
	@echo "  make start           - Start all production services"
	@echo "  make stop            - Stop all production services"
	@echo "  make restart         - Restart all production services"
	@echo "  make logs            - View production logs"
	@echo "  make status          - Show service status"
	@echo "  make migrate         - Run database migrations"
	@echo ""
	@echo "Maintenance Commands:"
	@echo "  make backup          - Create database backup"
	@echo "  make restore FILE=<backup.sql.gz> - Restore from backup"
	@echo "  make clean           - Clean up containers and volumes"
	@echo "  make build           - Build Docker images"
	@echo ""
	@echo "Development Commands:"
	@echo "  make dev-start       - Start development environment"
	@echo "  make dev-stop        - Stop development environment"
	@echo "  make dev-logs        - View development logs"

# Production deployment
deploy:
	@echo "Starting production deployment..."
	@./deploy.sh

deploy-quick:
	@echo "Starting quick deployment (skip backup and build)..."
	@./deploy.sh --skip-backup --skip-build

# Production service management
start:
	@echo "Starting production services..."
	@export $$(cat .env.production | grep -v '^#' | xargs) && \
	docker-compose -f docker-compose.prod.yml up -d

stop:
	@echo "Stopping production services..."
	@docker-compose -f docker-compose.prod.yml stop

restart:
	@echo "Restarting production services..."
	@docker-compose -f docker-compose.prod.yml restart

logs:
	@docker-compose -f docker-compose.prod.yml logs -f

status:
	@echo "Service Status:"
	@docker-compose -f docker-compose.prod.yml ps

# Build
build:
	@echo "Building Docker images..."
	@export $$(cat .env.production | grep -v '^#' | xargs) && \
	docker-compose -f docker-compose.prod.yml build --no-cache

# Database operations
migrate:
	@echo "Running database migrations..."
	@docker-compose -f docker-compose.prod.yml exec backend npm run migration:run

migrate-revert:
	@echo "Reverting last migration..."
	@docker-compose -f docker-compose.prod.yml exec backend npm run migration:revert

# Backup and restore
backup:
	@echo "Creating database backup..."
	@mkdir -p ./backups
	@docker-compose -f docker-compose.prod.yml exec -T postgres \
		pg_dump -U postgres telegram_saas | gzip > ./backups/backup_$$(date +%Y%m%d_%H%M%S).sql.gz
	@echo "Backup completed: ./backups/backup_$$(date +%Y%m%d_%H%M%S).sql.gz"

restore:
	@if [ -z "$(FILE)" ]; then \
		echo "Error: FILE parameter required. Usage: make restore FILE=backup_file.sql.gz"; \
		exit 1; \
	fi
	@echo "Restoring database from $(FILE)..."
	@docker-compose -f docker-compose.prod.yml stop backend frontend
	@zcat $(FILE) | docker-compose -f docker-compose.prod.yml exec -T postgres \
		psql -U postgres telegram_saas
	@docker-compose -f docker-compose.prod.yml start backend frontend
	@echo "Database restored successfully"

# Cleanup
clean:
	@echo "Cleaning up Docker resources..."
	@read -p "This will remove all containers and volumes. Continue? [y/N] " -n 1 -r; \
	echo ""; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose -f docker-compose.prod.yml down -v; \
		docker system prune -f; \
		echo "Cleanup completed"; \
	else \
		echo "Cleanup cancelled"; \
	fi

# Development environment
dev-start:
	@echo "Starting development environment..."
	@docker-compose up -d

dev-stop:
	@echo "Stopping development environment..."
	@docker-compose stop

dev-logs:
	@docker-compose logs -f

# Health checks
health:
	@echo "Checking service health..."
	@echo "Backend health:"
	@curl -s http://localhost:3001/health || echo "Backend not responding"
	@echo ""
	@echo "Frontend health:"
	@curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "Frontend not responding"
	@echo ""

# Database console
db-console:
	@echo "Connecting to PostgreSQL..."
	@docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres telegram_saas

# Redis console
redis-console:
	@echo "Connecting to Redis..."
	@docker-compose -f docker-compose.prod.yml exec redis redis-cli

# View service logs individually
logs-backend:
	@docker-compose -f docker-compose.prod.yml logs -f backend

logs-frontend:
	@docker-compose -f docker-compose.prod.yml logs -f frontend

logs-nginx:
	@docker-compose -f docker-compose.prod.yml logs -f nginx

logs-postgres:
	@docker-compose -f docker-compose.prod.yml logs -f postgres

logs-redis:
	@docker-compose -f docker-compose.prod.yml logs -f redis
