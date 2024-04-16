use anyhow::Context;

use base64::Engine;
use rsa::signature::Verifier;
use rsa::{
    pkcs1v15::{Signature, VerifyingKey},
    pkcs8::DecodePublicKey,
    sha2, RsaPublicKey,
};

use sha2::Sha256;

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
        .map_err(|_| super::Error::InvalidSignature)?;
    Ok(())
}

#[cfg(test)]
pub mod test_util {
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

    /// Only used for testing
    fn parse_base64_private_key(private_key: String) -> Result<RsaPrivateKey, anyhow::Error> {
        let private_key_pem = base64::prelude::BASE64_STANDARD
            .decode(private_key)
            .context("Could not decode base64 private key")?;

        RsaPrivateKey::from_pkcs8_der(&private_key_pem).context("Error creating private key")
    }
}

#[test]
/// Verifies that the function `load_rsa_public_key_from_base64` creates a valid public key.
fn test_load_static_base64_public_key() {
    let private_key =
        test_util::parse_base64_private_key(crate::test::TEST_RSA_PRIVATE_KEY.to_string()).unwrap();
    let public_key = load_rsa_public_key_from_base64(crate::test::TEST_RSA_PUBLIC_KEY).unwrap();

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

    let public_key = load_rsa_public_key_from_base64(crate::test::TEST_RSA_PUBLIC_KEY).unwrap();

    let generated_signature = test_util::sign_request(crate::test::TEST_RSA_PRIVATE_KEY, data);

    // First test if our own signature works
    verify(data, &public_key, generated_signature.as_str()).unwrap();

    // Now test that the Binance example works.
    verify(data, &public_key, signature_base64).unwrap();

    // If none of the above `unwrap` calls failed, it works.
}
