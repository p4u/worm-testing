#!/bin/bash

# WORM Participate Script - Register for mining epochs
# Usage: ./participate.sh [amount_per_epoch] [num_epochs]
# Example: ./participate.sh 0.002 5

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
AMOUNT_PER_EPOCH=${1:-$DEFAULT_AMOUNT_PER_EPOCH}
NUM_EPOCHS=${2:-$DEFAULT_NUM_EPOCHS}

echo "=== WORM Mining Participation ==="
echo "Network: sepolia"
echo "Address: $SENDER_ADDRESS"
echo "Amount per epoch: $AMOUNT_PER_EPOCH BETH"
echo "Number of epochs: $NUM_EPOCHS"
echo "Total commitment: $(echo "$AMOUNT_PER_EPOCH * $NUM_EPOCHS" | bc -l) BETH"
echo ""
echo "Note: Each epoch is 30 minutes. Total time: $(echo "$NUM_EPOCHS * 30" | bc) minutes"
echo ""

# Confirm operation
read -p "Proceed with mining participation? (y/N): " confirm
if [[ $confirm != [yY] ]]; then
    echo "Operation cancelled."
    exit 0
fi

echo "Registering for mining participation..."
worm-miner participate \
    --amount-per-epoch "$AMOUNT_PER_EPOCH" \
    --num-epochs "$NUM_EPOCHS" \
    --private-key "$SENDER_PRIVATE_KEY" \
    --network sepolia

echo ""
echo "Mining participation registered successfully!"
echo "You are now participating in $NUM_EPOCHS epochs with $AMOUNT_PER_EPOCH BETH per epoch."
echo ""
echo "Check your status with: ./info.sh"
echo "Claim rewards after epochs complete with: ./claim.sh"
