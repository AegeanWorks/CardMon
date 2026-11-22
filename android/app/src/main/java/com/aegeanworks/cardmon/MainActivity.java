package com.aegeanworks.cardmon;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Patterns;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;

import org.json.JSONObject;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;

/**
 * CardMon Android companion.
 *
 * <p>Finds the CardMon local server on the Wi-Fi with a single UDP broadcast
 * (no continuous scanning, no cloud). If the server is already known from a
 * previous run it is used directly. Sync itself stays manual unless the user
 * explicitly enables auto-sync in the web app.</p>
 */
public class MainActivity extends Activity {
    private static final String PREFS = "cardmon";
    private static final String KEY_SERVER_URL = "server_url";
    private static final String DISCOVERY_TOKEN = "CARDMON_DISCOVER_V1";
    private static final int DISCOVERY_PORT = 8766;
    private static final int DEFAULT_HTTP_PORT = 8765;

    private WebView webView;
    private EditText serverUrlInput;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        String url = prefs.getString(KEY_SERVER_URL, "");
        if (url == null || url.trim().isEmpty()) {
            showSetupScreen();
            // One-shot search on first launch; nothing keeps running afterwards.
            discoverAutomatically();
        } else {
            showWebView(url.trim());
        }
    }

    private void showSetupScreen() {
        setContentView(R.layout.activity_setup);
        serverUrlInput = (EditText) findViewById(R.id.serverUrlInput);
        Button connect = (Button) findViewById(R.id.connectButton);
        connect.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                String value = serverUrlInput.getText().toString().trim();
                String normalized = normalizeUrl(value);
                if (normalized == null) {
                    serverUrlInput.setError(getString(R.string.invalid_url));
                    return;
                }
                saveServerUrl(normalized);
                showWebView(normalized);
            }
        });

        Button discover = (Button) findViewById(R.id.discoverButton);
        discover.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                discoverAutomatically();
            }
        });
    }

    private String normalizeUrl(String value) {
        if (value == null || value.trim().isEmpty()) return null;
        String url = value.trim();
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "http://" + url;
        }
        return Patterns.WEB_URL.matcher(url).matches() ? url : null;
    }

    private void saveServerUrl(String url) {
        getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                .putString(KEY_SERVER_URL, url).apply();
    }

    private void discoverAutomatically() {
        if (serverUrlInput != null) serverUrlInput.setEnabled(false);
        new Thread(new Runnable() {
            @Override
            public void run() {
                final String found = discoverServerOnce();
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        if (serverUrlInput != null) serverUrlInput.setEnabled(true);
                        if (found == null) {
                            if (serverUrlInput != null) {
                                serverUrlInput.setError(getString(R.string.discovery_failed));
                            }
                            return;
                        }
                        if (serverUrlInput != null) serverUrlInput.setText(found);
                        saveServerUrl(found);
                        showWebView(found);
                    }
                });
            }
        }).start();
    }

    /**
     * Sends one UDP broadcast and waits briefly for a reply. No polling loops
     * and no background service: discovery happens only when the user asks.
     */
    private String discoverServerOnce() {
        DatagramSocket socket = null;
        try {
            socket = new DatagramSocket();
            socket.setBroadcast(true);
            socket.setSoTimeout(2500);

            byte[] data = DISCOVERY_TOKEN.getBytes(StandardCharsets.UTF_8);
            for (InetAddress target : broadcastTargets()) {
                socket.send(new DatagramPacket(data, data.length, target, DISCOVERY_PORT));
            }

            long deadline = System.currentTimeMillis() + 4000;
            while (System.currentTimeMillis() < deadline) {
                try {
                    byte[] buffer = new byte[2048];
                    DatagramPacket reply = new DatagramPacket(buffer, buffer.length);
                    socket.receive(reply);
                    String json = new String(reply.getData(), reply.getOffset(),
                            reply.getLength(), StandardCharsets.UTF_8);
                    JSONObject object = new JSONObject(json);
                    if ("cardmon_server".equals(object.optString("type"))) {
                        int port = object.optInt("httpPort", DEFAULT_HTTP_PORT);
                        return "http://" + reply.getAddress().getHostAddress() + ":" + port;
                    }
                } catch (SocketTimeoutException timeout) {
                    break;
                } catch (Exception ignored) {
                    // Ignore unrelated UDP packets and malformed replies.
                }
            }
        } catch (Exception failure) {
            return null;
        } finally {
            if (socket != null) socket.close();
        }
        return null;
    }

    /** Global plus subnet-directed broadcast addresses for the /24 networks. */
    private InetAddress[] broadcastTargets() {
        List<InetAddress> targets = new ArrayList<InetAddress>();
        try {
            targets.add(InetAddress.getByName("255.255.255.255"));
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface ni = interfaces.nextElement();
                if (ni == null || !ni.isUp() || ni.isLoopback() || ni.isVirtual()) continue;
                Enumeration<InetAddress> addresses = ni.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress address = addresses.nextElement();
                    if (!(address instanceof Inet4Address) || address.isLoopbackAddress()) continue;
                    byte[] ip = address.getAddress();
                    byte[] broadcast = new byte[4];
                    for (int i = 0; i < 4; i++) {
                        broadcast[i] = (byte) ((ip[i] & 0xFF) | (i == 3 ? 0xFF : 0));
                    }
                    InetAddress directed = InetAddress.getByAddress(broadcast);
                    if (!targets.contains(directed)) targets.add(directed);
                }
            }
        } catch (Exception ignored) {
            // The global broadcast address alone is still a valid fallback.
        }
        return targets.toArray(new InetAddress[0]);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void showWebView(String url) {
        setContentView(R.layout.activity_web);
        webView = (WebView) findViewById(R.id.webView);
        serverUrlInput = null;

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        webView.loadUrl(url);

        Button settingsButton = (Button) findViewById(R.id.settingsButton);
        settingsButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                showSetupScreen();
            }
        });
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
