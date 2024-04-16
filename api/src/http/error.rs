use axum::http::StatusCode;
use axum::response::IntoResponse;
use log::error;
use std::borrow::Cow;
use std::collections::HashMap;

use super::types::{ResponseCode, ResponseWrapper};

/// A common error type that can be used throughout the API.
///
/// Can be returned in a `Result` from an API handler function.
///
/// For convenience, this represents both API errors as well as internal recoverable errors,
/// and maps them to appropriate status codes along with at least a minimally useful error
/// message in a plain text body, or a JSON body in the case of `UnprocessableEntity`.
#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("Invalid receive window")]
    InvalidRecvWindow,

    #[error("Invalid timestamp. timestamp for this request is outside of the recvWindow. Or timestamp for this request was 1000ms ahead of the server's time.")]
    InvalidTimestamp,

    #[error("invalid signature")]
    InvalidSignature,

    /// Return `401 Unauthorized`
    #[error("authentication required")]
    Unauthorized,

    #[error("invalid argument")]
    InvalidArgument(String),

    /// Return `403 Forbidden`
    #[error("user may not perform that action")]
    Forbidden,

    /// Return `404 Not Found`
    #[error("request path not found")]
    NotFound,

    /// Return `422 Unprocessable Entity`
    ///
    /// This also serializes the `errors` map to JSON to satisfy the requirement for
    /// `422 Unprocessable Entity` errors in the Realworld spec:
    /// https://realworld-docs.netlify.app/docs/specs/backend-specs/error-handling
    ///
    /// For a good API, the other status codes should also ideally map to some sort of JSON body
    /// that the frontend can deal with, but I do admit sometimes I've just gotten lazy and
    /// returned a plain error message if there were few enough error modes for a route
    /// that the frontend could infer the error from the status code alone.
    #[error("error in the request body")]
    UnprocessableEntity {
        errors: HashMap<Cow<'static, str>, Vec<Cow<'static, str>>>,
    },

    /// Return `500 Internal Server Error` on a `anyhow::Error`.
    ///
    /// `anyhow::Error` is used in a few places to capture context and backtraces
    /// on unrecoverable (but technically non-fatal) errors which could be highly useful for
    /// debugging. We use it a lot in our code fsor background tasks or making API calls
    /// to external services so we can use `.context()` to refine the logged error.
    ///
    /// Via the generated `From<anyhow::Error> for Error` impl, this allows the
    /// use of `?` in handler functions to automatically convert `anyhow::Error` into a response.
    ///
    /// Like with `Error::Sqlx`, the actual error message is not returned to the client
    /// for security reasons.
    #[error("an internal server error occurred")]
    Anyhow(#[from] anyhow::Error),
}

impl Error {
    /// Convenient constructor for `Error::UnprocessableEntity`.
    ///
    /// Multiple for the same key are collected into a list for that key.
    ///
    /// Try "Go to Usage" in an IDE for examples.
    pub fn unprocessable_entity<K, V>(errors: impl IntoIterator<Item = (K, V)>) -> Self
    where
        K: Into<Cow<'static, str>>,
        V: Into<Cow<'static, str>>,
    {
        let mut error_map = HashMap::new();

        for (key, val) in errors {
            error_map
                .entry(key.into())
                .or_insert_with(Vec::new)
                .push(val.into());
        }

        Self::UnprocessableEntity { errors: error_map }
    }

    // fn status_code(&self) -> StatusCode {
    //     match self {
    //         Self::InvalidRecvWindow => StatusCode::BAD_REQUEST,
    //         Self::InvalidSignature => StatusCode::UNAUTHORIZED,
    //         Self::Unauthorized => StatusCode::UNAUTHORIZED,
    //         Self::InvalidArgument(_) => StatusCode::BAD_REQUEST,
    //         Self::Forbidden => StatusCode::FORBIDDEN,
    //         Self::NotFound => StatusCode::NOT_FOUND,
    //         Self::UnprocessableEntity { .. } => StatusCode::UNPROCESSABLE_ENTITY,
    //         Self::Anyhow(_) => StatusCode::INTERNAL_SERVER_ERROR,
    //         Self::InvalidTimestamp => StatusCode::BAD_REQUEST,
    //     }
    // }

