use anyhow::Context;

use base64::Engine;
use rsa::pkcs1::EncodeRsaPublicKey;
use rsa::pkcs1v15::SigningKey;
use rsa::pkcs8::{DecodePrivateKey, LineEnding};
use rsa::sha2::Sha256VarCore;
use rsa::signature::{Keypair, RandomizedSigner, SignatureEncoding, SignerMut, Verifier};
use rsa::RsaPrivateKey;
use rsa::{
    pkcs1v15::{Signature, VerifyingKey},
    pkcs8::DecodePublicKey,
    sha2, RsaPublicKey,
};

use sha2::{Digest, Sha256};
use std::error::Error;

use super::Result;

// pub fn load_rsa_public_key(pem: &str) -> Result<RsaPublicKey> {
//     let pem = pem.replace("\\n", "\n");
//     let public_key =
//         RsaPublicKey::from_public_key_pem(&pem).context("Error loading public RSA key")?;
//     Ok(public_key)
// }

// pub fn verify_signature(public_key: &RsaPublicKey, message: &str, signature: &str) -> Result<bool> {
//     let hashed_msg = Sha256::digest(message.as_bytes());
//     let signature = decode_config(signature, URL_SAFE_NO_PAD)?;
//     let padding = rsa::pad::PaddingScheme::new_pkcs1v15_sign(Some(rsa::hash::Hash::SHA2_256));
//     public_key
//         .verify(padding, &hashed_msg, &signature)
//         .map(|_| true)
//         .or(Ok(false))
// }

pub fn load_rsa_public_key_from_base64(pem_base64: &str) -> Result<RsaPublicKey> {
    let public_key_pem = base64::prelude::BASE64_STANDARD
        .decode(pem_base64)
        .context("Could not decode base64 public key")?;
    Ok(RsaPublicKey::from_public_key_der(&public_key_pem).context("Failed to load public key")?)
}

pub fn verify(message: &str, public_key: &RsaPublicKey, signature_base64: &str) -> Result<()> {
    let signature = base64::prelude::BASE64_STANDARD
        .decode(signature_base64)
        .context("Error decoding signature from base64")?;

    let signature =
        Signature::try_from(signature.as_slice()).context("Error creating signature")?;

    let verifying_key = VerifyingKey::<Sha256>::new(public_key.to_owned());

    verifying_key
        .verify(message.as_bytes(), &signature)
        .map_err(|err| super::Error::InvalidSignature)?;
    Ok(())
}

pub(crate) const TEST_RSA_PUBLIC_KEY: &'static str = "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCbWoXkbbwfcZnLW43Vsh1YMu1W5a4reIHvcMYqFjWJl4huA7JKZdC/O3pmEqxdSGZPkerDoN70yfFUPJwKHF+Zc30CWSHTgN+ivR1W4EwyQd48b7WfdU6NVNu2p0p9B2dvcytsdIZ+FKjDwjXplw21//9zX7xLr2rF+YeP1mp20QIDAQAB";
pub(crate) const TEST_RSA_PRIVATE_KEY : &'static str= "MIICdgIBADANBgkqhkiG9w0BAQEFAASCAmAwggJcAgEAAoGBAJtaheRtvB9xmctbjdWyHVgy7Vblrit4ge9wxioWNYmXiG4Dskpl0L87emYSrF1IZk+R6sOg3vTJ8VQ8nAocX5lzfQJZIdOA36K9HVbgTDJB3jxvtZ91To1U27anSn0HZ29zK2x0hn4UqMPCNemXDbX//3NfvEuvasX5h4/WanbRAgMBAAECgYBhrrGxyC4Zt1x0ucSdMbmx05PYp+K0ArnwzIBNxlkzgsyOIFTi4tI27DcyJ1up6/Qo5B8xkt2eHbxYsyOKV/zjjNo7afmQ/woBPgCxuErNJsdo2g0nH0k8A4Pw0FcLQL4sQocyfYsFMNhP56SY5fkgRAdAYPJ5v5RG47dLVoMGYQJBANF69BOAa/V+wubh5d5+l04zDkt/xMq7AoeHbeABpEOAEVwEfYqrH2H/BreUod8LixC6CR1KZZ9s+nnSGd9kz+sCQQC92nGk32kU09OcXtQzRn1Fi2AHvsSShQ8rwf40Buxl0IZK6sQkkSb2Eg1bA+E5KfAbzfX2YziAH/KcsdaxZ2EzAkEAwlK3tpuMCplDviBSOBrgyzcLjLgC2zmt+AGGyKVdNwzHjb/QoeFqZGLKXWRw4NL5d1PMfrJ0IPdcR8PCInyHbwJAT2CqzT1fiQa73hBD9qBNNit83iAjvgMGAcydRRFz+2nBDEe19Hf/6zhG/zvTCfx/2JA3e2mmsOMqo9szIX9QwwJAVfTewPB76mTwrTDbvBXAAXRU1WKpmrDiKHCViRO8Z6iP/KwwQxqpGiZTXr6zN8onidVjRzWJHGcWq3cCGO0v9w==";

