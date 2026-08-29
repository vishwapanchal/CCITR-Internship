#!/bin/bash

echo "==========================================="
echo "   APEX-X Setup: Installing Dependencies"
echo "==========================================="

# 1. System packages (Apktool, Jadx)
echo "[*] Installing Apktool and Jadx via APT..."
sudo apt-get update
sudo apt-get install -y apktool jadx

# 2. Ollama Models
echo "[*] Checking Ollama..."
if ! command -v ollama &> /dev/null
then
    echo "[!] Ollama could not be found. Please install it first from https://ollama.com/"
else
    echo "[*] Pulling required AI models (this may take a few minutes)..."
    # Ensure ollama server is running in the background for pulls to work
    if ! curl -s http://localhost:11434/api/tags > /dev/null; then
        echo "[*] Starting temporary Ollama server in the background..."
        ollama serve > /dev/null 2>&1 &
        OLLAMA_PID=$!
        sleep 3
    fi

    echo "  - Pulling qwen2.5-coder:7b..."
    ollama pull qwen2.5-coder:7b
    
    echo "  - Pulling llama3..."
    ollama pull llama3

    if [ -n "$OLLAMA_PID" ]; then
        echo "[*] Stopping temporary Ollama server..."
        kill $OLLAMA_PID
    fi
fi

echo "==========================================="
echo "   Done! You can now run ./start.sh"
echo "==========================================="
