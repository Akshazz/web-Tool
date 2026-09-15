<?php
/**
 * "Sign in with Google / GitHub / Facebook" — single endpoint that
 * handles both legs of the OAuth Authorization Code flow:
 *
 *   1. Start:    GET oauth.php?provider=google
 *                -> redirects the browser to the provider's consent screen
 *   2. Callback: GET oauth.php?provider=google&code=...&state=...
 *                -> the provider redirects back here after the person
 *                   approves; we exchange the code for a token, fetch
 *                   their profile, find-or-create the local account, log
 *                   them in and send them to the dashboard
 *
 * Register this exact URL (oauth.php?provider=<name>) as each provider's
 * redirect/callback URI. Client IDs/secrets and the site's base URL live
 * in config.php under the 'oauth' key — see the comments there.
 */
require_once __DIR__ . '/security.php';
adevtools_start_session();
adevtools_security_headers();
require_once __DIR__ . '/auth-helpers.php';

$config = require __DIR__ . '/config.php';
$oauthConfig = isset($config['oauth']) ? $config['oauth'] : array();
$baseUrl = isset($oauthConfig['base_url']) ? rtrim($oauthConfig['base_url'], '/') : '';

$provider = isset($_GET['provider']) ? $_GET['provider'] : '';
$intent = isset($_GET['intent']) && $_GET['intent'] === 'login' ? 'login' : 'signup';
$providers = array('google', 'github', 'facebook');

function oauth_fail($message, $intent) {
    header('Location: ?page=landing&oauth_error=' . rawurlencode($message) . '&oauth_intent=' . rawurlencode($intent));
    exit;
}

/** Small dependency-free HTTPS POST/GET helper (no extra PHP extensions
 *  beyond curl, which is bundled with virtually every PHP install). */
function oauth_http($url, $method = 'GET', $fields = array(), $headers = array()) {
    $ch = curl_init();
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($fields));
    } else {
        $url .= (strpos($url, '?') === false ? '?' : '&') . http_build_query($fields);
    }
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 12);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array_merge(array('Accept: application/json'), $headers));
    $body = curl_exec($ch);
    $ok = $body !== false && curl_errno($ch) === 0;
    curl_close($ch);
    if (!$ok) { return null; }
    $data = json_decode($body, true);
    return is_array($data) ? $data : null;
}

if (!in_array($provider, $providers, true)) {
    oauth_fail('Unknown sign-in provider.', $intent);
}

$creds = isset($oauthConfig[$provider]) ? $oauthConfig[$provider] : array();
$clientId = isset($creds['client_id']) ? trim((string)$creds['client_id']) : '';
$clientSecret = isset($creds['client_secret']) ? trim((string)$creds['client_secret']) : '';

if ($clientId === '' || $clientSecret === '' || $baseUrl === '') {
    oauth_fail(ucfirst($provider) . ' sign-in isn\'t set up yet. The site owner needs to add ' . ucfirst($provider) . ' OAuth credentials to config.php.', $intent);
}

$redirectUri = $baseUrl . '/oauth.php?provider=' . $provider;

