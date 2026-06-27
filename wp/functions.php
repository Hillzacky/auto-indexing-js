<?php
/**
 * Pemicu Otomatis Node.js Indexing API saat Artikel Terbit/Diperbarui
 */
add_action('publish_post', 'wp_auto_trigger_indexing', 10, 2);
add_action('post_updated', 'wp_auto_trigger_indexing_update', 10, 3);

function wp_auto_trigger_indexing($ID, $post) {
    // Hindari duplikasi jika ini adalah auto-save atau revisi
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if ($post->post_status !== 'publish') return;

    $url = get_permalink($ID);
    wp_send_url_to_node_indexer($url);
}

function wp_auto_trigger_indexing_update($ID, $post_after, $post_before) {
    // Hanya picu jika status beralih menjadi 'publish' atau konten yang sudah terbit diperbarui
    if ($post_after->post_status !== 'publish') return;
    
    $url = get_permalink($ID);
    wp_send_url_to_node_indexer($url);
}

function wp_send_url_to_node_indexer($url) {
    // Sesuaikan dengan endpoint REST API Node.js Anda
    $api_url = 'http://localhost:3000/api/v1/index-urls'; 
    $api_key = 'RahasiaDanSangatPanjang123!'; // x-api-key sesuai dengan konfigurasi Anda

    $body = json_encode([
        'urls' => [$url],
        'options' => [
            'siteHost' => parse_url($url, PHP_URL_HOST),
            'googleCredentialsPath' => './config/google.json',
            'indexNowApiKey' => 'key_indexnow_anda',
            'baiduToken' => 'token_baidu_anda'
        ]
    ]);

    // Kirim secara asynchronous menggunakan cURL bawaan WordPress
    wp_remote_post($api_url, [
        'method'    => 'POST',
        'blocking'  => false, // Menjalankan proses di background tanpa membebani loading WordPress
        'headers'   => [
            'Content-Type' => 'application/json',
            'x-api-key'    => $api_key
        ],
        'body'      => $body,
        'timeout'   => 5
    ]);
}
