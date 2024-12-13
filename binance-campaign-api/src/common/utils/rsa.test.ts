// tests/cryptoUtils.test.ts
import {
    loadRsaPublicKeyFromBase64,
    verify,
    signRequest,
} from '@/common/utils/rsa';

const TEST_RSA_PUBLIC_KEY =
    'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCbWoXkbbwfcZnLW43Vsh1YMu1W5a4reIHvcMYqFjWJl4huA7JKZdC/O3pmEqxdSGZPkerDoN70yfFUPJwKHF+Zc30CWSHTgN+ivR1W4EwyQd48b7WfdU6NVNu2p0p9B2dvcytsdIZ+FKjDwjXplw21//9zX7xLr2rF+YeP1mp20QIDAQAB';
const TEST_RSA_PRIVATE_KEY =
    'MIICdgIBADANBgkqhkiG9w0BAQEFAASCAmAwggJcAgEAAoGBAJtaheRtvB9xmctbjdWyHVgy7Vblrit4ge9wxioWNYmXiG4Dskpl0L87emYSrF1IZk+R6sOg3vTJ8VQ8nAocX5lzfQJZIdOA36K9HVbgTDJB3jxvtZ91To1U27anSn0HZ29zK2x0hn4UqMPCNemXDbX//3NfvEuvasX5h4/WanbRAgMBAAECgYBhrrGxyC4Zt1x0ucSdMbmx05PYp+K0ArnwzIBNxlkzgsyOIFTi4tI27DcyJ1up6/Qo5B8xkt2eHbxYsyOKV/zjjNo7afmQ/woBPgCxuErNJsdo2g0nH0k8A4Pw0FcLQL4sQocyfYsFMNhP56SY5fkgRAdAYPJ5v5RG47dLVoMGYQJBANF69BOAa/V+wubh5d5+l04zDkt/xMq7AoeHbeABpEOAEVwEfYqrH2H/BreUod8LixC6CR1KZZ9s+nnSGd9kz+sCQQC92nGk32kU09OcXtQzRn1Fi2AHvsSShQ8rwf40Buxl0IZK6sQkkSb2Eg1bA+E5KfAbzfX2YziAH/KcsdaxZ2EzAkEAwlK3tpuMCplDviBSOBrgyzcLjLgC2zmt+AGGyKVdNwzHjb/QoeFqZGLKXWRw4NL5d1PMfrJ0IPdcR8PCInyHbwJAT2CqzT1fiQa73hBD9qBNNit83iAjvgMGAcydRRFz+2nBDEe19Hf/6zhG/zvTCfx/2JA3e2mmsOMqo9szIX9QwwJAVfTewPB76mTwrTDbvBXAAXRU1WKpmrDiKHCViRO8Z6iP/KwwQxqpGiZTXr6zN8onidVjRzWJHGcWq3cCGO0v9w==';

test('loadRsaPublicKeyFromBase64 should convert base64 DER to PEM', () => {
    // const publicKeyBase64 = '<Your Base64 Encoded Public Key>';
    const publicKeyBase64 = TEST_RSA_PUBLIC_KEY;
    const pem = loadRsaPublicKeyFromBase64(publicKeyBase64);
    expect(pem).toContain('-----BEGIN PUBLIC KEY-----');
});

test('verifySignature should validate a correct signature', () => {
    const message =
        'a=b&c=["1","2","3"]&recvWindow=5000&timestamp=1499827319559';
    const signatureBase64 =
        'VI6k2ILEFuB2ltAIYHrEeFjlxq4ZMHdoPTMLxFyHrg1ylnMpFJo2J/YStRKRdEh0Pv+beVWje0Nz+rZ6z3RzPFFwFkgEGK4XT3PGnpYnZXWvvCBHhQg0OmypNftzktUxcekbazWvF4BSTxoFlIDYBdAt5L69lUnwY7GZ9pOXGoU=';
    const publicKeyPem = loadRsaPublicKeyFromBase64(TEST_RSA_PUBLIC_KEY);
    const generatedSignature = signRequest(TEST_RSA_PRIVATE_KEY, message);

    const isGeneratedValid = verify(message, publicKeyPem, generatedSignature);
    expect(isGeneratedValid).toBe(true);

    const isValid = verify(message, publicKeyPem, signatureBase64);
    expect(isValid).toBe(true);
});
