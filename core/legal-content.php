<?php
/**
 * Shared Privacy Policy body — rendered by both guest.php's standalone
 * /?page=privacy page and the "About & Legal" panel in Settings (index.php),
 * so updating the policy only ever means editing it in this one place.
 *
 * render_privacy_policy_intro() -> the "last updated" line + intro paragraph
 *   + the Data Privacy Act of 2012 (RA 10173) compliance note.
 * render_privacy_policy_sections() -> the numbered sections (accounts,
 *   workspace content, cookies, rights, etc). Each <h2> carries an id for
 *   future deep-linking.
 */

if (!function_exists('render_privacy_policy_intro')) {
    function render_privacy_policy_intro() {
        ?>
        <div class="legal-intro">
        <p class="legal-updated">Last updated: <?php echo date('F j, Y'); ?></p>
        <p class="muted">A-Code Playground is a self-hosted, single-admin workspace, not a company product — there is no ad network, analytics tracker or data broker involved anywhere in it. This page explains exactly what the app stores about you, where it stores it, and how you can see or remove it.</p>
        <p class="muted"><b>Data Privacy Act of 2012 (Republic Act No. 10173).</b> Where this workspace is used by data subjects in the Philippines, the handling described below follows the principles of RA 10173: personal data is collected for a declared, specific purpose, kept only for as long as that purpose requires, protected by reasonable organizational and technical security measures, and never processed beyond what you've consented to here.</p>
        </div>
        <?php
    }
}

if (!function_exists('render_privacy_policy_sections')) {
    function render_privacy_policy_sections() {
        ?>
        <h2 id="legal-sec-account">1. Account data</h2>
        <ul>
            <li><b>If you sign up with a password:</b> your name, email address, and a bcrypt <i>hash</i> of your password. The plain password is never stored — not even the admin can read it back.</li>
            <li><b>If you sign up with Google, GitHub or Facebook:</b> the name, email and account ID that provider hands us at sign-in. We never see or store your password for that provider.</li>
            <li>Your chosen experience level (Beginner / Intermediate / Professional) and account role (user or admin).</li>
        </ul>

        <h2 id="legal-sec-workspace">2. Your workspace content</h2>
        <p class="muted">Everything you create — Projects, Notes, Snippets and saved UI Components — is stored in a database table scoped to your account ID, along with title/body/code text and created/updated timestamps. Nobody but you (and the workspace admin, for support/troubleshooting) can query it, and none of it is scanned for advertising or shared with any third party.</p>

        <h2 id="legal-sec-local">3. Local-first storage</h2>
        <p class="muted">Every change is written first to your browser's local storage, so the app works instantly and offline. That local copy is then mirrored in the background to the MySQL database above, which acts as your backup and lets your workspace follow you if you sign in on another computer. Deleting something moves it to your local Recycle Bin (kept only in your browser) before it's permanently removed.</p>

        <h2 id="legal-sec-gamification">4. Gamification data</h2>
        <p class="muted">To power the points/streak/leaderboard feature we keep a running total, your daily-claim streak, and a short ledger of the actions that earned XP (e.g. "ran code", "saved a snippet") with a timestamp. This is used only to calculate your rank — it is not shared or used for any other purpose.</p>

        <h2 id="legal-sec-cookies">5. Cookies &amp; sessions</h2>
        <p class="muted">A single session cookie keeps you signed in. It is <b>HttpOnly</b> (invisible to page scripts), sent with <b>SameSite=Lax</b>, marked <b>Secure</b> whenever the site is served over HTTPS, and expires when you close your browser or sign out. There are no advertising, tracking or third-party cookies anywhere in the app.</p>

        <h2 id="legal-sec-gdrive">6. Optional Google Drive backup</h2>
        <p class="muted">If you choose to connect Google Drive from Settings, we store your Google account email, an encrypted refresh token, the ID of the backup folder, and the time/hash of your last sync — nothing else from your Drive is read or stored. This only happens if you turn the feature on, and disconnecting removes this record.</p>

        <h2 id="legal-sec-audit">7. Security &amp; audit logs</h2>
        <p class="muted">The admin control panel keeps a rolling technical log of administrative actions (event type, timestamp, IP address, and the acting admin's email) for troubleshooting and abuse prevention — for example sign-ins, account changes or settings updates. Passwords are never written to this log, it is not readable from the public site, and it automatically trims itself to the most recent ~1,000 entries.</p>

        <h2 id="legal-sec-never">8. What we never do</h2>
        <ul>
            <li>We do not sell, rent or share your data with third parties or advertisers.</li>
            <li>We do not scan your projects, notes or snippets for advertising or profiling.</li>
            <li>We do not run third-party analytics or tracking scripts.</li>
        </ul>

        <h2 id="legal-sec-rights">9. Your rights &amp; controls</h2>
        <p class="muted">From Settings you can export a full JSON snapshot of your workspace at any time, delete individual items (with a Recycle Bin safety net first), disconnect Google Drive, or request that your account and all associated data be permanently deleted by the workspace admin. Under the Data Privacy Act, this covers your rights to be informed, to access, to object, to correct, and to erasure or blocking of your personal data.</p>

        <h2 id="legal-sec-changes">10. Changes to this policy</h2>
        <p class="muted">As A-Code Playground evolves, this page may be updated to reflect new features or storage changes. Continuing to use the app after a change means you accept the updated policy.</p>

        <h2 id="legal-sec-contact">11. Contact</h2>
        <p class="muted">Questions about this policy, your data, or a Data Privacy Act request can be directed to the workspace administrator.</p>
        <?php
    }
}
