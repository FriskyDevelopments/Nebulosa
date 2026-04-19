#!/usr/bin/env node

/**
 * 🔍 Diagnóstico completo del problema de redirects
 * Analiza la configuración actual y proporciona soluciones
 */

const https = require('https');

// Configuración de Short.io API
const SHORTIO_API_KEY = process.env.SHORTIO_API_KEY;
const DOMAIN_ID = '1412901';

console.log('🔍 DIAGNÓSTICO DE REDIRECTS - LA NUBE BOT');
console.log('='.repeat(60));

async function checkShortioSettings() {
    return new Promise((resolve) => {
        const options = {
            hostname: 'api.short.io',
            path: `/domains/${DOMAIN_ID}`,
            method: 'GET',
            headers: {
                'Authorization': SHORTIO_API_KEY,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve(result);
                } catch (e) {
                    resolve({ error: 'Invalid JSON response' });
                }
            });
        });

        req.on('error', (err) => {
            resolve({ error: err.message });
        });

        req.end();
    });
}

async function testUrls() {
    const urls = [
        'https://pupfrisky.com/zoom-callback.php',
        'https://www.pupfrisky.com/zoom-callback.php',
        'https://pupfrisky.com/docs.html',
        'https://pupfrisky.com/404.html',
        'https://pupfrisky.com/nonexistent-page'
    ];

    console.log('\n🧪 TESTING URLs:');
    console.log('-'.repeat(40));

    for (const url of urls) {
        await testSingleUrl(url);
    }
}

async function testSingleUrl(url) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const isShortioPage = data.includes('Link does not exist') || data.includes('short.io');
                const isOurPage = data.includes('LA NUBE BOT') || data.includes('404 - Enlace No Encontrado');
                const isRedirect = res.statusCode >= 300 && res.statusCode < 400;

                let emoji = '❓';
                let status = '';

                if (isShortioPage) {
                    emoji = '❌';
                    status = 'Short.io intercepted';
                } else if (isOurPage) {
                    emoji = '✅';
                    status = 'Our page loaded';
                } else if (isRedirect) {
                    emoji = '↗️';
                    status = `Redirect to: ${res.headers.location}`;
                } else {
                    emoji = '⚠️';
                    status = `Status: ${res.statusCode}`;
                }

                console.log(`${emoji} ${url}`);
                console.log(`   Status: ${res.statusCode} - ${status}`);
                resolve();
            });
        }).on('error', (err) => {
            console.log(`❌ ${url}`);
            console.log(`   Error: ${err.message}`);
            resolve();
        });
    });
}

async function generateSolutions() {
    console.log('\n💡 SOLUCIONES DISPONIBLES:');
    console.log('='.repeat(60));

    console.log('\n🎯 OPCIÓN 1: URL Directa (RECOMENDADO)');
    console.log('   Cambiar en Zoom OAuth settings:');
    console.log('   ❌ https://pupfrisky.com/zoom-callback.php');
    console.log('   ✅ https://www.pupfrisky.com/zoom-callback.php');
    console.log('   O usar IP directa del servidor');

    console.log('\n🌐 OPCIÓN 2: Subdomain OAuth');
    console.log('   Crear: auth.pupfrisky.com');
    console.log('   URL: https://auth.pupfrisky.com/zoom-callback.php');

    console.log('\n⚙️ OPCIÓN 3: Configurar Short.io');
    console.log('   1. Ir a https://app.short.io/domains');
    console.log('   2. Seleccionar pupfrisky.com');
    console.log('   3. Buscar "Catch-all redirect"');
    console.log('   4. Desactivar redirección a Linktr.ee');

    console.log('\n🔧 OPCIÓN 4: Usar otro dominio');
    console.log('   Ejemplos:');
    console.log('   - lanube-bot.com');
    console.log('   - pupfrisky-oauth.com');
    console.log('   - auth-lanube.com');

    console.log('\n🚀 PRÓXIMOS PASOS:');
    console.log('1. Elegir una opción arriba');
    console.log('2. Configurar Zoom OAuth con nueva URL');
    console.log('3. Probar OAuth flow completo');
    console.log('4. Subir archivos con ./upload-rsync.sh');
}

async function main() {
    console.log('📊 Checking Short.io domain settings...');
    
    const domainInfo = await checkShortioSettings();
    
    if (domainInfo.error) {
        console.log(`❌ Error checking domain: ${domainInfo.error}`);
    } else {
        console.log('✅ Domain info retrieved');
        console.log(`📋 Domain: ${domainInfo.hostname || 'N/A'}`);
        console.log(`🔗 Integration: ${domainInfo.integration || 'N/A'}`);
        
        if (domainInfo.redirectUrl) {
            console.log(`⚠️ CATCH-ALL REDIRECT DETECTED: ${domainInfo.redirectUrl}`);
            console.log('   This is why all URLs redirect to Linktr.ee');
        }
    }

    await testUrls();
    await generateSolutions();

    console.log('\n' + '='.repeat(60));
    console.log('🎯 RESUMEN: Short.io está interceptando todo el dominio');
    console.log('💡 RECOMENDACIÓN: Usar www.pupfrisky.com para OAuth');
    console.log('🔧 ALTERNATIVA: Crear subdomain auth.pupfrisky.com');
}

main().catch(console.error);
