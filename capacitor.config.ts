import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.edu.ifes.patri",
  appName: "PatriScan",
  webDir: "dist",
  plugins: {
    CapacitorSQLite: {
      iosKeychainPrefix: "PatriScan",
      androidIsEncryption: false,
    },
    BarcodeScanner: {
      // Common configuration for all platforms
      preferredCamera: "back",
      formats: [
        "QR_CODE",
        "PDF_417",
        "UPC_E",
        "UPC_A",
        "EAN_8",
        "EAN_13",
        "CODE_128",
        "CODE_39",
        "CODE_93",
        "CODABAR",
        "ITF",
        "RSS14",
        "RSS_EXPANDED",
        "DATA_MATRIX",
        "AZTEC",
        "MAXICODE",
      ],
      // Configurações específicas para Android

      android: {
        enableBarcodeScanner: true,
        showUsageExplanation: true,
        enableAutoFocus: true,
        enableTorchButton: true,
        // Permissões serão solicitadas automaticamente
      },
      // iOS-specific
      ios: {
        showViewfinder: true,
        enableAutoFocus: true,
        enableTorchButton: true,
      },
    },
    Camera: {
      // Configurações opcionais da câmera
      android: {
        enableZoom: true,
        allowBackground: false,
      },
    },
  },
  ios: {
    scheme: "PatriScan",
    preferredContentMode: "mobile",
  },
  android: {
    allowMixedContent: true,
    appendUserAgent: "PatriScan/1.0",
  },
};

export default config;
