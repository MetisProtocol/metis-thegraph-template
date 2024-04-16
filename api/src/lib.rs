mod config;

pub use config::Config;

pub mod http;

mod db;

#[cfg(test)]
mod test {
    pub const TEST_RSA_PUBLIC_KEY: &'static str = "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCbWoXkbbwfcZnLW43Vsh1YMu1W5a4reIHvcMYqFjWJl4huA7JKZdC/O3pmEqxdSGZPkerDoN70yfFUPJwKHF+Zc30CWSHTgN+ivR1W4EwyQd48b7WfdU6NVNu2p0p9B2dvcytsdIZ+FKjDwjXplw21//9zX7xLr2rF+YeP1mp20QIDAQAB";
    pub const TEST_RSA_PRIVATE_KEY : &'static str= "MIICdgIBADANBgkqhkiG9w0BAQEFAASCAmAwggJcAgEAAoGBAJtaheRtvB9xmctbjdWyHVgy7Vblrit4ge9wxioWNYmXiG4Dskpl0L87emYSrF1IZk+R6sOg3vTJ8VQ8nAocX5lzfQJZIdOA36K9HVbgTDJB3jxvtZ91To1U27anSn0HZ29zK2x0hn4UqMPCNemXDbX//3NfvEuvasX5h4/WanbRAgMBAAECgYBhrrGxyC4Zt1x0ucSdMbmx05PYp+K0ArnwzIBNxlkzgsyOIFTi4tI27DcyJ1up6/Qo5B8xkt2eHbxYsyOKV/zjjNo7afmQ/woBPgCxuErNJsdo2g0nH0k8A4Pw0FcLQL4sQocyfYsFMNhP56SY5fkgRAdAYPJ5v5RG47dLVoMGYQJBANF69BOAa/V+wubh5d5+l04zDkt/xMq7AoeHbeABpEOAEVwEfYqrH2H/BreUod8LixC6CR1KZZ9s+nnSGd9kz+sCQQC92nGk32kU09OcXtQzRn1Fi2AHvsSShQ8rwf40Buxl0IZK6sQkkSb2Eg1bA+E5KfAbzfX2YziAH/KcsdaxZ2EzAkEAwlK3tpuMCplDviBSOBrgyzcLjLgC2zmt+AGGyKVdNwzHjb/QoeFqZGLKXWRw4NL5d1PMfrJ0IPdcR8PCInyHbwJAT2CqzT1fiQa73hBD9qBNNit83iAjvgMGAcydRRFz+2nBDEe19Hf/6zhG/zvTCfx/2JA3e2mmsOMqo9szIX9QwwJAVfTewPB76mTwrTDbvBXAAXRU1WKpmrDiKHCViRO8Z6iP/KwwQxqpGiZTXr6zN8onidVjRzWJHGcWq3cCGO0v9w==";

    use std::net::SocketAddr;
    use std::sync::Arc;
    use std::time::{Duration, SystemTime, UNIX_EPOCH};

    use crate::http::rsa::test_util::sign_request;
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
            database_url: "postgres://graph-node:let-me-in@localhost:5432/graph-node".to_string(),
        };

        // FIXME: this should be a mock database instead of a real one
        let db = Pool::builder()
            .max_size(50)
            .build(ConnectionManager::<PgConnection>::new(config.database_url))
            .context("Could not connect to database_url")?;

        let mut app = api_router()
            .layer(MockConnectInfo(SocketAddr::from(([0, 0, 0, 0], 8080))))
            .layer(AddExtensionLayer::new(ApiContext {
                config: Arc::new(config),
                db,
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
