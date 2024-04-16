use std::time::UNIX_EPOCH;

use anyhow::Context;
use axum::{routing::get, Json, Router};

use super::{
    types::{ResponseCode, ResponseWrapper},
    Result,
};

pub fn router() -> Router {
    // By having each module responsible for setting up its own routing,
    // it makes the root module a lot cleaner.
    Router::new().route("/time", get(handler))
}

async fn handler() -> Result<Json<ResponseWrapper<u128>>> {
    let server_time = std::time::SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .context("Error calculating time")?;
    let response = ResponseWrapper {
        code: ResponseCode::Success,
        message: "success".to_string(),
        data: server_time.as_millis(),
    };

    Ok(Json(response))
}
