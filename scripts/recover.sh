#!/bin/bash

# WORM Recover Script - Recover failed burns
# Usage: ./recover.sh [method] [id_or_burn_key] [spend] [fee]
# Methods: by-id, manual
# Examples: 
#   ./recover.sh by-id 7 0.3 0.001
#   ./recover.sh manual 0x185822be9b9effb2890c0d271d924c48bf5724fcc39667d01545004aff6351ea 0.002 0.001

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

# Parse command line arguments
METHOD=${1}
ID_OR_KEY=${2}
SPEND=${3:-$DEFAULT_SPEND_AMOUNT}
FEE=${4:-$DEFAULT_FEE}

# Show usage if no method provided
if [ -z "$METHOD" ]; then
    echo "=== WORM Recovery Script ==="
    echo ""
    echo "Usage: ./recover.sh [method] [id_or_burn_key] [spend] [fee]"
    echo ""
    echo "Methods:"
    echo "  by-id    - Recover using burn ID (if burn.json exists)"
    echo "  manual   - Recover using burn key (if burn.json missing)"
    echo ""
    echo "Examples:"
    echo "  ./recover.sh by-id 7 0.3 0.001"
    echo "  ./recover.sh manual 0x185822be9b9effb2890c0d271d924c48bf5724fcc39667d01545004aff6351ea 0.002 0.001"
    echo ""
    echo "Note: Look for burn_key in terminal logs from failed burns:"
    echo "  Your burn_key: Fp(0x185822be9b9effb2890c0d271d924c48bf5724fcc39667d01545004aff6351ea)"
    echo "  Use the hex value without Fp(...) wrapper"
    exit 1
fi

# Validate method
if [ "$METHOD" != "by-id" ] && [ "$METHOD" != "manual" ]; then
    echo "Error: Invalid method '$METHOD'. Use 'by-id' or 'manual'"
    exit 1
fi

# Check if ID or key is provided
if [ -z "$ID_OR_KEY" ]; then
    echo "Error: Please provide burn ID (for by-id) or burn key (for manual)"
    exit 1
fi

echo "=== WORM Recovery Operation ==="
echo "Network: sepolia"
echo "Address: $SENDER_ADDRESS"
echo "Method: $METHOD"
if [ "$METHOD" = "by-id" ]; then
    echo "Burn ID: $ID_OR_KEY"
else
    echo "Burn Key: $ID_OR_KEY"
fi
echo "Spend amount: $SPEND BETH"
echo "Fee: $FEE BETH"
echo ""

# Confirm operation
read -p "Proceed with recovery operation? (y/N): " confirm
if [[ $confirm != [yY] ]]; then
    echo "Operation cancelled."
    exit 0
fi

echo "Executing recovery..."

if [ "$METHOD" = "by-id" ]; then
    # Recovery by ID
    worm-miner recover by-id \
        --id "$ID_OR_KEY" \
        --private-key "$SENDER_PRIVATE_KEY" \
        --network sepolia \
        --spend "$SPEND"
else
    # Manual recovery
    worm-miner recover manual \
        --burn-key "$ID_OR_KEY" \
        --fee "$FEE" \
        --spend "$SPEND" \
        --network sepolia \
        --private-key "$SENDER_PRIVATE_KEY"
fi

echo ""
echo "Recovery operation completed!"
echo ""
echo "Updated account status:"
worm-miner info \
    --network sepolia \
    --private-key "$SENDER_PRIVATE_KEY"
