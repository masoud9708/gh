#!/bin/bash
echo "Starting Ghachagh platforms..."

# Start Hardhat node in the background
cd contracts
npx hardhat node > hardhat_node.log 2>&1 &
HARDHAT_PID=$!
echo "Hardhat Node started (PID: $HARDHAT_PID)"

# Wait for node to be ready
sleep 3

# Deploy contracts locally
npx hardhat run scripts/deploy-v4.ts --network localhost > deploy.log 2>&1
echo "Contracts deployed."

# Start Backend
cd ../backend
npm run start > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started on port 4000 (PID: $BACKEND_PID)"

# Start Frontend
cd ../frontend
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started on port 4001 (PID: $FRONTEND_PID)"

echo "All services started! Press Ctrl+C to stop."

# Wait for user interrupt
trap "kill $HARDHAT_PID $BACKEND_PID $FRONTEND_PID; exit" INT TERM
wait
