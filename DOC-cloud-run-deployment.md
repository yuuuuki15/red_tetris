# Cloud Run デプロイメントガイド

このドキュメントは、Red Tetris アプリケーションを Google Cloud Run にデプロイする方法を説明します。

## 前提条件

- Google Cloud Platform アカウントとプロジェクト
- `gcloud` CLI がインストール・設定済み
- Docker がインストール済み（ローカルビルドの場合）

## 主な変更点

Cloud Run デプロイのために以下の変更を行いました：

1. **PORT環境変数の対応**: `params.js` で `process.env.PORT` をサポート
2. **CORS設定の改善**: 環境変数 `CORS_ORIGIN` で許可オリジンを指定可能
3. **データベース設定**: 環境変数 `DB_TYPE=memory` でメモリ内DBを使用可能（Cloud Runのステートレス環境に対応）

## デプロイ手順

### 1. プロジェクトの設定

```bash
# プロジェクトIDを設定
export PROJECT_ID=your-project-id
gcloud config set project $PROJECT_ID

# Cloud Run API を有効化
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### 2. イメージのビルドとプッシュ

```bash
# Container Registry にビルドしてプッシュ
gcloud builds submit --tag gcr.io/$PROJECT_ID/red-tetris

# または Artifact Registry を使用する場合
# gcloud artifacts repositories create red-tetris-repo \
#   --repository-format=docker --location=asia-northeast1
# gcloud builds submit --tag asia-northeast1-docker.pkg.dev/$PROJECT_ID/red-tetris-repo/red-tetris:latest
```

### 3. Cloud Run サービスのデプロイ

```bash
gcloud run deploy red-tetris \
  --image gcr.io/$PROJECT_ID/red-tetris:latest \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars NODE_ENV=production,DB_TYPE=memory \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --min-instances 0 \
  --timeout 300
```

### 4. カスタムドメインの設定（オプション）

カスタムドメインを使用する場合は、CORS設定を更新：

```bash
gcloud run services update red-tetris \
  --region asia-northeast1 \
  --update-env-vars CORS_ORIGIN=https://your-domain.com
```

## 環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| `PORT` | サーバーがリッスンするポート（Cloud Runが自動設定） | `3004` |
| `NODE_ENV` | 実行環境 | - |
| `DB_TYPE` | データベースタイプ (`file` または `memory`) | `file` |
| `CORS_ORIGIN` | 許可するCORSオリジン | `*` |

## データベースの永続化について

現在の設定では、`DB_TYPE=memory` を使用しているため、リーダーボードのデータは永続化されません。
コンテナが再起動するとデータが失われます。

### 永続化が必要な場合の選択肢

1. **Cloud SQL (PostgreSQL/MySQL)**: 推奨
   - 完全な永続化とスケーラビリティ
   - `databaseService.js` の修正が必要

2. **Firestore**:
   - NoSQLデータベース
   - サーバーレス環境に最適

3. **Cloud Storage と SQLite**:
   - SQLiteファイルをCloud Storageに保存（非推奨）

## トラブルシューティング

### WebSocket接続の問題

Cloud Run は WebSocket をサポートしていますが、長時間接続が必要な場合は以下の設定を確認：

- `--timeout` を適切に設定（デフォルト300秒）
- Socket.IO の設定が正しいか確認

### メモリ不足エラー

```bash
# メモリを増やす
gcloud run services update red-tetris \
  --region asia-northeast1 \
  --memory 1Gi
```

### ログの確認

```bash
# リアルタイムログ
gcloud run services logs read red-tetris --region asia-northeast1 --follow

# 最近のログ
gcloud run services logs read red-tetris --region asia-northeast1 --limit 50
```

## コスト最適化

- `--min-instances 0`: リクエストがないときはインスタンスを停止
- `--cpu-throttling`: リクエスト中のみCPUを使用
- `--memory`: 必要最小限のメモリを設定

## 次のステップ

- CI/CDパイプラインの設定（Cloud Build）
- カスタムドメインの設定
- モニタリングとアラートの設定
- データベースの永続化（Cloud SQL/Firestore）