/// Only used for testing
fn parse_base64_private_key(private_key: String) -> Result<RsaPrivateKey, anyhow::Error> {
    let private_key_pem = base64::prelude::BASE64_STANDARD
        .decode(private_key)
        .context("Could not decode base64 private key")?;

    RsaPrivateKey::from_pkcs8_der(&private_key_pem).context("Error creating private key")
}

/// Signs a request string using a base 64 encoded private RSA key. Returns the signature as a base64 encoded hex string.
pub(crate) fn sign_request(priv_key_b64: &str, request: &str) -> String {
    let private_key = parse_base64_private_key(priv_key_b64.to_string()).unwrap();
    let signing_key = SigningKey::<Sha256>::new(private_key);

    let mut rng = rand::thread_rng();
    let signature: Signature = signing_key.sign_with_rng(&mut rng, request.as_bytes());
    let signature = hex::decode(signature.to_string().as_str()).unwrap();
    let signature = base64::prelude::BASE64_STANDARD.encode(signature);
    signature
}

#[test]
/// Verifies that the function `load_rsa_public_key_from_base64` creates a valid public key.
fn test_load_static_base64_public_key() {
    let private_key = parse_base64_private_key(TEST_RSA_PRIVATE_KEY.to_string()).unwrap();
    let public_key = load_rsa_public_key_from_base64(TEST_RSA_PUBLIC_KEY).unwrap();

    // Check if the public key that comes from the public key equals the one loaded from base64
    assert_eq!(
        private_key
            .to_public_key()
            .to_pkcs1_pem(LineEnding::CRLF)
            .unwrap(),
        public_key.to_pkcs1_pem(LineEnding::CRLF).unwrap()
    );
}

#[test]
fn verify_message() {
    use rsa::pkcs1v15::{SigningKey, VerifyingKey};
    use rsa::sha2::{Digest, Sha256};
    use rsa::signature::{Keypair, RandomizedSigner, SignatureEncoding, Verifier};

    let signature_base64 = "VI6k2ILEFuB2ltAIYHrEeFjlxq4ZMHdoPTMLxFyHrg1ylnMpFJo2J/YStRKRdEh0Pv+beVWje0Nz+rZ6z3RzPFFwFkgEGK4XT3PGnpYnZXWvvCBHhQg0OmypNftzktUxcekbazWvF4BSTxoFlIDYBdAt5L69lUnwY7GZ9pOXGoU=";
    let data = "a=b&c=[\"1\",\"2\",\"3\"]&recvWindow=5000&timestamp=1499827319559";

    let public_key = load_rsa_public_key_from_base64(TEST_RSA_PUBLIC_KEY).unwrap();

    let generated_signature = sign_request(TEST_RSA_PRIVATE_KEY, data);

    // First test if our own signature works
    verify(data, &public_key, generated_signature.as_str()).unwrap();

    // Now test that the Binance example works.
    verify(data, &public_key, signature_base64).unwrap();

    // If none of the above `unwrap` calls failed, it works.
}
