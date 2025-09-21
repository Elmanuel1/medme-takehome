# MedMe Schedule Service Makefile

.PHONY: test test-unit test-integration run docker-run

# Test the application (all tests)
test:
	npm test

# Run unit tests only
test-unit:
	npm run test:unit

# Run integration tests only
test-integration:
	npm run test:integration

# Run the application
run:
	npm run build
	npm start

# Build and run with Docker
docker-run:
	npm run build
	docker-compose up -d
