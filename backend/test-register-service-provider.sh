#!/bin/bash
# Quick test script for Service Provider Registration using curl

BASE_URL="http://localhost:5000/api"

echo "===== Service Provider Registration Test (curl) ====="
echo ""

# Generate unique email
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
EMAIL="serviceprovider_${TIMESTAMP}@example.com"

echo "Step 1: Getting tenant..."
TENANTS=$(curl -s "${BASE_URL}/Identity/tenants")
TENANT_ID=$(echo $TENANTS | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$TENANT_ID" ]; then
    echo "No tenant found. Creating one..."
    TENANT_ID=$(curl -s -X POST "${BASE_URL}/Identity/tenants" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "Test Fleet Company",
            "contactEmail": "admin@testfleet.com",
            "contactPhone": "+27 11 000 0000"
        }' | grep -o '"id":"[^"]*' | cut -d'"' -f4)
fi

echo "Using Tenant ID: $TENANT_ID"
echo ""

echo "Step 2: Registering service provider..."
echo "Email: $EMAIL"
echo ""

RESPONSE=$(curl -s -X POST "${BASE_URL}/Identity/register-service-provider" \
    -H "Content-Type: application/json" \
    -d "{
        \"tenantId\": \"${TENANT_ID}\",
        \"email\": \"${EMAIL}\",
        \"password\": \"SecurePassword123!\",
        \"phone\": \"+27 11 123 4567\",
        \"businessName\": \"Test Auto Repairs ${TIMESTAMP}\",
        \"registrationNumber\": \"REG${TIMESTAMP}\",
        \"contactPerson\": \"John Smith\",
        \"address\": \"123 Main Street, Johannesburg, 2001\",
        \"serviceTypes\": \"Mechanical, Electrical, Routine Service\",
        \"vehicleCategories\": \"Sedan, SUV, Van, Truck\",
        \"operatingHours\": \"Mon-Fri: 8AM-5PM, Sat: 9AM-1PM\",
        \"hourlyRate\": 350.00,
        \"callOutFee\": 500.00,
        \"serviceRadiusKm\": 50.0,
        \"bankAccount\": \"FNB: 62123456789\",
        \"taxNumber\": \"TAX987654\",
        \"certificationsLicenses\": \"ASE Master Technician, ISO 9001\",
        \"notes\": \"Test service provider created via curl\"
    }")

echo "Response:"
echo $RESPONSE | jq '.' 2>/dev/null || echo $RESPONSE
echo ""

echo "Step 3: Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/Identity/login" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"${EMAIL}\",
        \"password\": \"SecurePassword123!\"
    }")

echo "Login Response:"
echo $LOGIN_RESPONSE | jq '.' 2>/dev/null || echo $LOGIN_RESPONSE
echo ""

echo "===== Test Complete ====="
