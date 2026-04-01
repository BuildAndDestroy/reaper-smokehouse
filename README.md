# Reaper's Smokehouse Website

A responsive website for Reaper's Smokehouse, specializing in premium smoked brisket. Built with scalability in mind, supporting standalone server, Docker containers, and Kubernetes deployments.

## Features

- 🍖 Single-page responsive website
- 📱 Mobile-first design (works on any screen size)
- 🏠 Home page with hero section
- 📖 About section
- 🍽️ Food offers/menu section
- 📧 Contact form
- 🚀 Scalable backend architecture

## MongoDB and the public site

- **Website visitors** do not log in. The marketing pages and contact form are **public**; anyone who can reach the app URL can use them (subject to rate limiting). There is no “website password” protecting MongoDB from browsers—MongoDB is only reachable from your server process (or your cluster network), not from end users’ browsers.
- **MongoDB** uses **authentication** (SCRAM). Only clients that supply valid credentials—your Node app, or an operator using `mongosh`—can access the data. Default Docker Compose does **not** publish MongoDB on a host port, so random machines on your LAN cannot connect to the database unless you add a `ports:` mapping.

## Project Structure

```
reapers-smokehouse/
├── public/
│   └── index.html          # Main HTML file
├── css/
│   ├── main.css            # Main styles
│   └── responsive.css      # Responsive styles
├── js/
│   └── main.js             # JavaScript functionality
├── assets/
│   └── images/             # Image assets
├── models/                 # Mongoose models (contact submissions)
├── scripts/
│   └── k8s-gen-mongodb-secret.sh  # Writes gitignored k8s/mongodb-secret.yaml from env
├── k8s/                    # Kubernetes manifests
│   ├── deployment.yaml
│   ├── mongodb-secret.example.yaml  # Template only — real Secret is generated, not committed
│   ├── mongodb.yaml        # MongoDB + PVC + Service
│   ├── service.yaml
│   ├── ingress.yaml
│   └── hpa.yaml
├── .env.example            # Template for Compose MongoDB password
├── server.js               # Express server
├── Dockerfile              # Docker image definition
├── docker-compose.yml      # Docker Compose configuration
└── package.json             # Node.js dependencies
```

## Quick Start

### Standalone Server

Contact form submissions are stored in **MongoDB**. Configure either a full **`MONGODB_URI`** or **`MONGO_USERNAME`** + **`MONGO_PASSWORD`** (plus optional `MONGO_HOST`, `MONGO_PORT`, `MONGO_DATABASE`, `MONGO_AUTH_SOURCE`). The server exits if neither is set.

1. Run MongoDB locally with authentication enabled, or use a managed database. Example (one-off, **data directory empty** so root user is created):

```bash
docker run -d --name mongo -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD='choose-a-strong-password' \
  mongo:7
```

2. Install dependencies:
```bash
npm install
```

3. Point the app at the database (password URL-encoded if you use `MONGODB_URI` and it contains special characters):

```bash
export MONGO_USERNAME=admin
export MONGO_PASSWORD='choose-a-strong-password'
export MONGO_HOST=127.0.0.1
export MONGO_AUTH_SOURCE=admin
npm start
```

Or a single URI:

```bash
export MONGODB_URI='mongodb://admin:choose-a-strong-password@127.0.0.1:27017/reapers_smokehouse?authSource=admin'
npm start
```

4. Open your browser to `http://localhost:3000`

