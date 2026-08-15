.PHONY: backend-install frontend-install runner-image migrate seed test backend frontend

backend-install:
	cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt

frontend-install:
	cd frontend && npm install

runner-image:
	docker build -t interview-anvil-java-runner:local ./code-runner/java

migrate:
	cd backend && .venv/bin/alembic upgrade head

seed:
	cd backend && .venv/bin/python -m app.seed

test:
	cd backend && .venv/bin/pytest -q
	cd code-runner && PYTHONPATH=../backend ../backend/.venv/bin/pytest -q
	cd frontend && npm test

backend:
	cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev
