run:
	docker build -t test_backend -f Dockerfile .
	docker run --env-file=.env -p 9000:9000 test_backend:latest