**Note:** If MongoDB was first created **without** auth on an existing data volume, flipping on `MONGO_INITDB_*` alone will not add users. Create users manually or start from an empty volume; see [MongoDB authentication](https://www.mongodb.com/docs/manual/tutorial/enable-authentication/).

### Development Mode

For development with auto-reload, set the same MongoDB variables as in standalone mode (`MONGO_USERNAME` / `MONGO_PASSWORD` or `MONGODB_URI`), then:

```bash
npm run dev
```

## Docker Deployment

### Build the Docker image:
```bash
docker build -t reapers-smokehouse:latest .
```

### Run with Docker:
The image expects MongoDB credentials. Pass a full URI or split variables (same as standalone):

```bash
docker run -p 3000:3000 \
  -e MONGO_USERNAME=admin \
  -e MONGO_PASSWORD='your-password' \
  -e MONGO_HOST=host.docker.internal \
  -e MONGO_AUTH_SOURCE=admin \
  reapers-smokehouse:latest
```

### Run with Docker Compose:
Copy `.env.example` to `.env`, set **`MONGO_ROOT_PASSWORD`** to a long random value, then:

```bash
docker compose up -d
```

Compose enables MongoDB **`MONGO_INITDB_ROOT_*`** on first start (empty volume only), uses **SCRAM** auth, and connects the app with `MONGO_USERNAME` / `MONGO_PASSWORD` over the internal network. **MongoDB is not bound to a host port** in the default file, so only containers on the Compose network can reach it.

To inspect data, open a shell as the database admin (password is the value of `MONGO_ROOT_PASSWORD` in `.env`):

```bash
docker compose exec -it mongo mongosh -u "${MONGO_ROOT_USER:-admin}" --authenticationDatabase admin
```

Then in `mongosh`: `use reapers_smokehouse` and `db.contactsubmissions.find().limit(3)`.

## Kubernetes Deployment

### Prerequisites
- Kubernetes cluster
- kubectl configured
- Docker image pushed to a registry (or use local image with Minikube below)

### Secrets and config (avoid committing real values)

**MongoDB credentials** are not kept in Git. The repo has **`k8s/mongodb-secret.example.yaml`** only. Locally or in CI/CD you generate the Secret from environment variables:

```bash
export MONGO_ROOT_PASSWORD='your-long-random-secret'   # required
# optional: export MONGO_ROOT_USER=admin
./scripts/k8s-gen-mongodb-secret.sh     # writes k8s/mongodb-secret.yaml (gitignored)
kubectl apply -f k8s/mongodb-secret.yaml
```

Or pipe straight to the cluster (no file on disk):

```bash
export MONGO_ROOT_PASSWORD='...'
./scripts/k8s-gen-mongodb-secret.sh - | kubectl apply -f -
```

**GitHub Actions / AWS:** do not store passwords in YAML. Use [encrypted secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions) and run the same `kubectl create secret ... --dry-run=client` step in the deploy workflow, or use **AWS Secrets Manager + External Secrets**, **Sealed Secrets**, or **SOPS** for GitOps.

**Ingress hostname** is hardcoded in `k8s/ingress.yaml` for the sample domain. For multiple environments, use **Kustomize overlays**, **Helm values**, or render with `envsubst` from a private env file without committing it.

### Local testing with Minikube

Yes — **Minikube** is a good fit: it gives you a default **StorageClass** for the MongoDB PVC, **ClusterIP** networking that matches production, and you can build the app image **into Minikube’s Docker daemon** so `image: reapers-smokehouse:latest` with `imagePullPolicy: IfNotPresent` works without a registry.

From the repository root:

```bash
# 1. Start the cluster (adjust driver if needed, e.g. --driver=docker)
minikube start

# 2. Point your shell at Minikube’s Docker and build the image there
eval "$(minikube docker-env)"
docker build -t reapers-smokehouse:latest .

# 3. MongoDB Secret (not in Git — generate from env)
export MONGO_ROOT_PASSWORD='your-local-dev-password'
./scripts/k8s-gen-mongodb-secret.sh
kubectl apply -f k8s/mongodb-secret.yaml

# 4. MongoDB, then app + Service (skip Ingress/HPA until you need them)
kubectl apply -f k8s/mongodb.yaml
kubectl wait --for=condition=ready pod -l app=mongodb --timeout=180s

kubectl apply -f k8s/deployment.yaml -f k8s/service.yaml

kubectl get pods -w
# When reapers-smokehouse pods are Ready:
kubectl port-forward service/reapers-smokehouse-service 8080:80
```

Open **http://localhost:8080**. Tear down when done: `minikube delete` (or `kubectl delete -f k8s/...` in reverse order).

**Optional**

- **HPA:** `minikube addons enable metrics-server`, wait a minute, then `kubectl apply -f k8s/hpa.yaml`. The HPA’s minimum replica count (2) may scale the Deployment up from the 3 replicas in `deployment.yaml` after metrics appear; that is normal.
- **Ingress:** `minikube addons enable ingress`, apply `k8s/ingress.yaml`, add a hosts entry for `reaperssmokehouse.com` to `minikube ip`, or use `minikube tunnel` and read the [Minikube ingress docs](https://minikube.sigs.k8s.io/docs/handbook/addons/ingress/).

**Note:** Changing the Secret password after MongoDB’s PVC is already initialized does not rotate the DB user automatically — recreate the MongoDB PVC or manage users in the shell if you change credentials.

### Deploy to Kubernetes:

1. **Update the image in deployment.yaml** if using a remote registry:
```yaml
image: your-registry/reapers-smokehouse:latest
```

2. **Create credentials and deploy MongoDB** (PVC needs a default `StorageClass`, or edit `mongodb.yaml`):

```bash
export MONGO_ROOT_PASSWORD='strong-secret-from-password-manager'
./scripts/k8s-gen-mongodb-secret.sh
kubectl apply -f k8s/mongodb-secret.yaml
kubectl apply -f k8s/mongodb.yaml
```

Wait until the MongoDB pod is ready. The database listens only on **ClusterIP** service `mongodb` (not on the public internet). Then deploy the app and the rest:

```bash
kubectl apply -f k8s/deployment.yaml -f k8s/service.yaml -f k8s/ingress.yaml -f k8s/hpa.yaml
```

The app reads **`MONGO_USERNAME`**, **`MONGO_PASSWORD`**, and related env vars from the same Secret (see `k8s/deployment.yaml`). **Readiness** uses `GET /ready` (MongoDB connected); liveness uses `GET /health`.

**First-time init:** `MONGO_INITDB_*` is applied only when the MongoDB data directory is **empty**. Enabling auth on an existing unsecured volume requires a [manual user-creation procedure](https://www.mongodb.com/docs/manual/tutorial/enable-authentication/), not just changing the Deployment.

3. **Check deployment status:**
```bash
kubectl get deployments
kubectl get pods
kubectl get services
```

4. **Access the service:**
```bash
# Port forward to access locally
kubectl port-forward service/reapers-smokehouse-service 3000:80

# Or access via ingress (if configured)
```

### Scaling

The deployment includes a HorizontalPodAutoscaler (HPA) that automatically scales based on CPU and memory usage:
- Minimum replicas: 2
- Maximum replicas: 10
- Scales based on CPU (70% threshold) and memory (80% threshold)

### Update Deployment

After making changes, rebuild and push the image, then:
```bash
kubectl rollout restart deployment/reapers-smokehouse
```

## Configuration

### Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)

### Health Check

The server includes a health check endpoint at `/health` for monitoring and load balancer health checks.

## Customization

### Update Content

- Edit `public/index.html` for page content
- Modify `css/main.css` and `css/responsive.css` for styling
- Update `js/main.js` for interactive features

### Add Images

Place images in `assets/images/` and reference them in your HTML.

## CI/CD

### GitHub Actions

This repository includes GitHub Actions workflows for automated testing and validation on pull requests.

**Workflow**: `.github/workflows/pr-build.yml`

The workflow runs automatically on all pull requests to the `main` branch and includes:

- ✅ Security audit (`npm audit`)
- ✅ Dependency checks
- ✅ Build validation
- ✅ Docker image build and test
- ✅ Kubernetes manifest validation
- ✅ File structure verification

**Status Badge**: Add this to your README to show build status:
![PR Build](https://github.com/BuildAndDestroy/reapers-smokehouse/workflows/PR%20Build%20and%20Test/badge.svg)


See `.github/workflows/README.md` for more details.

## Production Considerations

1. **SSL/TLS**: Configure SSL certificates in the Ingress manifest
2. **Environment Variables**: Use Kubernetes Secrets or ConfigMaps for sensitive data
3. **Monitoring**: Add monitoring tools (Prometheus, Grafana)
4. **Logging**: Configure centralized logging
5. **CDN**: Consider using a CDN for static assets
6. **Database**: Add database integration if needed for contact form submissions
7. **CI/CD**: GitHub Actions workflows are configured for automated testing

## License

ISC

## Support

For issues or questions, please contact the development team.

