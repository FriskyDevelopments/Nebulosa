<?php
require_once __DIR__ . '/oauth/zoomOAuth.php';
require_once __DIR__ . '/oauth/telegramNotifier.php';

// === ZOOM APP CREDENTIALS (from environment variables) ===
$client_id = getenv('ZOOM_CLIENT_ID');
$client_secret = getenv('ZOOM_CLIENT_SECRET');
$redirect_uri = getenv('ZOOM_REDIRECT_URI') ?: 'https://pupfrisky.com/zoom-callback.php';

// === GET CODE FROM ZOOM ===
$code = $_GET['code'] ?? null;

if (!$code) {
    notifyTelegram("⚠️ Error: Zoom did not return an authorization code.");
    header("Location: /oauth-error.html");
    exit;
}

// === PROCESS ZOOM TOKEN ===
$zoom = new ZoomOAuth($client_id, $client_secret, $redirect_uri);
$result = $zoom->getAccessToken($code);

if (!isset($result['access_token'])) {
    notifyTelegram("🚨 Zoom OAuth failed: access token not received.");
    header("Location: /oauth-error.html");
    exit;
}

// === GET USER EMAIL ===
$email = $zoom->getUserEmail($result['access_token']);
notifyTelegram("🔐 Zoom OAuth authorized: `$email`");

// === REDIRECT TO SUCCESS PAGE ===
header("Location: /oauth-success.html");
exit;
?>
