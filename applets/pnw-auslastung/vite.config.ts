import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { homedir } from 'node:os';

try {
    process.loadEnvFile('./.env');
} catch {}

function expandHome(path: string) {
    if (path === '~') {
        return homedir();
    }
    if (path.startsWith('~/')) {
        return homedir() + path.slice(1);
    }
    return path;
}

if (!process.env.KILANKA_APPLET_ENV_FILE) {
    throw new Error('KILANKA_APPLET_ENV_FILE not set');
}
const envFile = process.env.KILANKA_APPLET_ENV_FILE;
process.loadEnvFile(expandHome(envFile));

const appletToken = process.env.KILANKA_APPLET_TOKEN;
if (!appletToken) {
    throw new Error(
        `KILANKA_APPLET_TOKEN not set (expected in ${envFile} or environment)`,
    );
}

const appletUrl = process.env.KILANKA_APPLET_URL;
if (!appletUrl) {
    throw new Error(
        `KILANKA_APPLET_URL not set (expected in ${envFile} or environment)`,
    );
}

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    base: './',
    server: {
        proxy: {
            '/be/api/public/v2': {
                target: appletUrl,
                changeOrigin: true,
                headers: {
                    authorization: `Bearer ${appletToken}`,
                },
            },
            // Interner RPC (undokumentiert!) — liefert die von Kilanka
            // berechneten Kontingent- und Betreuer-Wochenstunden.
            // Im veröffentlichten Applet läuft der Aufruf same-origin
            // über die Nutzer-Session; im Dev-Modus versuchen wir es
            // mit dem Applet-Token.
            '/be/api/v2/rpc': {
                target: appletUrl,
                changeOrigin: true,
                headers: {
                    authorization: `Bearer ${appletToken}`,
                },
            },
        },
    },
});
