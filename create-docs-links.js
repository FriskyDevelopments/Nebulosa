#!/usr/bin/env node

/**
 * Script para crear todos los enlaces de documentación en Short.io
 * Con favicon personalizado y títulos apropiados
 */

const fs = require('fs');
const https = require('https');

const SHORTIO_API_KEY = process.env.SHORTIO_API_KEY;
const DOMAIN = 'pupfrisky.com';
const FAVICON_PATH = './favicon.svg';

console.log('🔗 Creando enlaces de documentación en Short.io...');

// Configuración de enlaces a crear
const LINKS_CONFIG = [
    {
        slug: 'docs',
        url: 'https://pupfrisky.com/docs-index.html',
        title: '📚 LA NUBE BOT - Documentación',
        tags: ['docs', 'bot', 'principal']
    },
    {
        slug: 'setup',
        url: 'https://pupfrisky.com/docs-setup.html',
        title: '⚙️ Configuración Inicial - LA NUBE BOT',
        tags: ['docs', 'setup', 'instalacion']
    },
    {
        slug: 'oauth',
        url: 'https://pupfrisky.com/zoom-callback.php',
        title: '🔑 OAuth Zoom Redirect - LA NUBE BOT',
        tags: ['oauth', 'zoom', 'redirect', 'auth']
    },
    {
        slug: 'oauth-docs',
        url: 'https://pupfrisky.com/docs-oauth.html',
        title: '📖 OAuth Zoom Docs - LA NUBE BOT',
        tags: ['docs', 'oauth', 'zoom', 'documentation']
    },
    {
        slug: 'multipin',
        url: 'https://pupfrisky.com/docs-multipin.html',
        title: '📌 Multipin Automation - LA NUBE BOT',
        tags: ['docs', 'multipin', 'automation', 'puppeteer']
    },
    {
        slug: 'shortio',
        url: 'https://pupfrisky.com/docs-shortio.html',
        title: '🔗 Short.io Integration - LA NUBE BOT',
        tags: ['docs', 'shortio', 'links', 'urls']
    },
    {
        slug: 'zoom-callback',
        url: 'https://pupfrisky.com/zoom-callback.php',
        title: '🔗 Zoom OAuth Callback - LA NUBE BOT',
        tags: ['oauth', 'zoom', 'callback', 'auth']
    },
    {
        slug: 'bot-help',
        url: 'https://pupfrisky.com/docs-index.html#comandos',
        title: '❓ Ayuda del Bot - LA NUBE BOT',
        tags: ['help', 'comandos', 'bot', 'ayuda']
    },
    {
        slug: 'github',
        url: 'https://github.com/PupFr/Nebulosa',
        title: '💻 Código Fuente - LA NUBE BOT',
        tags: ['github', 'codigo', 'source', 'desarrollo']
    }
];

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

async function createLink(linkConfig) {
    console.log(`🔗 Creando enlace: ${linkConfig.slug} → ${linkConfig.title}`);
    
    const svgContent = fs.readFileSync(FAVICON_PATH, 'utf8');
    const base64Content = Buffer.from(svgContent).toString('base64');
    
    const data = JSON.stringify({
        originalURL: linkConfig.url,
        domain: DOMAIN,
        path: linkConfig.slug,
        allowDuplicates: false,
        favicon: `data:image/svg+xml;base64,${base64Content}`,
        title: linkConfig.title,
        tags: linkConfig.tags
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
            console.log(`   📄 Título: ${response.data.title}`);
            console.log(`   🏷️  Etiquetas: ${linkConfig.tags.join(', ')}`);
            return {
                success: true,
                slug: linkConfig.slug,
                shortUrl: shortUrl,
                originalUrl: linkConfig.url,
                title: linkConfig.title,
                tags: linkConfig.tags,
                linkId: response.data.id
            };
        } else if (response.status === 409) {
            console.log(`   ⚠️  Ya existe: ${linkConfig.slug}`);
            return {
                success: false,
                reason: 'duplicate',
                slug: linkConfig.slug
            };
        } else {
            console.error(`   ❌ Error: ${response.status}`);
            console.error(`   📄 Respuesta:`, response.data);
            return {
                success: false,
                reason: 'error',
                slug: linkConfig.slug,
                error: response.data
            };
        }
    } catch (error) {
        console.error(`   ❌ Error de conexión: ${error.message}`);
        return {
            success: false,
            reason: 'connection_error',
            slug: linkConfig.slug,
            error: error.message
        };
    }
}

async function createAllLinks() {
    console.log('📋 Configuración:');
    console.log(`   API Key: ✅ Configurado`);
    console.log(`   Dominio: ${DOMAIN}`);
    console.log(`   Favicon: ${FAVICON_PATH}`);
        console.log(`   Enlaces a crear: ${LINKS_CONFIG.length}`);
    console.log('');

    const results = [];
    
    for (const linkConfig of LINKS_CONFIG) {
        const result = await createLink(linkConfig);
        results.push(result);
        console.log(''); // Línea en blanco entre enlaces
        
        // Pequeña pausa para no saturar la API
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
}

function generateSummary(results) {
    const successful = results.filter(r => r.success);
    const duplicates = results.filter(r => r.reason === 'duplicate');
    const errors = results.filter(r => r.reason === 'error' || r.reason === 'connection_error');

    console.log('📊 RESUMEN:');
    console.log('====================');
    console.log(`✅ Enlaces creados exitosamente: ${successful.length}`);
    console.log(`⚠️  Enlaces duplicados (ya existían): ${duplicates.length}`);
    console.log(`❌ Errores: ${errors.length}`);
    console.log('');

    if (successful.length > 0) {
        console.log('🔗 ENLACES CREADOS:');
        successful.forEach(link => {
            console.log(`   ${link.shortUrl} → ${link.originalUrl}`);
            console.log(`   📄 ${link.title}`);
        });
        console.log('');
    }

    if (duplicates.length > 0) {
        console.log('⚠️  ENLACES DUPLICADOS:');
        duplicates.forEach(link => {
            console.log(`   /${link.slug} (ya existía)`);
        });
        console.log('');
    }

    if (errors.length > 0) {
        console.log('❌ ERRORES:');
        errors.forEach(link => {
            console.log(`   /${link.slug}: ${link.error}`);
        });
        console.log('');
    }

    // Generar archivo de enlaces para referencia
    const linksReference = {
        created_at: new Date().toISOString(),
        domain: DOMAIN,
        total_links: LINKS_CONFIG.length,
        successful: successful.length,
        duplicates: duplicates.length,
        errors: errors.length,
        links: results
    };

    fs.writeFileSync('./shortio-links-summary.json', JSON.stringify(linksReference, null, 2));
    console.log('💾 Resumen guardado en shortio-links-summary.json');
}

async function main() {
    console.log('🚀 Iniciando creación masiva de enlaces...');
    console.log('');

    const results = await createAllLinks();
    
    console.log('');
    generateSummary(results);
    
    console.log('');
    console.log('🎉 ¡Proceso completado!');
    console.log('');
    console.log('📋 Enlaces principales:');
    console.log('   📚 Docs: https://Pupfrisky.com/docs');
    console.log('   ⚙️  Setup: https://Pupfrisky.com/setup');
    console.log('   🔑 OAuth: https://Pupfrisky.com/oauth');
    console.log('   📌 Multipin: https://Pupfrisky.com/multipin');
    console.log('   🔗 Short.io: https://Pupfrisky.com/shortio');
    console.log('   💻 GitHub: https://Pupfrisky.com/github');
}

main().catch(console.error);
