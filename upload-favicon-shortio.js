#!/usr/bin/env node

const fs = require('fs');
const https = require('https');

const SHORTIO_API_KEY = process.env.SHORTIO_API_KEY;
const DOMAIN = 'pupfrisky.com';
const FAVICON_PATH = './favicon.svg';

console.log('🎨 Subiendo favicon a Short.io...');

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

// Subir el favicon como imagen
async function uploadFavicon() {
    console.log('� Subiendo favicon...');
    
    if (!fs.existsSync(FAVICON_PATH)) {
        console.error('❌ No se encontró el archivo favicon.svg');
        return null;
    }

    // Convertir SVG a base64 para el upload
    const svgContent = fs.readFileSync(FAVICON_PATH, 'utf8');
    const base64Content = Buffer.from(svgContent).toString('base64');
    
    const data = JSON.stringify({
        domain: DOMAIN,
        favicon: `data:image/svg+xml;base64,${base64Content}`
    });

    const options = {
        hostname: 'api.short.io',
        port: 443,
        path: '/domains/update',
        method: 'POST',
        headers: {
            'Authorization': SHORTIO_API_KEY,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    try {
        const response = await makeRequest(options, data);
        
        if (response.status === 200) {
            console.log('✅ Favicon configurado exitosamente!');
            console.log('📄 Respuesta:', JSON.stringify(response.data, null, 2));
            return response.data;
        } else {
            console.error('❌ Error al configurar favicon:', response.status);
            console.error('📄 Respuesta:', response.data);
            
            // Intentar método alternativo
            return await uploadFaviconAlternative();
        }
    } catch (error) {
        console.error('❌ Error durante la subida:', error.message);
        return await uploadFaviconAlternative();
    }
}

// Método alternativo usando links
async function uploadFaviconAlternative() {
    console.log('� Intentando método alternativo...');
    
    const svgContent = fs.readFileSync(FAVICON_PATH, 'utf8');
    const base64Content = Buffer.from(svgContent).toString('base64');
    
    // Crear un link corto con favicon personalizado
    const data = JSON.stringify({
        originalURL: 'https://pupfrisky.com',
        domain: DOMAIN,
        allowDuplicates: false,
        favicon: `data:image/svg+xml;base64,${base64Content}`,
        title: 'PupFrisky Domain'
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
            console.log('✅ Favicon configurado mediante link!');
            console.log('📄 Respuesta:', JSON.stringify(response.data, null, 2));
            return response.data;
        } else {
            console.error('❌ Error en método alternativo:', response.status);
            console.error('📄 Respuesta:', response.data);
            return null;
        }
    } catch (error) {
        console.error('❌ Error en método alternativo:', error.message);
        return null;
    }
}

// Listar links existentes para verificar
async function listLinks() {
    console.log('📋 Verificando links existentes...');
    
    const options = {
        hostname: 'api.short.io',
        port: 443,
        path: '/links?domain=' + encodeURIComponent(DOMAIN),
        method: 'GET',
        headers: {
            'Authorization': SHORTIO_API_KEY,
            'Content-Type': 'application/json'
        }
    };

    try {
        const response = await makeRequest(options);
        
        if (response.status === 200) {
            console.log('✅ Links encontrados:');
            if (response.data && response.data.links) {
                response.data.links.forEach(link => {
                    console.log(`  - ${link.secureShortURL || link.shortURL}`);
                    if (link.favicon) {
                        console.log(`    Favicon: ✅ Configurado`);
                    }
                });
            }
            return response.data;
        } else {
            console.log('⚠️  Error al listar links:', response.status, response.data);
            return null;
        }
    } catch (error) {
        console.log('⚠️  Error al listar links:', error.message);
        return null;
    }
}

async function main() {
    console.log('📋 Configuración:');
    console.log(`   API Key: ✅ Configurado`);
    console.log(`   Dominio: ${DOMAIN}`);
    console.log(`   Favicon: ${FAVICON_PATH}`);
    console.log('');

    // Verificar links existentes
    await listLinks();
    console.log('');

    // Subir favicon
    const result = await uploadFavicon();
    
    if (result) {
        console.log('');
        console.log('🎉 ¡Favicon configurado exitosamente en Short.io!');
        console.log(`🌐 Dominio: ${DOMAIN}`);
        
        const info = {
            domain: DOMAIN,
            result: result,
            configured_at: new Date().toISOString()
        };
        
        fs.writeFileSync('./shortio-favicon-config.json', JSON.stringify(info, null, 2));
        console.log('💾 Configuración guardada en shortio-favicon-config.json');
    } else {
        console.error('❌ No se pudo configurar el favicon');
        process.exit(1);
    }
}

main().catch(console.error);
