#!/bin/bash

# WORM Spend Script - Spend from existing coins
# Usage: ./spend.sh [coin_id] [amount] [fee] [receiver]
# Example: ./spend.sh 1 0.3 0.1 0x1234...

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
if [ -z "$SENDER_PRIVATE_KEY" ] || [ -z "$SENDER_ADDRESS" ] || [ -z "$RECEIVER_ADDRESS" ]; then
    echo "Error: SENDER_PRIVATE_KEY, SENDER_ADDRESS, and RECEIVER_ADDRESS must be set in .env file"
    exit 1
fi

# Set default values or use command line arguments
COIN_ID=${1}
AMOUNT=${2:-$DEFAULT_SPEND_AMOUNT}
FEE=${3:-$DEFAULT_FEE}
RECEIVER=${4:-$RECEIVER_ADDRESS}

# Check if coin ID is provided
if [ -z "$COIN_ID" ]; then
    echo "=== Available Coins ==="
    worm-miner ls --network sepolia
    echo ""
    echo "Usage: ./spend.sh [coin_id] [amount] [fee] [receiver]"
    echo "Please specify a coin ID from the list above."
    exit 1
fi

echo "=== WORM Spend Operation ==="
echo "Network: sepolia"
echo "Sender: $SENDER_ADDRESS"
echo "Receiver: $RECEIVER"
echo "Coin ID: $COIN_ID"
echo "Amount: $AMOUNT BETH"
echo "Fee: $FEE BETH"
echo ""

# Show available coins
echo "Available coins:"
worm-miner ls --network sepolia
echo ""

# Confirm operation
read -p "Proceed with spend operation? (y/N): " confirm
if [[ $confirm != [yY] ]]; then
    echo "Operation cancelled."
    exit 0
fi

echo "Executing spend..."
worm-miner spend \
    --id "$COIN_ID" \
    --amount "$AMOUNT" \
    --fee "$FEE" \
    --private-key "$SENDER_PRIVATE_KEY" \
    --receiver "$RECEIVER" \
    --network sepolia

echo ""
echo "Spend operation completed!"
echo ""
echo "Updated account status:"
worm-miner info \
    --network sepolia \
    --private-key "$SENDER_PRIVATE_KEY"
