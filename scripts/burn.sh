#!/bin/bash

# WORM Burn Script - Burns Sepolia ETH to create BETH
# Usage: ./burn.sh [amount] [spend] [fee]
# Example: ./burn.sh 1 0.999 0.001

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

# Set default values or use command line arguments
AMOUNT=${1:-$DEFAULT_BURN_AMOUNT}
SPEND=${2:-$DEFAULT_SPEND_AMOUNT}
FEE=${3:-$DEFAULT_FEE}

echo "=== WORM Burn Operation ==="
echo "Network: sepolia"
echo "Amount to burn: $AMOUNT ETH"
echo "Amount to spend: $SPEND ETH"
echo "Fee: $FEE ETH"
echo "Sender: $SENDER_ADDRESS"
echo ""

# Confirm operation
read -p "Proceed with burn operation? (y/N): " confirm
if [[ $confirm != [yY] ]]; then
    echo "Operation cancelled."
    exit 0
fi

echo "Executing burn..."
worm-miner burn \
    --network sepolia \
    --private-key "$SENDER_PRIVATE_KEY" \
    --amount "$AMOUNT" \
    --spend "$SPEND" \
    --fee "$FEE"

echo ""
echo "Burn operation completed!"
echo "Check your balance with: ./info.sh"
