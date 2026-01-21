start:
	service start

stop:
	service stop

test:
	pnpm run test

test.coverage:
	pnpm run test:cov

.PHONY: test
