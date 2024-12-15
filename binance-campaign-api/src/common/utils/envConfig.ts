import dotenv from 'dotenv';
import { cleanEnv, host, num, port, str, testOnly } from 'envalid';

dotenv.config({ override: true });

export const env = cleanEnv(process.env, {
    NODE_ENV: str({
        devDefault: testOnly('test'),
        choices: ['development', 'production', 'test'],
    }),
    HOST: host({ devDefault: testOnly('localhost') }),
    PORT: port({ devDefault: testOnly(3000) }),
    CORS_ORIGIN: str({ devDefault: testOnly('http://localhost:3000') }),
    RSA_PUBLIC_KEY_BASE64: str({ devDefault: testOnly('mocked-public-key') }),
    METIS_RPC: str({
        devDefault: testOnly('https://andromeda.metis.io/?owner=1088'),
    }),
    CONTRACT_ADDRESS: str({ devDefault: testOnly('wha') }),
    COMMON_RATE_LIMIT_MAX_REQUESTS: num({ devDefault: testOnly(1000) }),
    COMMON_RATE_LIMIT_WINDOW_MS: num({ devDefault: testOnly(1000) }),
});
