use anyhow::Context;
use base64::;
use rsa::{
    pkcs8::{DecodePublicKey, FromPublicKey},
    sha2, RsaPublicKey,
};
use sha2::{Digest, Sha256};
use std::error::Error;

use super::Result;

pub fn load_rsa_public_key(pem: &str) -> Result<RsaPublicKey> {
    let pem = pem.replace("\\n", "\n");
    let public_key =
        RsaPublicKey::from_public_key_pem(&pem).context("Error loading public RSA key")?;
    Ok(public_key)
}

pub fn verify_signature(public_key: &RsaPublicKey, message: &str, signature: &str) -> Result<bool> {
    let hashed_msg = Sha256::digest(message.as_bytes());
    let signature = decode_config(signature, URL_SAFE_NO_PAD)?;
    let padding = rsa::pad::PaddingScheme::new_pkcs1v15_sign(Some(rsa::hash::Hash::SHA2_256));
    public_key
        .verify(padding, &hashed_msg, &signature)
        .map(|_| true)
        .or(Ok(false))
}
