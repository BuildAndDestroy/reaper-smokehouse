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
├── k8s/                    # Kubernetes manifests
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   └── hpa.yaml
├── server.js               # Express server
├── Dockerfile              # Docker image definition
├── docker-compose.yml      # Docker Compose configuration
└── package.json             # Node.js dependencies
```

## Quick Start

### Standalone Server

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser to `http://localhost:3000`

### Development Mode

For development with auto-reload:
```bash
npm run dev
```

## Docker Deployment

### Build the Docker image:
```bash
docker build -t reapers-smokehouse:latest .
```

### Run with Docker:
```bash
docker run -p 3000:3000 reapers-smokehouse:latest
```

### Run with Docker Compose:
```bash
docker-compose up -d
```

## Kubernetes Deployment

### Prerequisites
- Kubernetes cluster
- kubectl configured
- Docker image pushed to a registry (or use local image)

### Deploy to Kubernetes:

1. **Update the image in deployment.yaml** if using a remote registry:
```yaml
image: your-registry/reapers-smokehouse:latest
```

2. **Deploy all resources:**
```bash
kubectl apply -f k8s/
```

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

