const express = require('express');
const cors = require('cors');
const YAML = require('yamljs');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const client = require('prom-client');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const clientRoutes = require('./routes/clients');
const invoiceRoutes = require('./routes/invoices');
const paymentRoutes = require('./routes/payments');
const recoveryRoutes = require('./routes/recoveryActions');
const statsRoutes = require('./routes/stats');
const errorHandler = require('./middleware/errorHandler');

const swaggerDoc = YAML.load(path.join(__dirname, 'swagger', 'swagger.yaml'));

const app = express();
app.use(cors());
app.use(express.json());

client.collectDefaultMetrics();

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Nombre total de requêtes HTTP',
  labelNames: ['method', 'route', 'status'],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Durée des requêtes HTTP en secondes',
  labelNames: ['method', 'route', 'status'],
});

app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    // Chemin du routeur (ex: /:id) pour limiter la cardinalité ; jamais l'URL brute
    const route = req.route
      ? `${req.baseUrl || ''}${req.route.path}`
      : 'unmatched';
    const labels = { method: req.method, route, status: res.statusCode };
    httpRequestsTotal.inc(labels);
    end(labels);
  });
  next();
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/recovery-actions', recoveryRoutes);
app.use('/api/stats', statsRoutes);

app.get('/', (req, res) => res.json({ ok: true, name: 'Recouvra+' }));


app.use(errorHandler);

module.exports = app;
