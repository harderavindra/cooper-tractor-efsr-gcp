# Deployment

Build and deploy `tractor-api/` and `tractor-web/` as separate Cloud Run services in the shared GCP project.

The API uses the `tractor_efsr` database on the shared MongoDB Atlas `cooper-efsr` cluster. The web service receives `VITE_API_URL` at image build time, pointing to the deployed API URL.

Set these API runtime variables in Cloud Run:

- `PORT=8080`
- `NODE_ENV=production`
- `MONGODB_URI` using the existing `tractor_db_user` credentials and the `tractor_efsr` database
- `CORS_ORIGIN` to the deployed web URL
- `GCS_BUCKET_NAME=cooper-efsr-files`
- `JWT_SECRET`, `JWT_EXPIRES_IN`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD`
- `FIREBASE_SERVICE_ACCOUNT_JSON` when push notifications are enabled

Cloud Run's service account should have access to the shared GCS bucket. The API uses Application Default Credentials in Cloud Run; local development can use `GCS_CREDENTIALS` or `GCS_KEY_FILE`.

Example image builds from the repository root:

```sh
docker build -t tractor-api ./tractor-api
docker build --build-arg VITE_API_URL=https://TRACTOR_API_URL -t tractor-web ./tractor-web
```
