import * as crypto from 'crypto';
import * as forge from 'node-forge';

export function loadRsaPublicKeyFromBase64(pemBase64: string): string {
    // Decode the base64-encoded DER key
    const derBuffer = Buffer.from(pemBase64, 'base64');

    // Use node-forge to convert DER to PEM
    const asn1Obj = forge.asn1.fromDer(derBuffer.toString('binary'));
    const publicKey = forge.pki.publicKeyFromAsn1(asn1Obj);
    const pem = forge.pki.publicKeyToPem(publicKey);

    return pem;
}

export function verify(
    message: string,
    publicKeyPem: string,
    signatureBase64: string,
): boolean {
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(message);
    verifier.end();

    const signature = Buffer.from(signatureBase64, 'base64');
    return verifier.verify(publicKeyPem, signature);
}

export function parseBase64PrivateKey(
    privateKeyBase64: string,
): crypto.KeyObject {
    const privateKeyDer = Buffer.from(privateKeyBase64, 'base64');
    const privateKeyAsn1 = forge.asn1.fromDer(privateKeyDer.toString('binary'));
    const privateKey = forge.pki.privateKeyFromAsn1(privateKeyAsn1);
    const privateKeyPem = forge.pki.privateKeyToPem(privateKey);
    return crypto.createPrivateKey(privateKeyPem);
}

export function signRequest(privateKeyBase64: string, request: string): string {
    const privateKey = parseBase64PrivateKey(privateKeyBase64);
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(request);
    sign.end();
    const signature = sign.sign(privateKey);
    const signatureBase64 = signature.toString('base64');
    return signatureBase64;
}
