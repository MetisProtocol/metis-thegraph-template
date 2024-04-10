mod config;

pub use config::Config;

pub mod http;

#[cfg(test)]
mod test {
    use std::net::SocketAddr;
    use std::sync::Arc;
    use std::time::{Duration, SystemTime, UNIX_EPOCH};

    use crate::http::rsa::sign_request;
    use crate::http::rsa::{TEST_RSA_PRIVATE_KEY, TEST_RSA_PUBLIC_KEY};
    use crate::http::types::ResponseCode;
    use crate::http::types::ResponseWrapper;
    use crate::http::{api_router, ApiContext};

    use super::*;

    use axum::extract::connect_info::MockConnectInfo;
    use axum::{
        body::{to_bytes, Body, HttpBody},
        extract::Query,
        http::{Request, StatusCode},
    };
    use http_body_util::BodyExt;
    use tower::{Service, ServiceExt};
    use tower_http::add_extension::AddExtensionLayer;
    use tower_http::trace::TraceLayer;

    #[tokio::test]
    async fn server_time() {
        let app = http::api_router();

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/v1/time")
                    .method("GET")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(StatusCode::OK, response.status());

        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let body: serde_json::Value = serde_json::from_slice(body.to_vec().as_slice()).unwrap();

        println!("{:?}", body.to_string());
    }

    #[tokio::test]
    async fn test_invalid_signature_response() {
        let (status_code, body) =
            task_completion_request(vec!["deposit"], "0xabcabc", None, None, false).await;

        assert_eq!(body.code.code(), ResponseCode::InvalidSignature.code());
        assert_eq!(status_code, StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_valid_signature_response() {
        let (status_code, body) =
            task_completion_request(vec!["deposit"], "0xabcabc", None, None, true).await;

        assert_eq!(body.code.code(), ResponseCode::Success.code());
        assert!(status_code.is_success());
    }

    #[tokio::test]
    async fn test_invalid_recv_window() {
        let (status_code, body) =
            task_completion_request(vec!["deposit"], "0xabcabc", Some(11000), None, true).await;

        assert_eq!(body.code.code(), ResponseCode::InvalidRecvWindow.code());
        assert_eq!(status_code, StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn test_request_outside_recv_window() {
        let mut timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis();

        timestamp -= 4000;
        let (status_code, body) = task_completion_request(
            vec!["deposit"],
            "0xabcabc",
            Some(3000),
            Some(timestamp),
            true,
        )
        .await;

        assert_eq!(body.code.code(), ResponseCode::InvalidTimestamp.code());
        assert_eq!(status_code, StatusCode::BAD_REQUEST);
    }

    async fn task_completion_request(
        tasks: Vec<&str>,
        wallet_address: &str,
        recv_window: Option<u32>,
        timestamp: Option<u128>,
        sign: bool,
    ) -> (StatusCode, ResponseWrapper<serde_json::Value>) {
        let config = Config {
            rsa_public_key: TEST_RSA_PUBLIC_KEY.to_string(),
        };

        let mut app = api_router()
            .layer(MockConnectInfo(SocketAddr::from(([0, 0, 0, 0], 8080))))
            .layer(AddExtensionLayer::new(ApiContext {
                config: Arc::new(config),
            }))
            .layer(TraceLayer::new_for_http())
            .into_service();

        const BASE_URL: &'static str = "http://localhost:8080/v1/task/completion";

        let tasks = tasks
            .into_iter()
            .map(|task| format!(r#""{}""#, task))
            .collect::<Vec<String>>();
        let tasks = format!("[{}]", tasks.join(","));
        let tasks = urlencoding::encode(&tasks);
        let recv_window = recv_window.unwrap_or(3000);
        let timestamp = timestamp.unwrap_or(
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis(),
        );

        let query = format!(
            r#"walletAddress={}&task={}&recvWindow={}&timestamp={}"#,
            wallet_address, tasks, recv_window, timestamp
        );

        let uri = format!("{}?{}", BASE_URL, query);

        let mut request_builder = Request::builder().uri(uri).method("GET");
        if sign {
            let data = urlencoding::decode(&query).unwrap().to_string();
            request_builder =
                request_builder.header("signature", sign_request(TEST_RSA_PRIVATE_KEY, &data));
        }

        let response = app
            .ready()
            .await
            .unwrap()
            .call(request_builder.body(Body::empty()).unwrap())
            .await
            .unwrap();

        let status_code = response.status();
        let body = response.into_body().collect().await.unwrap().to_bytes();

        let body: ResponseWrapper<serde_json::Value> =
            serde_json::from_slice(body.to_vec().as_slice()).unwrap();

        (status_code, body)
    }
}
