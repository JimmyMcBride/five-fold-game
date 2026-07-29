import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command:
			'FIVEFOLD_TEST_MODE=true bun run build && FIVEFOLD_TEST_MODE=true bun run preview -- --host 127.0.0.1',
		url: 'http://127.0.0.1:4173',
		reuseExistingServer: false
	},
	testDir: 'tests',
	testMatch: '**/*.e2e.{ts,js}',
	use: {
		baseURL: 'http://127.0.0.1:4173',
		trace: 'retain-on-failure'
	}
});
