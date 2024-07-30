// @generated automatically by Diesel CLI.

pub mod sgd1 {
    use diesel::{deserialize::QueryableByName, Queryable};
    use std::ops::Bound;

    use bigdecimal::BigDecimal;
    use diesel::data_types::PgInterval;
    use serde::{Deserialize, Serialize};

    diesel::table! {
        #[sql_name = "sgd1.data_sources$"]
        sgd1.data_sources_ (vid) {
            vid -> Int4,
            block_range -> Int4range,
            causality_region -> Int4,
            manifest_idx -> Int4,
            parent -> Nullable<Int4>,
            id -> Nullable<Bytea>,
            param -> Nullable<Bytea>,
            context -> Nullable<Jsonb>,
            done_at -> Nullable<Int4>,
        }
    }

    #[derive(Queryable, QueryableByName, Serialize, Deserialize, Debug)]
    #[table_name = "participant"]
    pub struct Participant {
        pub vid: i64,                              // Maps to Int8 in Diesel (bigint in SQL)
        pub block_range: (Bound<i32>, Bound<i32>), // Postgres specific type for ranges
        pub id: Vec<u8>,                           // Maps to Bytea in Diesel (bytea in SQL)
        pub address: String,                       // Maps to Text in Diesel (text in SQL)
        pub total_metis_used: BigDecimal,          // Maps to Numeric in Diesel
        pub total_art_metis: BigDecimal,           // Maps to Numeric in Diesel
        pub total_metis_amount: BigDecimal,        // Maps to Numeric in Diesel
        pub total_lp_token_amount: BigDecimal,     // Maps to Numeric in Diesel
        pub total_transactions: BigDecimal,        // Maps to Numeric in Diesel
        pub first_block_number: BigDecimal,        // Maps to Numeric in Diesel
        pub last_block_number: BigDecimal,         // Maps to Numeric in Diesel
    }

    diesel::table! {
        sgd1.participant (vid) {
            vid -> Int8,
               block_range -> Int4range,
             id -> Bytea,
            address -> Text,
             total_metis_used -> Numeric,
             total_art_metis -> Numeric,
             total_metis_amount -> Numeric,
             total_lp_token_amount -> Numeric,
             total_transactions -> Numeric,
             first_block_number -> Numeric,
             last_block_number -> Numeric,
        }
    }

    diesel::table! {
        #[sql_name = "sgd1.poi2$"]
        sgd1.poi2_ (vid) {
            vid -> Int8,
            block_range -> Int4range,
            digest -> Bytea,
            id -> Text,
        }
    }

    diesel::table! {
        sgd1.stake_lp (vid) {
            vid -> Int8,
            #[sql_name = "block$"]
            block_ -> Int4,
            id -> Bytea,
            wallet -> Text,
            starting_amount -> Numeric,
            art_metis_amount -> Numeric,
            metis_amount -> Numeric,
            lp_token_amount -> Numeric,
            block_number -> Numeric,
            block_timestamp -> Numeric,
            transaction_hash -> Bytea,
        }
    }

    diesel::allow_tables_to_appear_in_same_query!(data_sources_, participant, poi2_, stake_lp,);
}
