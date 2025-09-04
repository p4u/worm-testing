#!/bin/bash

# WORM Claim Script - Claim mining rewards from completed epochs
# Usage: ./claim.sh [from_epoch] [num_epochs]
# Example: ./claim.sh 0 5

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
FROM_EPOCH=${1:-$DEFAULT_FROM_EPOCH}
NUM_EPOCHS=${2:-$DEFAULT_NUM_EPOCHS}

echo "=== WORM Reward Claiming ==="
echo "Network: sepolia"
echo "Address: $SENDER_ADDRESS"
echo "From epoch: $FROM_EPOCH"
echo "Number of epochs: $NUM_EPOCHS"
echo "Claiming epochs: $FROM_EPOCH to $(($FROM_EPOCH + $NUM_EPOCHS - 1))"
echo ""

# Show current info first
echo "Current account status:"
worm-miner info \
    --network sepolia \
    --private-key "$SENDER_PRIVATE_KEY"

echo ""

# Confirm operation
read -p "Proceed with claiming rewards? (y/N): " confirm
if [[ $confirm != [yY] ]]; then
    echo "Operation cancelled."
    exit 0
fi

echo "Claiming rewards..."
worm-miner claim \
    --from-epoch "$FROM_EPOCH" \
    --num-epochs "$NUM_EPOCHS" \
    --private-key "$SENDER_PRIVATE_KEY" \
    --network sepolia

echo ""
echo "Reward claiming completed!"
echo ""
echo "Updated account status:"
worm-miner info \
    --network sepolia \
    --private-key "$SENDER_PRIVATE_KEY"
