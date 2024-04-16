use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use diesel::{
    r2d2::{ConnectionManager, Pool},
    PgConnection,
};
use serde::{de::Visitor, Deserialize, Serialize, Serializer};

/// We use a Postgres connection pool
pub type DatabasePool = Pool<ConnectionManager<PgConnection>>;

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
            // Success
            Self::Success => "000000",

            // Too many requests
            Self::TooManyRequests => "000001",

            // System busy
            Self::SystemBusy => "000002",

            // Invalid signature
            Self::InvalidSignature => "000003",

            // Invalid recvWindow
            Self::InvalidRecvWindow => "000004",

            // invalid timestamp. timestamp for this request is outside of the recvWindow. Or timestamp for this request was 1000ms ahead of the server's time.
            Self::InvalidTimestamp => "000005",

            // Invalid argument
            Self::InvalidArgument => "000006",
        }
    }

    pub fn from_code(code: &str) -> Option<Self> {
        match code {
            // Success
            "000000" => Some(Self::Success),

            // Too many requests
            "000001" => Some(Self::TooManyRequests),

            // System busy
            "000002" => Some(Self::SystemBusy),

            // Invalid signature
            "000003" => Some(Self::InvalidSignature),

            // Invalid recvWindow
            "000004" => Some(Self::InvalidRecvWindow),

            // invalid timestamp. timestamp for this request is outside of the recvWindow. Or timestamp for this request was 1000ms ahead of the server's time.
            "000005" => Some(Self::InvalidTimestamp),

            // Invalid argument
            "000006" => Some(Self::InvalidArgument),
            _ => None,
        }
    }
}

struct ResponseCodeVisitor;

impl Into<StatusCode> for ResponseCode {
    fn into(self) -> StatusCode {
        match self {
            Self::Success => StatusCode::OK,
            Self::TooManyRequests => StatusCode::TOO_MANY_REQUESTS,
            Self::SystemBusy => StatusCode::SERVICE_UNAVAILABLE,
            Self::InvalidSignature => StatusCode::UNAUTHORIZED,
            Self::InvalidRecvWindow => StatusCode::BAD_REQUEST,
            Self::InvalidTimestamp => StatusCode::BAD_REQUEST,
            Self::InvalidArgument => StatusCode::BAD_REQUEST,
        }
    }
}

impl<'de> Visitor<'de> for ResponseCodeVisitor {
    type Value = ResponseCode;

    fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
        formatter.write_str("A code between 000000 and 000006")
    }

    fn visit_str<E>(self, v: &str) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        ResponseCode::from_code(v).ok_or(E::custom(format!("{} is not a valid error code", v)))
    }

    fn visit_string<E>(self, v: String) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        ResponseCode::from_code(&v).ok_or(E::custom(format!("{} is not a valid error code", &v)))
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

impl<'de> Deserialize<'de> for ResponseCode {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        deserializer.deserialize_string(ResponseCodeVisitor)
    }
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
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