// ---------------------------------------------------------------------
// Leg 2: provider redirected back with an authorization code.
// ---------------------------------------------------------------------
if (isset($_GET['code'])) {
    $state = isset($_GET['state']) ? $_GET['state'] : '';
    $expected = isset($_SESSION['oauth_state']) ? $_SESSION['oauth_state'] : null;
    $expectedIntent = isset($_SESSION['oauth_intent']) ? $_SESSION['oauth_intent'] : 'signup';
    unset($_SESSION['oauth_state'], $_SESSION['oauth_intent']);

    if (!$expected || !hash_equals($expected, $state)) {
        oauth_fail('Your sign-in session expired. Please try again.', $expectedIntent);
    }

    $code = $_GET['code'];
    $profile = null; // array('id' => ..., 'name' => ..., 'email' => ...)

    try {
        if ($provider === 'google') {
            $token = oauth_http('https://oauth2.googleapis.com/token', 'POST', array(
                'code' => $code, 'client_id' => $clientId, 'client_secret' => $clientSecret,
                'redirect_uri' => $redirectUri, 'grant_type' => 'authorization_code',
            ));
            if (empty($token['access_token'])) { oauth_fail('Google sign-in failed. Please try again.', $expectedIntent); }
            $info = oauth_http('https://www.googleapis.com/oauth2/v3/userinfo', 'GET', array(), array(
                'Authorization: Bearer ' . $token['access_token'],
            ));
            if (empty($info['sub'])) { oauth_fail('Could not read your Google profile.', $expectedIntent); }
            $profile = array('id' => $info['sub'], 'name' => isset($info['name']) ? $info['name'] : '', 'email' => isset($info['email']) ? $info['email'] : '');
        }

        if ($provider === 'github') {
            $token = oauth_http('https://github.com/login/oauth/access_token', 'POST', array(
                'code' => $code, 'client_id' => $clientId, 'client_secret' => $clientSecret,
                'redirect_uri' => $redirectUri,
            ));
            if (empty($token['access_token'])) { oauth_fail('GitHub sign-in failed. Please try again.', $expectedIntent); }
            $authHeader = array('Authorization: Bearer ' . $token['access_token'], 'User-Agent: A-DevTools');
            $info = oauth_http('https://api.github.com/user', 'GET', array(), $authHeader);
            if (empty($info['id'])) { oauth_fail('Could not read your GitHub profile.', $expectedIntent); }
            $email = isset($info['email']) ? $info['email'] : '';
            if (!$email) {
                // GitHub omits email from /user when it's kept private; the
                // verified primary address (if any) lives in /user/emails.
                $emails = oauth_http('https://api.github.com/user/emails', 'GET', array(), $authHeader);
                if (is_array($emails)) {
                    foreach ($emails as $e) {
                        if (!empty($e['primary']) && !empty($e['verified'])) { $email = $e['email']; break; }
                    }
                }
            }
            $profile = array('id' => (string)$info['id'], 'name' => isset($info['name']) && $info['name'] ? $info['name'] : $info['login'], 'email' => $email);
        }

        if ($provider === 'facebook') {
            $token = oauth_http('https://graph.facebook.com/v19.0/oauth/access_token', 'GET', array(
                'code' => $code, 'client_id' => $clientId, 'client_secret' => $clientSecret,
                'redirect_uri' => $redirectUri,
            ));
            if (empty($token['access_token'])) { oauth_fail('Facebook sign-in failed. Please try again.', $expectedIntent); }
            $info = oauth_http('https://graph.facebook.com/me', 'GET', array(
                'fields' => 'id,name,email', 'access_token' => $token['access_token'],
            ));
            if (empty($info['id'])) { oauth_fail('Could not read your Facebook profile.', $expectedIntent); }
            $profile = array('id' => $info['id'], 'name' => isset($info['name']) ? $info['name'] : '', 'email' => isset($info['email']) ? $info['email'] : '');
        }
    } catch (Exception $e) {
        oauth_fail('Something went wrong talking to ' . ucfirst($provider) . '. Please try again.', $expectedIntent);
    }

    if (!$profile) { oauth_fail('Sign-in failed. Please try again.', $expectedIntent); }

    $user = findOrCreateOAuthUser($provider, $profile['id'], $profile['name'], $profile['email']);
    session_regenerate_id(true); // fresh session ID on privilege change — blocks session fixation
    $_SESSION['userId'] = $user['id'];
    header('Location: ?page=dashboard');
    exit;
}

// ---------------------------------------------------------------------
// Leg 1: kick off the provider's consent screen.
// ---------------------------------------------------------------------
$state = bin2hex(random_bytes(16));
$_SESSION['oauth_state'] = $state;
$_SESSION['oauth_intent'] = $intent;

if ($provider === 'google') {
    $authorizeUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query(array(
        'client_id' => $clientId, 'redirect_uri' => $redirectUri, 'response_type' => 'code',
        'scope' => 'openid email profile', 'state' => $state, 'prompt' => 'select_account',
    ));
} elseif ($provider === 'github') {
    $authorizeUrl = 'https://github.com/login/oauth/authorize?' . http_build_query(array(
        'client_id' => $clientId, 'redirect_uri' => $redirectUri,
        'scope' => 'read:user user:email', 'state' => $state,
    ));
} else {
    $authorizeUrl = 'https://www.facebook.com/v19.0/dialog/oauth?' . http_build_query(array(
        'client_id' => $clientId, 'redirect_uri' => $redirectUri, 'response_type' => 'code',
        'scope' => 'email public_profile', 'state' => $state,
    ));
}

header('Location: ' . $authorizeUrl);
exit;
