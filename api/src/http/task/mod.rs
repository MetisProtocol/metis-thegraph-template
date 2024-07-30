use std::time::UNIX_EPOCH;

use anyhow::Context;
use axum::extract::Query;
use axum::Extension;
use axum::{routing::get, Json, Router};
use diesel::query_dsl::methods::FilterDsl;
use diesel::sql_types::{Integer, Text};
use diesel::{
    BoolExpressionMethods, ExpressionMethods, OptionalExtension, PgConnection, RunQueryDsl,
};

use crate::db::schema::sgd1::participant::{self, dsl as table};
use crate::db::schema::sgd1::Participant;
use crate::http::extractor::{AuthSignature, RecvWindowQueryParams};
use crate::http::types::{ResponseCode, ResponseWrapper};
use crate::http::ApiContext;
use crate::http::Result;

use super::Error;

#[derive(serde::Deserialize, Default)]
#[serde(default)]
pub struct CompletionQuery {
    task: Option<String>,
    walletAddress: String,
}

pub fn router() -> Router {
    // By having each module responsible for setting up its own routing,
    // it makes the root module a lot cleaner.
    Router::new().route("/task/completion", get(handler))
}

async fn handler(
    // _: AuthSignature,
    // _: RecvWindowQueryParams,
    ctx: Extension<ApiContext>,
    query: Query<CompletionQuery>,
) -> Result<Json<ResponseWrapper<u128>>> {
    let server_time = std::time::SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .context("Error calculating time")?;

    let Some(ref task) = query.task else {
        return Err(Error::InvalidArgument(
            "Required query paramater `task` is missing.".to_string(),
        ));
    };

    let tasks: Vec<String> = serde_json::from_str(task).map_err(|_| {
        Error::InvalidArgument("Query paramater `task` must be a JSON array of string.".to_string())
    })?;

    for t in tasks {
        match t.as_str() {
            "stake" => {
                let conn = &mut ctx.db.get().map_err(|e| {
                    // TODO: log to cloud
                    log::error!("Failed to connection from pool");

                    Error::Anyhow(e.into())
                })?;

                let sql = format!(
                    r#"
					SELECT * FROM "sgd1"."participant" 
					WHERE "address" = '{}' AND "block_range" @> {}
				"#,
                    query.walletAddress.as_str(),
                    0
                );

                let participant: Option<Participant> = diesel::sql_query(sql)
                    .bind::<Text, _>(query.walletAddress.clone())
                    .bind::<Integer, _>(0)
                    .get_result(conn)
                    .optional()
                    .map_err(|e| Error::Anyhow(e.into()))?;
            }
            _ => {}
        }
    }

    let response = ResponseWrapper {
        code: ResponseCode::Success,
        message: "success".to_string(),
        data: server_time.as_millis(),
    };

    Ok(Json(response))
}
