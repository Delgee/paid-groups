#!/bin/bash

###############################################################################
# Telegram Groups SaaS - Production Deployment Script
###############################################################################
# This script automates the deployment process for production environments.
# Read DEPLOYMENT.md for detailed instructions.
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
BACKUP_DIR="./backups"

# Functions
print_header() {
    echo -e "\n${BLUE}===================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}===================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_requirements() {
    print_header "Checking Requirements"

    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    print_success "Docker installed: $(docker --version)"

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    print_success "Docker Compose installed: $(docker-compose --version)"

    # Check environment file
    if [ ! -f "$ENV_FILE" ]; then
        print_error "Environment file $ENV_FILE not found!"
        print_info "Please copy .env.production.template to .env.production and configure it."
        exit 1
    fi
    print_success "Environment file found: $ENV_FILE"

    # Check SSL certificates
    if [ ! -f "nginx/ssl/fullchain.pem" ] || [ ! -f "nginx/ssl/privkey.pem" ]; then
        print_warning "SSL certificates not found in nginx/ssl/"
        print_info "You need to set up SSL certificates before deployment."
        print_info "See nginx/ssl/README.md for instructions."
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_success "SSL certificates found"
    fi
}

backup_database() {
    print_header "Backing Up Database"

    # Check if services are running
    if ! docker-compose -f $COMPOSE_FILE ps | grep -q "Up"; then
        print_warning "No running services to backup"
        return 0
    fi

    mkdir -p $BACKUP_DIR
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"

    print_info "Creating database backup..."
    if docker-compose -f $COMPOSE_FILE exec -T postgres pg_dump -U postgres telegram_saas | gzip > $BACKUP_FILE; then
        print_success "Database backed up to: $BACKUP_FILE"
    else
        print_error "Database backup failed!"
        exit 1
    fi
}

build_images() {
    print_header "Building Docker Images"

    # Load environment variables
    export $(cat $ENV_FILE | grep -v '^#' | xargs)

    print_info "Building images (this may take several minutes)..."
    if docker-compose -f $COMPOSE_FILE build --no-cache; then
        print_success "Images built successfully"
    else
        print_error "Image build failed!"
        exit 1
    fi
}

start_services() {
    print_header "Starting Services"

    # Load environment variables
    export $(cat $ENV_FILE | grep -v '^#' | xargs)

    print_info "Starting all services..."
    if docker-compose -f $COMPOSE_FILE up -d; then
        print_success "Services started successfully"
    else
        print_error "Failed to start services!"
        exit 1
    fi

    print_info "Waiting for services to be healthy..."
    sleep 10

    # Check service status
    docker-compose -f $COMPOSE_FILE ps
}

run_migrations() {
    print_header "Running Database Migrations"

    print_info "Waiting for database to be ready..."
    sleep 5

    print_info "Running migrations..."
    if docker-compose -f $COMPOSE_FILE exec -T backend npm run migration:run; then
        print_success "Migrations completed successfully"
    else
        print_error "Migrations failed!"
        print_warning "Check logs: docker-compose -f $COMPOSE_FILE logs backend"
        exit 1
    fi
}

verify_deployment() {
    print_header "Verifying Deployment"

    # Check if all services are running
    print_info "Checking service status..."
    if docker-compose -f $COMPOSE_FILE ps | grep -q "Exit"; then
        print_error "Some services have exited!"
        docker-compose -f $COMPOSE_FILE ps
        exit 1
    fi
    print_success "All services are running"

    # Check backend health
    print_info "Checking backend health..."
    sleep 5
    if docker-compose -f $COMPOSE_FILE exec -T backend wget -q -O - http://localhost:3001/health &> /dev/null; then
        print_success "Backend is healthy"
    else
        print_warning "Backend health check failed (this may be normal if health endpoint is not implemented)"
    fi

    # Check frontend
    print_info "Checking frontend..."
    if docker-compose -f $COMPOSE_FILE exec -T frontend wget -q -O - http://localhost:3000 &> /dev/null; then
        print_success "Frontend is responding"
    else
        print_warning "Frontend health check failed"
    fi
}

show_status() {
    print_header "Deployment Status"

    echo -e "\n${GREEN}Services:${NC}"
    docker-compose -f $COMPOSE_FILE ps

    echo -e "\n${GREEN}Logs (last 20 lines):${NC}"
    docker-compose -f $COMPOSE_FILE logs --tail=20

    echo -e "\n${GREEN}Next Steps:${NC}"
    print_info "1. Configure Telegram webhooks (check backend logs)"
    print_info "2. Configure QPay webhook in merchant dashboard"
    print_info "3. Create initial admin user via /register"
    print_info "4. Test critical workflows"

    echo -e "\n${GREEN}Useful Commands:${NC}"
    echo "  View logs:        docker-compose -f $COMPOSE_FILE logs -f"
    echo "  Restart services: docker-compose -f $COMPOSE_FILE restart"
    echo "  Stop services:    docker-compose -f $COMPOSE_FILE stop"
    echo "  Service status:   docker-compose -f $COMPOSE_FILE ps"

    echo -e "\n${GREEN}Access URLs:${NC}"
    source $ENV_FILE
    echo "  Frontend: ${FRONTEND_URL}"
    echo "  Backend:  ${BASE_URL}/api"
    echo "  Health:   ${BASE_URL}/health"
}

# Main deployment flow
main() {
    print_header "Telegram Groups SaaS - Production Deployment"

    # Parse command line arguments
    SKIP_BACKUP=false
    SKIP_BUILD=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --skip-backup    Skip database backup"
                echo "  --skip-build     Skip image building (use existing images)"
                echo "  --help           Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done

    # Execute deployment steps
    check_requirements

    if [ "$SKIP_BACKUP" = false ]; then
        backup_database
    else
        print_warning "Skipping database backup"
    fi

    if [ "$SKIP_BUILD" = false ]; then
        build_images
    else
        print_warning "Skipping image build"
    fi

    start_services
    run_migrations
    verify_deployment
    show_status

    print_header "Deployment Complete!"
    print_success "Your application is now running in production mode"
    print_info "Read DEPLOYMENT.md for post-deployment steps and maintenance"
}

# Run main function
main "$@"
