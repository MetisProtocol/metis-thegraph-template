use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Serialize, Serializer};

#[derive(Debug)]
pub enum ResponseCode {
    /// Success
    Success,

    /// Too many requests
    TooManyRequests,

    /// System busy
    SystemBusy,

    /// Invalid signature
    InvalidSignature,

    /// Invalid recvWindow
    InvalidRecvWindow,

    /// invalid timestamp. timestamp for this request is outside of the recvWindow. Or timestamp for this request was 1000ms ahead of the server's time.
    InvalidTimestamp,

    /// Invalid argument
    InvalidArgument,
}

impl ResponseCode {
    pub fn code(&self) -> &'static str {
        match self {
            /// Success
            Self::Success => "000001",

            /// Too many requests
            Self::TooManyRequests => "000002",

            /// System busy
            Self::SystemBusy => "000003",

            /// Invalid signature
            Self::InvalidSignature => "000004",

            /// Invalid recvWindow
            Self::InvalidRecvWindow => "000005",

            /// invalid timestamp. timestamp for this request is outside of the recvWindow. Or timestamp for this request was 1000ms ahead of the server's time.
            Self::InvalidTimestamp => "000006",

            /// Invalid argument
            Self::InvalidArgument => "000007",
        }
    }
}

impl Into<StatusCode> for ResponseCode {
    fn into(self) -> StatusCode {
        match self {
            Self::Success => StatusCode::OK,
            Self::TooManyRequests => StatusCode::TOO_MANY_REQUESTS,
            Self::SystemBusy => StatusCode::SERVICE_UNAVAILABLE,
            Self::InvalidSignature => StatusCode::BAD_REQUEST,
            Self::InvalidRecvWindow => StatusCode::BAD_REQUEST,
            Self::InvalidTimestamp => StatusCode::BAD_REQUEST,
            Self::InvalidArgument => StatusCode::BAD_REQUEST,
        }
    }
}

impl Serialize for ResponseCode {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.code())
    }
}

#[derive(Debug, serde::Serialize)]
pub struct ResponseWrapper<T: Serialize> {
    pub code: ResponseCode,
    pub message: String,
    pub data: T,
}

impl<T: Serialize> IntoResponse for ResponseWrapper<T> {
    fn into_response(self) -> Response {
        // Serialize the `ResponseWrapper<T>` instance to a JSON string
        match serde_json::to_string(&self) {
            Ok(body) => {
                let status_code: StatusCode = self.code.into();

                // Create a response with the serialized body
                // and set `Content-Type` header to `application/json`
                axum::response::Response::builder()
                    .status(status_code)
                    .header("Content-Type", "application/json")
                    .body(axum::body::Body::from(body))
                    .unwrap()
            }
            Err(_) => {
                let default_response = ResponseWrapper {
                    code: ResponseCode::InvalidArgument,
                    message: "Unexpected error".to_string(),
                    data: "An unexpected error occurred.".to_string(),
                };

                // In case of serialization error, return a 500 Internal Server Error response
                axum::response::Response::builder()
                    .status(StatusCode::INTERNAL_SERVER_ERROR)
                    .header("Content-Type", "application/json")
                    .body(axum::body::Body::from(
                        serde_json::to_string(&default_response).unwrap(),
                    ))
                    .unwrap()
            }
        }
    }
}
