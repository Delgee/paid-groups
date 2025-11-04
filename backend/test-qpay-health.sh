#!/bin/bash

echo "=========================================="
echo "QPay Health Check Test"
echo "=========================================="
echo ""

echo "1. Testing QPay-specific health endpoint:"
echo "   GET http://localhost:3001/v1/health/qpay"
echo ""
curl -s http://localhost:3001/v1/health/qpay | python3 -m json.tool

echo ""
echo ""
echo "2. Testing Database health:"
echo "   GET http://localhost:3001/v1/health/database"
echo ""
curl -s http://localhost:3001/v1/health/database | python3 -m json.tool

echo ""
echo ""
echo "3. Testing Redis health:"
echo "   GET http://localhost:3001/v1/health/redis"
echo ""
curl -s http://localhost:3001/v1/health/redis | python3 -m json.tool

echo ""
echo ""
echo "=========================================="
echo "Health Check Complete"
echo "=========================================="
