use std::time::{SystemTime, UNIX_EPOCH};

use super::{
    rsa::{load_rsa_public_key_from_base64, verify},
    ApiContext, Error,
};
use anyhow::anyhow;
use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{header::HeaderValue, request::Parts},
    Extension,
};
use serde::Deserialize;

pub struct AuthSignature;

impl AuthSignature {
    fn from_signature(
        ctx: &ApiContext,
        signature_header: &HeaderValue,
        search: &str,
    ) -> Result<Self, Error> {
        let signature_header = signature_header.to_str().map_err(|_| {
            log::debug!("Signature header is not UTF-8");
            Error::InvalidSignature
        })?;

        let public_key = load_rsa_public_key_from_base64(&ctx.config.rsa_public_key)?;

        match verify(search, &public_key, signature_header) {
            Err(e) => {
                log::debug!("Provided signature was not valid.");
                return Err(e);
            }
            _ => {}
        };

        Ok(Self)
    }
}

#[async_trait]
impl<S> FromRequestParts<S> for AuthSignature
where
    S: Send + Sync,
{
    type Rejection = Error;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let ctx: Extension<ApiContext> = Extension::from_request_parts(parts, state)
            .await
            .expect("BUG: ApiContext was not added as an extension");

        let query = urlencoding::decode(parts.uri.query().unwrap())
            .unwrap()
            .to_string();

        let Some(header) = parts.headers.get("signature") else {
            return Err(Error::InvalidSignature);
        };

        Self::from_signature(&ctx, header, &query)
    }
}

#[derive(Deserialize)]
pub struct RecvWindowQueryParams {
    recv_window: u64,
    timestamp: u128,
}

#[async_trait]
impl<S> FromRequestParts<S> for RecvWindowQueryParams
where
    S: Send + Sync,
{
    type Rejection = Error;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let query = parts.uri.query().unwrap_or_default();
        let query_pairs = serde_urlencoded::from_str::<Vec<(String, String)>>(query)
            .map_err(|_| Error::Anyhow(anyhow!("Could not parse query parameters.")))?;

        let mut recv_window = None;
        let mut timestamp = None;

        for (key, value) in query_pairs {
            match key.as_str() {
                "recvWindow" => {
                    recv_window =
                        Some(value.parse().map_err(|_| {
                            Error::InvalidArgument(format!("recvWindow must be a u64"))
                        })?)
                }
                "timestamp" => {
                    timestamp =
                        Some(value.parse().map_err(|_| {
                            Error::InvalidArgument(format!("timestamp must be a u128"))
                        })?)
                }
                _ => (),
            }
        }

        let params = RecvWindowQueryParams {
            recv_window: recv_window
                .ok_or(Error::InvalidArgument(format!("recvWindow is missing")))?,
            timestamp: timestamp.ok_or(Error::InvalidArgument(format!("timestamp is missing")))?,
        };

        let server_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("BUG: Time went backwards")
            .as_millis();

        // NOCHANGE: BINANCE REQUIREMENT
        if !(params.recv_window <= 10_000) {
            return Err(Error::InvalidRecvWindow);
        }

        // Our time - 3000 must be below the timestamp of the client
        if !(server_time - 3000 < params.timestamp) {
            return Err(Error::InvalidTimestamp);
        }

        // The client's time must be below our time + the recvWindow
        if !(params.timestamp < server_time + params.recv_window as u128) {
            return Err(Error::InvalidTimestamp);
        }
        // -------------------------------

        Ok(params)
    }
}
