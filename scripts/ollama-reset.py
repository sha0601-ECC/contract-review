#!/usr/bin/env python3
"""
Ollama Model Setup Script for Contract Review System

Usage:
    # Pull vision model (required for image analysis)
    python scripts/ollama-reset.py --pull llama3.2-vision:latest

    # Reset (delete and re-pull) a model
    python scripts/ollama-reset.py --reset llama3.2-vision:latest

    # List installed models
    python scripts/ollama-reset.py --list

    # Health check
    python scripts/ollama-reset.py --health

Environment:
    OLLAMA_BASE_URL - Ollama server URL (default: http://localhost:11434)
"""

import argparse
import sys
import urllib.request
import urllib.error
import json
import os


OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
MODEL_TAG = "llama3.2-vision:latest"


def check_health() -> bool:
    """Check if Ollama server is running."""
    try:
        req = urllib.request.Request(
            f"{OLLAMA_BASE_URL}/api/tags",
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status == 200
    except Exception:
        return False


def list_models() -> list[dict]:
    """List all installed models."""
    try:
        req = urllib.request.Request(
            f"{OLLAMA_BASE_URL}/api/tags",
            method="GET",
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            return data.get("models", [])
    except Exception as e:
        print(f"Error listing models: {e}")
        return []


def pull_model(model_name: str) -> bool:
    """Pull a model from Ollama registry."""
    print(f"Pulling model: {model_name} ...")
    print("(This may take several minutes on first download)\n")

    try:
        req = urllib.request.Request(
            f"{OLLAMA_BASE_URL}/api/pull",
            method="POST",
            data=json.dumps({"name": model_name}).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=300) as resp:
            # Streaming response - print progress
            for line in resp:
                line = line.decode().strip()
                if line:
                    try:
                        data = json.loads(line)
                        if "status" in data:
                            print(f"\r{data.get('status', '')}", end="", flush=True)
                        if data.get("done"):
                            print()  # newline after progress
                    except json.JSONDecodeError:
                        pass
            print(f"\n✓ Model '{model_name}' is ready")
            return True
    except Exception as e:
        print(f"\nError pulling model: {e}")
        return False


def delete_model(model_name: str) -> bool:
    """Delete a model from local storage."""
    print(f"Deleting model: {model_name} ...")
    try:
        req = urllib.request.Request(
            f"{OLLAMA_BASE_URL}/api/delete",
            method="DELETE",
            data=json.dumps({"name": model_name}).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            print(f"✓ Model '{model_name}' deleted")
            return True
    except Exception as e:
        print(f"Error deleting model: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Ollama model management script for Contract Review System"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--pull", metavar="MODEL", help="Pull a model")
    group.add_argument("--reset", metavar="MODEL", help="Delete and re-pull a model")
    group.add_argument("--list", action="store_true", help="List installed models")
    group.add_argument("--health", action="store_true", help="Check Ollama server health")

    args = parser.parse_args()

    if args.health:
        print(f"Checking Ollama at {OLLAMA_BASE_URL} ...")
        if check_health():
            print("✓ Ollama server is healthy")
            sys.exit(0)
        else:
            print("✗ Ollama server is not reachable")
            print("\nMake sure Ollama is running:")
            print("  docker-compose up ollama -d")
            sys.exit(1)

    if args.list:
        print(f"Installed models on {OLLAMA_BASE_URL}:\n")
        models = list_models()
        if not models:
            print("  (no models installed)")
        for model in models:
            name = model.get("name", "unknown")
            size = model.get("size", 0)
            size_gb = size / (1024**3)
            print(f"  • {name}  ({size_gb:.2f} GB)")
        sys.exit(0)

    if args.pull:
        success = pull_model(args.pull)
        sys.exit(0 if success else 1)

    if args.reset:
        # Delete first
        delete_model(args.reset)
        # Then pull
        success = pull_model(args.reset)
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
