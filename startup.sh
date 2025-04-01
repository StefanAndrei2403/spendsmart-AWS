#!/bin/bash

echo "Installing dependencies..."
npm install

echo "Building frontend..."
npm run build

echo "Starting server..."
npm run server
