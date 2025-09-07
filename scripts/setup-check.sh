#!/bin/bash

echo "🚀 Telegram Groups SaaS - Setup Verification"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_status() {
    if [ $2 -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
    fi
}

# Check prerequisites
echo -e "\n${YELLOW}📋 Checking Prerequisites...${NC}"

command_exists node
print_status "Node.js is installed" $?

command_exists npm
print_status "npm is installed" $?

command_exists docker
print_status "Docker is installed" $?

command_exists docker-compose
print_status "Docker Compose is installed" $?

# Check Node version
NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
    print_status "Node.js version ($NODE_VERSION) is compatible" 0
else
    print_status "Node.js version ($NODE_VERSION) - requires 18+" 1
fi

# Check project structure
echo -e "\n${YELLOW}📁 Checking Project Structure...${NC}"

directories=("backend" "frontend" "worker" "packages/shared-types")
for dir in "${directories[@]}"; do
    if [ -d "$dir" ]; then
        print_status "$dir directory exists" 0
    else
        print_status "$dir directory exists" 1
    fi
done

# Check package.json files
echo -e "\n${YELLOW}📦 Checking Package Configurations...${NC}"

packages=("." "backend" "frontend" "worker" "packages/shared-types")
for pkg in "${packages[@]}"; do
    if [ -f "$pkg/package.json" ]; then
        print_status "$pkg/package.json exists" 0
    else
        print_status "$pkg/package.json exists" 1
    fi
done

# Check configuration files
echo -e "\n${YELLOW}⚙️ Checking Configuration Files...${NC}"

configs=(
    ".env.example"
    "docker-compose.yml" 
    "backend/tsconfig.json"
    "backend/.eslintrc.js"
    "frontend/next.config.js"
    "frontend/tailwind.config.js"
    "worker/tsconfig.json"
)

for config in "${configs[@]}"; do
    if [ -f "$config" ]; then
        print_status "$config exists" 0
    else
        print_status "$config exists" 1
    fi
done

# Check if Docker services are running
echo -e "\n${YELLOW}🐳 Checking Docker Services...${NC}"

if docker ps | grep -q postgres; then
    print_status "PostgreSQL container is running" 0
else
    print_status "PostgreSQL container is running" 1
fi

if docker ps | grep -q redis; then
    print_status "Redis container is running" 0
else
    print_status "Redis container is running" 1
fi

# Check environment file
echo -e "\n${YELLOW}🔐 Checking Environment Setup...${NC}"

if [ -f ".env" ]; then
    print_status ".env file exists" 0
else
    print_status ".env file exists (copy from .env.example)" 1
fi

# Next steps
echo -e "\n${YELLOW}📋 Next Steps:${NC}"
echo "1. Copy environment file: cp .env.example .env"
echo "2. Edit .env with your configuration"
echo "3. Start services: docker-compose up -d"
echo "4. Install dependencies: npm install"
echo "5. Run migrations: npm run db:migrate"
echo "6. Start development: npm run dev"

echo -e "\n${YELLOW}🔗 Access URLs:${NC}"
echo "Frontend:        http://localhost:3000"
echo "Backend API:     http://localhost:3001"
echo "API Docs:        http://localhost:3001/api-docs"
echo "Database Admin:  http://localhost:8080"
echo "Redis Admin:     http://localhost:8081"

echo -e "\n${GREEN}🎉 Setup verification complete!${NC}"