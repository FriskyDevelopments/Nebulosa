// Vercel Serverless Function for Health Check & Metrics
const axios = require('axios');

const RAILWAY_BACKEND = process.env.RAILWAY_BACKEND || 'https://nebulosa.friskydev.com';

/**
 * HTTP handler that responds to health-check requests with combined Vercel and Railway status.
 *
 * Performs CORS handling, accepts `OPTIONS` (200) and `GET` requests, probes the configured Railway backend's /health endpoint, and returns a consolidated health object whose overall status determines the HTTP response (200 when healthy, 503 when degraded). On unexpected errors returns a 500 JSON error payload; non-GET methods receive 405.
 *
 * @param {import('http').IncomingMessage & { method?: string }} req - Incoming HTTP request; only `method` is inspected (`OPTIONS`/`GET`).
 * @param {import('http').ServerResponse & { status(code:number): any, json(body:any): any, setHeader(name:string, value:string): void, end(): void }} res - HTTP response used to set headers and send status/json responses.
 */
export default async function handler(req, res) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const startTime = Date.now();
    
    try {
        // Check Railway backend health
        let railwayStatus = null;
        let railwayLatency = 0;
        
        try {
            const railwayStart = Date.now();
            const railwayResponse = await axios.get(`${RAILWAY_BACKEND}/health`, {
                timeout: 5000
            });
            railwayLatency = Date.now() - railwayStart;
            railwayStatus = railwayResponse.data;
        } catch (railwayError) {
            console.error('Railway health check failed:', railwayError.message);
            railwayStatus = { status: 'unhealthy', error: railwayError.message };
        }
        
        // Vercel function metrics
        const vercelStatus = {
            status: 'healthy',
            platform: 'vercel',
            region: process.env.VERCEL_REGION || 'unknown',
            timestamp: new Date().toISOString(),
            responseTime: Date.now() - startTime,
            environment: {
                nodeVersion: process.version,
                runtime: 'vercel-serverless',
                deployment: process.env.VERCEL_URL || 'local'
            }
        };
        
        // Combined health status
        const healthStatus = {
            overall: railwayStatus?.status === 'healthy' ? 'healthy' : 'degraded',
            vercel: vercelStatus,
            railway: {
                status: railwayStatus?.status || 'unknown',
                url: RAILWAY_BACKEND,
                latency: `${railwayLatency}ms`,
                lastCheck: new Date().toISOString()
            },
            deployment: {
                strategy: 'hybrid',
                production: 'railway',
                preview: 'vercel',
                oauth: 'vercel->railway'
            }
        };
        
        // Return appropriate status code
        const statusCode = healthStatus.overall === 'healthy' ? 200 : 503;
        
        return res.status(statusCode).json(healthStatus);
        
    } catch (error) {
        console.error('Health check error:', error);
        
        return res.status(500).json({
            status: 'error',
            platform: 'vercel',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}
