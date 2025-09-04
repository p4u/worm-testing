#!/bin/bash

# WORM Info Script - Check account balances and status
# Usage: ./info.sh

set -e

# Load environment variables
if [ -f "../.env" ]; then
    source ../.env
elif [ -f ".env" ]; then
    source .env
else
    echo "Error: .env file not found. Please ensure .env exists with your credentials."
    exit 1
fi

# Check required environment variables
if [ -z "$SENDER_PRIVATE_KEY" ] || [ -z "$SENDER_ADDRESS" ]; then
    echo "Error: SENDER_PRIVATE_KEY and SENDER_ADDRESS must be set in .env file"
    exit 1
fi

echo "=== WORM Account Information ==="
echo "Network: sepolia"
echo "Address: $SENDER_ADDRESS"
echo ""

echo "Fetching account information..."
worm-miner info \
    --network sepolia \
    --private-key "$SENDER_PRIVATE_KEY"

echo ""
echo "=== Available Coins ==="
echo "Listing unspent coins..."
worm-miner ls --network sepolia
