all: build run

dev:
	npm run dev

build:
	docker build --no-cache -t red-tetris .
run:
	docker run -p 3004:3004 --name red-tetris-container red-tetris

stop:
	docker stop red-tetris-container

remove:
	docker rm red-tetris-container

clean: stop remove

prune:
	docker system prune -a

.PHONY: build run