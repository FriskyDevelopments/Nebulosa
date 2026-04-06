#!/usr/bin/env node

/**
 * Script para crear enlaces OAuth con paths únicos
 * Para evitar conflictos con configuración de dominio
 */

const fs = require('fs');
const https = require('https');

const SHORTIO_API_KEY = process.env.SHORTIO_API_KEY;
const DOMAIN = 'pupfrisky.com';

console.log('🔧 Creando enlaces OAuth únicos...');

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

// Crear enlaces con paths muy específicos
const OAUTH_LINKS = [
    {
        slug: 'zoom-oauth-callback',
        title: '🔑 Zoom OAuth Callback - LA NUBE BOT'
    },
    {
        slug: 'bot-oauth-redirect',
        title: '🔑 Bot OAuth Redirect - LA NUBE BOT'
    },
    {
        slug: 'lanube-oauth',
        title: '🔑 LA NUBE OAuth - LA NUBE BOT'
    },
    {
        slug: 'oauth2024',
        title: '🔑 OAuth 2024 - LA NUBE BOT'
    }
];

async function createOAuthLink(linkConfig) {
    console.log(`🔗 Creando: ${linkConfig.slug}`);
    
    const svgContent = fs.readFileSync('./favicon.svg', 'utf8');
    const base64Content = Buffer.from(svgContent).toString('base64');
    
    const data = JSON.stringify({
        originalURL: 'https://pupfrisky.com/zoom-callback.php',
        domain: DOMAIN,
        path: linkConfig.slug,
        allowDuplicates: false,
        favicon: `data:image/svg+xml;base64,${base64Content}`,
        title: linkConfig.title,
        tags: ['oauth', 'zoom', 'callback', 'redirect', 'auth']
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
            const shortUrl = response.data.secureShortURL || response.data.shortURL;
            console.log(`   ✅ Creado: ${shortUrl}`);
            console.log(`   📍 Destino: ${response.data.originalURL}`);
            console.log(`   🆔 ID: ${response.data.id}`);
            return {
                success: true,
                slug: linkConfig.slug,
                shortUrl: shortUrl,
                linkId: response.data.id,
                originalUrl: response.data.originalURL
            };
        } else if (response.status === 409) {
            console.log(`   ⚠️  Ya existe: ${linkConfig.slug}`);
            return { success: false, reason: 'duplicate', slug: linkConfig.slug };
        } else {
            console.log(`   ❌ Error: ${response.status}`);
            console.log(`   📄 Respuesta:`, response.data);
            return { success: false, reason: 'error', slug: linkConfig.slug };
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return { success: false, reason: 'connection', slug: linkConfig.slug };
    }
}

async function testLink(url) {
    console.log(`🧪 Probando: ${url}`);
    
    return new Promise((resolve) => {
        const urlParts = new URL(url);
        
        const options = {
            hostname: urlParts.hostname,
            port: urlParts.port || 443,
            path: urlParts.pathname,
            method: 'HEAD',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        };

        const req = https.request(options, (res) => {
            console.log(`   📊 Status: ${res.statusCode}`);
            console.log(`   📍 Location: ${res.headers.location || 'No redirect'}`);
            
            if (res.headers.location) {
                if (res.headers.location.includes('zoom-callback.php')) {
                    console.log(`   ✅ Redirige correctamente a zoom-callback.php`);
                    resolve(true);
                } else if (res.headers.location.includes('linktr.ee')) {
                    console.log(`   ❌ Redirige a Linktr.ee`);
                    resolve(false);
                } else {
                    console.log(`   ⚠️  Redirige a: ${res.headers.location}`);
                    resolve(false);
                }
            } else {
                console.log(`   ⚠️  Sin redirección`);
                resolve(false);
            }
        });

        req.on('error', (error) => {
            console.log(`   ❌ Error: ${error.message}`);
            resolve(false);
        });

        req.setTimeout(5000, () => {
            console.log(`   ⏰ Timeout`);
            req.destroy();
            resolve(false);
        });

        req.end();
    });
}

async function main() {
    console.log('📋 Configuración:');
    console.log(`   API Key: ✅ Configurado`);
    console.log(`   Dominio: ${DOMAIN}`);
    console.log(`   Destino: https://pupfrisky.com/zoom-callback.php`);
    console.log(`   Enlaces a crear: ${OAUTH_LINKS.length}`);
    console.log('');

    const results = [];
    
    for (const linkConfig of OAUTH_LINKS) {
        const result = await createOAuthLink(linkConfig);
        results.push(result);
        console.log('');
        
        // Pequeña pausa
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Probar los enlaces creados exitosamente
    console.log('🧪 Probando enlaces creados...');
    console.log('');
    
    const successfulLinks = results.filter(r => r.success);
    const workingLinks = [];
    
    for (const link of successfulLinks) {
        const works = await testLink(link.shortUrl);
        if (works) {
            workingLinks.push(link);
        }
        console.log('');
    }

    // Resumen final
    console.log('📊 RESUMEN FINAL:');
    console.log('==================');
    console.log(`✅ Enlaces creados: ${successfulLinks.length}`);
    console.log(`🎯 Enlaces funcionando: ${workingLinks.length}`);
    console.log('');

    if (workingLinks.length > 0) {
        console.log('🎉 ¡Enlaces OAuth funcionando!');
        console.log('');
        console.log('🔗 URLs para usar en Zoom OAuth:');
        workingLinks.forEach((link, index) => {
            console.log(`   ${index + 1}. ${link.shortUrl}`);
        });
        
        console.log('');
        console.log('✅ Usa cualquiera de estos como Redirect URI en Zoom!');
        
        // Guardar enlaces funcionales
        const workingLinksInfo = {
            created_at: new Date().toISOString(),
            working_links: workingLinks,
            total_created: successfulLinks.length,
            total_working: workingLinks.length
        };
        
        fs.writeFileSync('./working-oauth-links.json', JSON.stringify(workingLinksInfo, null, 2));
        console.log('💾 Enlaces funcionales guardados en working-oauth-links.json');
    } else {
        console.log('❌ Ningún enlace funciona correctamente');
        console.log('');
        console.log('💡 Alternativas:');
        console.log('   1. Usar URL directa: https://pupfrisky.com/zoom-callback.php');
        console.log('   2. Verificar configuración de dominio en Short.io');
        console.log('   3. Usar un dominio diferente para Short.io');
    }
}

main().catch(console.error);
