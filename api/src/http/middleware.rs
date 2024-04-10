// use axum::{
//     async_trait,
//     extract::{FromRequest, Request},
//     http::{header, StatusCode},
//     middleware::Next,
//     response::{IntoResponse, Response},
//     routing::post,
//     Extension, Json, Router,
// };
// use hex;
// use rsa::{
//     pkcs1::{DecodeRsaPublicKey, FromRsaPublicKey},
//     sha2::Sha256,
//     PublicKey, RsaPublicKey,
// };
// use std::{collections::HashMap, convert::Infallible};

// // Define a struct to hold your API keys and other config
// struct ApiConfig {
//     pub public_key: RsaPublicKey,
// }

// // Middleware to verify the signature
// struct VerifySignature;

// fn authorize(mut req: Request, next: Next) {
//     let auth_header = req
//         .headers()
//         .get("signature")
//         .and_then(|header| header.to_str().ok());

//     let signature = if let Some(auth_header) = auth_header {
//         auth_header
//     } else {
//         return Err(StatusCode::UNAUTHORIZED);
//     };

//     let query: HashMap<String, String> = req
//         .uri()
//         .query()
//         .map(|v| {
//             url::form_urlencoded::parse(v.as_bytes())
//                 .into_owned()
//                 .collect()
//         })
//         .unwrap_or_default();

//     let Ok(rsa_public_key) = RsaPublicKey::from_pkcs1_pem("MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCbWoXkbbwfcZnLW43Vsh1YMu1W5a4reIHvcMYqFjWJl4huA7JKZdC/O3pmEqxdSGZPkerDoN70yfFUPJwKHF+Zc30CWSHTgN+ivR1W4EwyQd48b7WfdU6NVNu2p0p9B2dvcytsdIZ+FKjDwjXplw21//9zX7xLr2rF+YeP1mp20QIDAQAB") else {
// 			return Err(StatusCode::UNAUTHORIZED);
// 		};

//     // Verify the signature
//     if verify_signature(&rsa_public_key, &query, &signature.to_string()).is_err() {
//         return Err(StatusCode::UNAUTHORIZED);
//     }
//     Ok(next.run(req).await)
// }

// // Your verification function
// fn verify_signature(
//     public_key: &RsaPublicKey,
//     params: &HashMap<String, String>,
//     signature: &str,
// ) -> Result<(), rsa::errors::Error> {
//     let mut hasher = Sha256;
//     // Assuming `params` is a sorted collection of the parameters to be verified
//     let params_string = params
//         .iter()
//         .map(|(k, v)| format!("{}={}", k, v))
//         .collect::<Vec<String>>()
//         .join("&");
//     hasher.update(params_string.as_bytes());
//     let hashed = hasher.finalize();

//     let signature_bytes = hex::decode(signature).map_err(|_| rsa::errors::Error::Verification)?;
//     let padding = rsa::padding::PaddingScheme::new_pkcs1v15_sign(None);
//     public_key.verify(padding, &hashed, &signature_bytes)
// }