    fn response_code(&self) -> ResponseCode {
        match self {
            Self::InvalidRecvWindow => ResponseCode::InvalidRecvWindow,
            Self::InvalidSignature => ResponseCode::InvalidSignature,
            Self::Unauthorized => ResponseCode::InvalidRecvWindow,
            Self::InvalidArgument(_) => ResponseCode::InvalidArgument,
            Self::Forbidden => ResponseCode::InvalidRecvWindow,
            Self::NotFound => ResponseCode::InvalidRecvWindow,
            Self::UnprocessableEntity { .. } => ResponseCode::InvalidRecvWindow,
            Self::Anyhow(_) => ResponseCode::InvalidRecvWindow,
            Self::InvalidTimestamp => ResponseCode::InvalidTimestamp,
        }
    }
}

// Axum allows you to return `Result` from handler functions, but the error type
// also must be some sort of response type.
//
// By default, the generated `Display` impl is used to return a plaintext error message
// to the client.
impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        // match self {
        //     Self::UnprocessableEntity { errors } => {
        //         #[derive(serde::Serialize)]
        //         struct Errors {
        //             errors: HashMap<Cow<'static, str>, Vec<Cow<'static, str>>>,
        //         }

        //         return (StatusCode::UNPROCESSABLE_ENTITY, Json(Errors { errors })).into_response();
        //     }

        //     Self::Unauthorized => {
        //         return (
        //             self.status_code(),
        //             // Include the `WWW-Authenticate` challenge required in the specification
        //             // for the `401 Unauthorized` response code:
        //             // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401
        //             //
        //             // The Realworld spec does not specify this:
        //             // https://realworld-docs.netlify.app/docs/specs/backend-specs/error-handling
        //             //
        //             // However, at Launchbadge we try to adhere to web standards wherever possible,
        //             // if nothing else than to try to act as a vanguard of sanity on the web.
        //             [(WWW_AUTHENTICATE, HeaderValue::from_static("Token"))]
        //                 .into_iter()
        //                 .collect::<HeaderMap>(),
        //             self.to_string(),
        //         )
        //             .into_response();
        //     }

        //     Self::Anyhow(ref e) => {
        //         // TODO: we probably want to use `tracing` instead
        //         // so that this gets linked to the HTTP request by `TraceLayer`.
        //         log::error!("Generic error: {:?}", e);
        //     }

        //     // Other errors get mapped normally.
        //     _ => (),
        // }

        match self {
            Self::Anyhow(ref e) => {
                error!("An unexpected error occured: {:?}", e);
                // TODO: this should not happen and therefore be logged to sentry
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "An unexpected error occurred. We are investigating the problem.",
                )
                    .into_response();
            }
            Self::InvalidArgument(ref body) => {
                return ResponseWrapper {
                    code: self.response_code(),
                    message: self.to_string(),
                    data: body.to_owned(),
                }
                .into_response();
            }
            _ => (),
        }

        // Phantom data
        let data: Option<u8> = None;

        let response = ResponseWrapper {
            code: self.response_code(),
            message: self.to_string(),
            data,
        };

        response.into_response()
    }
}

// Axum allows you to return `Result` from handler functions, but the error type
// also must be some sort of response type.
//
// By default, the generated `Display` impl is used to return a plaintext error message
// to the client.
// impl IntoResponse for Error {
//     type Body = Full<Bytes>;
//     type BodyError = <Full<Bytes> as HttpBody>::Error;

//     fn into_response(self) -> Response<Full<Bytes>> {
//         match self {
//             Self::UnprocessableEntity { errors } => {
//                 #[derive(serde::Serialize)]
//                 struct Errors {
//                     errors: HashMap<Cow<'static, str>, Vec<Cow<'static, str>>>,
//                 }

//                 return (StatusCode::UNPROCESSABLE_ENTITY, Json(Errors { errors })).into_response();
//             }
//             Self::Unauthorized => {
//                 return (
//                     self.status_code(),
//                     // Include the `WWW-Authenticate` challenge required in the specification
//                     // for the `401 Unauthorized` response code:
//                     // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401
//                     //
//                     // The Realworld spec does not specify this:
//                     // https://realworld-docs.netlify.app/docs/specs/backend-specs/error-handling
//                     //
//                     // However, at Launchbadge we try to adhere to web standards wherever possible,
//                     // if nothing else than to try to act as a vanguard of sanity on the web.
//                     [(WWW_AUTHENTICATE, HeaderValue::from_static("Token"))]
//                         .into_iter()
//                         .collect::<HeaderMap>(),
//                     self.to_string(),
//                 )
//                     .into_response();
//             }

//             Self::Anyhow(ref e) => {
//                 // TODO: we probably want to use `tracing` instead
//                 // so that this gets linked to the HTTP request by `TraceLayer`.
//                 log::error!("Generic error: {:?}", e);
//             }

//             // Other errors get mapped normally.
//             _ => (),
//         }

//         (self.status_code(), self.to_string()).into_response()
//     }
// }
