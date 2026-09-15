# Tractor eFSR

The Tractor eFSR application consists of the [tractor-api](tractor-api/) backend and [tractor-web](tractor-web/) frontend.

It deploys to Cloud Run services in the shared GCP project with the Genset eFSR sibling app. Both apps use the shared MongoDB Atlas `cooper-efsr` cluster and shared GCS bucket `cooper-efsr-files`, with separate databases for Tractor and Genset data.

See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment configuration and commands.
