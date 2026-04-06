#!/usr/bin/env node

const fs = require('fs');
const https = require('https');

const SHORTIO_API_KEY = process.env.SHORTIO_API_KEY;
const DOMAIN = 'pupfrisky.com';

console.log('🧪 Creando link de prueba con favicon...');

function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    resolve({ status: res.statusCode, data: response });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        
        if (data) {
            req.write(data);
        }
        
        req.end();
    });
}

async function createTestLink() {
    const svgContent = fs.readFileSync('./favicon.svg', 'utf8');
    const base64Content = Buffer.from(svgContent).toString('base64');
    
    const data = JSON.stringify({
        originalURL: 'https://pupfrisky.com/docs.html',
        domain: DOMAIN,
        allowDuplicates: false,
        favicon: `data:image/svg+xml;base64,${base64Content}`,
        title: '📚 LA NUBE BOT - Documentación',
        path: 'docs'
    });

    const options = {
        hostname: 'api.short.io',
        port: 443,
        path: '/links',
        method: 'POST',
        headers: {
            'Authorization': SHORTIO_API_KEY,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    try {
        const response = await makeRequest(options, data);
        
        if (response.status === 200 || response.status === 201) {
            console.log('✅ Link de documentación creado!');
            console.log(`🔗 URL corta: ${response.data.secureShortURL || response.data.shortURL}`);
            console.log(`📄 Título: ${response.data.title}`);
            console.log(`🎨 Favicon: ✅ Configurado`);
            return response.data;
        } else {
            console.error('❌ Error al crear link:', response.status);
            console.error('📄 Respuesta:', response.data);
            return null;
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        return null;
    }
}

async function main() {
    const testLink = await createTestLink();
    
    if (testLink) {
        console.log('');
        console.log('🎉 ¡Link de prueba creado exitosamente!');
        console.log('');
        console.log('📋 Resumen:');
        console.log(`   🔗 URL: ${testLink.secureShortURL || testLink.shortURL}`);
        console.log(`   📄 Destino: ${testLink.originalURL}`);
        console.log(`   🎨 Favicon: SVG personalizado con robot/nube`);
        console.log(`   📚 Título: ${testLink.title}`);
        console.log('');
        console.log('✨ Ahora todos los links creados con pupfrisky.com');
        console.log('   mostrarán tu favicon personalizado!');
    }
}

main().catch(console.error);
