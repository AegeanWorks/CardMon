package com.aegeanworks.cardmon;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.ContentValues;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Message;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Patterns;
import android.view.View;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
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
 * (no continuous scanning, no cloud). The WebView exposes small bridges for
 * downloads, file picking and printing so every web-app function also works
 * inside the APK.</p>
 */
public class MainActivity extends Activity {
    private static final String PREFS = "cardmon";
    private static final String KEY_SERVER_URL = "server_url";
    private static final String DISCOVERY_TOKEN = "CARDMON_DISCOVER_V1";
    private static final int DISCOVERY_PORT = 8766;
    private static final int DEFAULT_HTTP_PORT = 8765;
    private static final int FILE_CHOOSER_REQUEST = 1001;

    private WebView webView;
    private EditText serverUrlInput;
    private ValueCallback<Uri[]> filePathCallback;

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

    /** Reuses the configured host/port so the APK page works on any LAN address. */
    private String apkUrlFor(String serverUrl) {
        Uri base = Uri.parse(serverUrl);
        return new Uri.Builder()
                .scheme(base.getScheme())
                .authority(base.getAuthority())
                .path("/apk")
                .build()
                .toString();
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
        settings.setSupportMultipleWindows(false);

        webView.setWebViewClient(new WebViewClient());

        // Keep target="_blank" links in the same tab and support file picking.
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(view);
                resultMsg.sendToTarget();
                return true;
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = callback;
                try {
                    Intent intent = params.createIntent();
                    startActivityForResult(Intent.createChooser(intent, "Choose file"), FILE_CHOOSER_REQUEST);
                } catch (Exception error) {
                    filePathCallback = null;
                    Toast.makeText(MainActivity.this, "File picker unavailable", Toast.LENGTH_SHORT).show();
                    return false;
                }
                return true;
            }
        });

        // Plain http(s) downloads (e.g. the built APK) go through DownloadManager.
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition,
                                        String mimeType, long contentLength) {
                try {
                    DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                    String name = URLUtil.guessFileName(url, contentDisposition, mimeType);
                    request.setTitle(name);
                    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
                    DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                    manager.enqueue(request);
                    Toast.makeText(MainActivity.this, "Downloading " + name, Toast.LENGTH_SHORT).show();
                } catch (Exception error) {
                    Toast.makeText(MainActivity.this, "Download failed: " + error.getMessage(), Toast.LENGTH_LONG).show();
                }
            }
        });

        webView.addJavascriptInterface(new CardMonBridge(), "CardMonAndroid");
        webView.loadUrl(url);

        // Direct shortcut to the mobile APK page (has its own "Back to CardMon" link).
        final String apkUrl = apkUrlFor(url);
        Button apkButton = (Button) findViewById(R.id.apkButton);
        apkButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                webView.loadUrl(apkUrl);
                Toast.makeText(MainActivity.this, "Opening APK page", Toast.LENGTH_SHORT).show();
            }
        });

        Button settingsButton = (Button) findViewById(R.id.settingsButton);
        settingsButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                showSetupScreen();
            }
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || filePathCallback == null) return;
        Uri[] results = null;
        if (resultCode == RESULT_OK && data != null && data.getData() != null) {
            results = new Uri[]{data.getData()};
        }
        filePathCallback.onReceiveValue(results);
        filePathCallback = null;
    }

    /** Small, explicitly named bridge used only by CardMon's own web pages. */
    private class CardMonBridge {
        @JavascriptInterface
        public void printPage() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        PrintManager manager = (PrintManager) getSystemService(PRINT_SERVICE);
                        manager.print("CardMon report", webView.createPrintDocumentAdapter("CardMon report"), null);
                    } catch (Exception error) {
                        Toast.makeText(MainActivity.this, "Print unavailable: " + error.getMessage(), Toast.LENGTH_LONG).show();
                    }
                }
            });
        }

        @JavascriptInterface
        public void downloadText(String filename, String text, String mime) {
            saveToDownloads(filename, text.getBytes(StandardCharsets.UTF_8), mime);
        }

        @JavascriptInterface
        public void downloadBase64(String filename, String base64, String mime) {
            try {
                saveToDownloads(filename, Base64.decode(base64, Base64.DEFAULT), mime);
            } catch (Exception error) {
                Toast.makeText(MainActivity.this, "Decode failed: " + error.getMessage(), Toast.LENGTH_LONG).show();
            }
        }
    }

    private void saveToDownloads(final String filename, final byte[] bytes, final String mime) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    String type = mime == null ? "application/octet-stream" : mime;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        ContentValues values = new ContentValues();
                        values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                        values.put(MediaStore.Downloads.MIME_TYPE, type);
                        values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                        Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                        if (uri == null) throw new IllegalStateException("MediaStore insert failed");
                        try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                            out.write(bytes);
                        }
                    } else {
                        File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                        if (!dir.exists()) dir.mkdirs();
                        try (FileOutputStream out = new FileOutputStream(new File(dir, filename))) {
                            out.write(bytes);
                        }
                    }
                    Toast.makeText(MainActivity.this, "Saved to Downloads: " + filename, Toast.LENGTH_SHORT).show();
                } catch (Exception error) {
                    Toast.makeText(MainActivity.this, "Save failed: " + error.getMessage(), Toast.LENGTH_LONG).show();
                }
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
