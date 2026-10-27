import path from 'node:path'

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	reactStrictMode: true,
	poweredByHeader: false,
	sassOptions: {
		// Позволяет писать @use "shared/styles/mixins" из любого модуля
		loadPaths: [path.resolve('src')]
	}
}

export default nextConfig
