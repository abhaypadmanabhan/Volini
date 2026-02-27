.PHONY: dev-web dev-agent dev

PYTHON := agent/venv/bin/python

dev-web:
	npm run dev

dev-agent:
	$(PYTHON) agent/agent.py dev

dev:
	@echo "Start these in separate terminals:"
	@echo "  make dev-web    → Next.js frontend"
	@echo "  make dev-agent  → Python LiveKit agent"
