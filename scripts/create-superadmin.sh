#!/bin/bash

# Script to create a superadmin user
# Usage: ./scripts/create-superadmin.sh

set -e

echo "🚀 Super Admin Creation Script"
echo "=============================="
echo

# Check if we're in the right directory
if [ ! -f "backend/package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if backend dependencies are installed
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

# Check if database is running
echo "🔍 Checking database connection..."
cd backend

# Try to connect to the database
if ! npm run migration:run > /dev/null 2>&1; then
    echo "❌ Error: Database is not accessible or migrations failed"
    echo "Please ensure:"
    echo "  1. Database is running (docker-compose up -d)"
    echo "  2. Database migrations have been run (npm run db:migrate)"
    exit 1
fi

echo "✅ Database connection successful"
echo
echo "🔧 Running superadmin creation script..."
echo

# Run the superadmin creation script
npx ts-node src/database/seeds/create-superadmin.ts

echo
echo "🎉 Super admin creation completed!"
echo "You can now login with the created credentials."