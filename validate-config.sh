#!/bin/bash

###############################################################################
# Configuration Validation Script
###############################################################################
# Validates .env.production file for security and correctness
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ENV_FILE="${1:-.env.production}"
ERRORS=0
WARNINGS=0

error() {
    echo -e "${RED}✗ ERROR: $1${NC}"
    ERRORS=$((ERRORS + 1))
}

warning() {
    echo -e "${YELLOW}⚠ WARNING: $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

info() {
    echo -e "$1"
}

# Check if file exists
if [ ! -f "$ENV_FILE" ]; then
    error "Environment file $ENV_FILE not found"
    exit 1
fi

info "Validating configuration file: $ENV_FILE"
info ""

# Source environment file
set -a
source "$ENV_FILE" 2>/dev/null || {
    error "Failed to load environment file"
    exit 1
}
set +a

###############################################################################
# 1. Required Variables
###############################################################################

info "Checking required variables..."

check_required() {
    local var_name=$1
    local var_value="${!var_name}"

    if [ -z "$var_value" ]; then
        error "$var_name is not set"
        return 1
    fi
    return 0
}

check_required "DB_PASSWORD"
check_required "REDIS_PASSWORD"
check_required "JWT_SECRET"
check_required "JWT_REFRESH_SECRET"
check_required "ENCRYPTION_KEY"
check_required "QPAY_USERNAME"
check_required "QPAY_PASSWORD"
check_required "QPAY_TERMINAL_ID"
check_required "QPAY_BASE_URL"
check_required "QPAY_WEBHOOK_SECRET"
check_required "QPAY_CALLBACK_BASE_URL"
check_required "FRONTEND_URL"
check_required "BASE_URL"
check_required "TELEGRAM_ONBOARDING_BOT_TOKEN"
check_required "TELEGRAM_CHANNEL_ID_BOT_TOKEN"

###############################################################################
# 2. Secret Strength Validation
###############################################################################

info ""
info "Validating secret strength..."

check_secret_strength() {
    local var_name=$1
    local min_length=$2
    local var_value="${!var_name}"

    if [ ${#var_value} -lt $min_length ]; then
        error "$var_name is too short (${#var_value} chars, minimum $min_length)"
        return 1
    fi

    success "$var_name has sufficient length (${#var_value} chars)"
    return 0
}

check_secret_strength "DB_PASSWORD" 16
check_secret_strength "REDIS_PASSWORD" 16
check_secret_strength "JWT_SECRET" 32
check_secret_strength "JWT_REFRESH_SECRET" 32
check_secret_strength "ENCRYPTION_KEY" 32
check_secret_strength "QPAY_WEBHOOK_SECRET" 32

###############################################################################
# 3. Check for Default/Weak Values
###############################################################################

info ""
info "Checking for default/weak values..."

check_not_default() {
    local var_name=$1
    local default_value=$2
    local var_value="${!var_name}"

    if [[ "$var_value" == *"$default_value"* ]]; then
        error "$var_name contains default value '$default_value'"
        return 1
    fi
    return 0
}

check_not_default "DB_PASSWORD" "CHANGE_ME"
check_not_default "DB_PASSWORD" "password"
check_not_default "DB_PASSWORD" "postgres"
check_not_default "REDIS_PASSWORD" "CHANGE_ME"
check_not_default "JWT_SECRET" "CHANGE_ME"
check_not_default "JWT_REFRESH_SECRET" "CHANGE_ME"
check_not_default "ENCRYPTION_KEY" "CHANGE_ME"
check_not_default "QPAY_WEBHOOK_SECRET" "CHANGE_ME"

###############################################################################
# 4. URL Validation
###############################################################################

info ""
info "Validating URLs..."

check_url() {
    local var_name=$1
    local var_value="${!var_name}"

    if [[ ! "$var_value" =~ ^https?:// ]]; then
        error "$var_name is not a valid URL: $var_value"
        return 1
    fi

    if [[ "$var_value" == http://localhost* ]]; then
        warning "$var_name uses localhost (acceptable for testing only)"
        return 0
    fi

    success "$var_name is valid: $var_value"
    return 0
}

check_url "FRONTEND_URL"
check_url "BASE_URL"
check_url "QPAY_CALLBACK_BASE_URL"
check_url "NEXT_PUBLIC_API_URL"

# Check HTTPS for production
if [ "$NODE_ENV" = "production" ] || [ -z "$NODE_ENV" ]; then
    if [[ "$FRONTEND_URL" == http://* ]] && [[ ! "$FRONTEND_URL" == http://localhost* ]]; then
        warning "FRONTEND_URL should use HTTPS in production"
    fi
fi

###############################################################################
# 5. QPay Configuration
###############################################################################

info ""
info "Validating QPay configuration..."

if [ "$QPAY_ENV" = "production" ]; then
    if [[ "$QPAY_BASE_URL" == *"sandbox"* ]]; then
        error "QPAY_ENV is 'production' but QPAY_BASE_URL contains 'sandbox'"
    else
        success "QPay production configuration detected"
    fi
else
    if [[ "$QPAY_BASE_URL" != *"sandbox"* ]]; then
        warning "QPAY_ENV is not 'production' but QPAY_BASE_URL doesn't contain 'sandbox'"
    fi
fi

# Check terminal ID format
if [[ ! "$QPAY_TERMINAL_ID" =~ ^[0-9]+$ ]]; then
    warning "QPAY_TERMINAL_ID should be numeric: $QPAY_TERMINAL_ID"
fi

###############################################################################
# 6. Telegram Bot Tokens
###############################################################################

info ""
info "Validating Telegram bot tokens..."

check_telegram_token() {
    local var_name=$1
    local var_value="${!var_name}"

    # Telegram bot token format: <bot_id>:<token>
    if [[ ! "$var_value" =~ ^[0-9]+:[A-Za-z0-9_-]+$ ]]; then
        error "$var_name doesn't match Telegram bot token format"
        return 1
    fi

    success "$var_name format is valid"
    return 0
}

check_telegram_token "TELEGRAM_ONBOARDING_BOT_TOKEN"
check_telegram_token "TELEGRAM_CHANNEL_ID_BOT_TOKEN"

###############################################################################
# 7. Database Configuration
###############################################################################

info ""
info "Validating database configuration..."

if [ "$DB_USERNAME" = "postgres" ]; then
    warning "Using default database username 'postgres' (consider using a different username)"
fi

if [ "$DB_NAME" = "telegram_saas" ]; then
    success "Database name: $DB_NAME"
else
    info "Database name: $DB_NAME (custom)"
fi

###############################################################################
# 8. Logging Configuration
###############################################################################

info ""
info "Validating logging configuration..."

if [ "$LOG_REQUEST_BODIES" = "true" ]; then
    warning "LOG_REQUEST_BODIES is enabled (may log sensitive data)"
fi

if [ "$LOG_DB_QUERIES" = "true" ]; then
    warning "LOG_DB_QUERIES is enabled (may impact performance)"
fi

valid_log_levels=("error" "warn" "info" "debug" "verbose")
if [[ ! " ${valid_log_levels[@]} " =~ " ${LOG_LEVEL} " ]]; then
    error "Invalid LOG_LEVEL: $LOG_LEVEL (must be one of: ${valid_log_levels[*]})"
fi

###############################################################################
# 9. Rate Limiting
###############################################################################

info ""
info "Validating rate limiting configuration..."

if [ -n "$RATE_LIMIT_MAX_REQUESTS" ]; then
    if [ "$RATE_LIMIT_MAX_REQUESTS" -lt 10 ]; then
        warning "RATE_LIMIT_MAX_REQUESTS is very low ($RATE_LIMIT_MAX_REQUESTS)"
    elif [ "$RATE_LIMIT_MAX_REQUESTS" -gt 1000 ]; then
        warning "RATE_LIMIT_MAX_REQUESTS is very high ($RATE_LIMIT_MAX_REQUESTS)"
    else
        success "Rate limiting configured: $RATE_LIMIT_MAX_REQUESTS requests per ${RATE_LIMIT_TTL}s"
    fi
fi

###############################################################################
# 10. Security Checks
###############################################################################

info ""
info "Performing security checks..."

# Check if secrets are the same (bad practice)
if [ "$JWT_SECRET" = "$JWT_REFRESH_SECRET" ]; then
    error "JWT_SECRET and JWT_REFRESH_SECRET should be different"
fi

if [ "$JWT_SECRET" = "$ENCRYPTION_KEY" ]; then
    error "JWT_SECRET and ENCRYPTION_KEY should be different"
fi

# Check secret entropy (basic check)
check_entropy() {
    local var_name=$1
    local var_value="${!var_name}"

    # Count unique characters
    local unique_chars=$(echo "$var_value" | grep -o . | sort -u | wc -l)

    if [ "$unique_chars" -lt 10 ]; then
        warning "$var_name has low entropy (only $unique_chars unique characters)"
    fi
}

check_entropy "DB_PASSWORD"
check_entropy "JWT_SECRET"
check_entropy "ENCRYPTION_KEY"

###############################################################################
# Summary
###############################################################################

info ""
info "=================================================="
info "Validation Summary"
info "=================================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    success "All checks passed! Configuration is valid."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    warning "$WARNINGS warning(s) found. Review and fix if necessary."
    exit 0
else
    error "$ERRORS error(s) and $WARNINGS warning(s) found."
    error "Configuration is INVALID. Fix errors before deploying."
    exit 1
fi
