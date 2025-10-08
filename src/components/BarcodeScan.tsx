import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerOptions,
  CapacitorBarcodeScannerTypeHint,
  CapacitorBarcodeScannerCameraDirection,
  CapacitorBarcodeScannerAndroidScanningLibrary,
  CapacitorBarcodeScannerScanOrientation,
} from "@capacitor/barcode-scanner";

import { useState } from "react";
import {
  IonButton,
  IonIcon,
  IonAlert,
  IonLoading,
  IonText,
} from "@ionic/react";
import { scanOutline, closeOutline, cameraOutline } from "ionicons/icons";

// Interface que define as props do componente
interface Props {
  onScan: (result: string) => void; // Callback quando um código é escaneado
  onError?: (error: any) => void; // Callback opcional para tratamento de erros
}

// Componente principal do scanner de código de barras
export const BarcodeScannerComponent = ({ onScan, onError }: Props) => {
  // Estados do componente
  const [isScanning, setIsScanning] = useState(false); // Controla se o scanner está ativo
  const [permissionAlert, setPermissionAlert] = useState(false); // Controla o alerta de permissão
  const [loading, setLoading] = useState(false); // Controla o estado de carregamento

  // Função para iniciar o scanner
  const startScanner = async () => {
    setLoading(true); // Ativa o estado de carregamento
    try {
      setIsScanning(true); // Ativa o modo de escaneamento

      // Configurações do scanner
      const options: CapacitorBarcodeScannerOptions = {
        hint: CapacitorBarcodeScannerTypeHint.ALL, // Tipos de códigos a serem escaneados
        scanInstructions: "Posicione o código dentro da área de leitura", // Instruções para o usuário
        scanButton: false, // Esconde o botão nativo de escaneamento
        cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK, // Usa a câmera traseira
        scanOrientation: CapacitorBarcodeScannerScanOrientation.ADAPTIVE, // Orientação adaptável
        android: {
          scanningLibrary: CapacitorBarcodeScannerAndroidScanningLibrary.MLKIT, // Usa MLKit no Android
        },
        web: {
          showCameraSelection: false, // Não mostra seleção de câmera na web
          scannerFPS: 30, // Taxa de quadros por segundo
        },
      };

      // Inicia o scanner e aguarda o resultado
      const result = await CapacitorBarcodeScanner.scanBarcode(options);

      // Se obteve resultado, chama a callback
      if (result?.ScanResult) {
        onScan(result.ScanResult);
      }
    } catch (error) {
      console.error("Erro no scanner:", error);
      // Se erro for de permissão, mostra alerta
      if ((error as any).message?.includes("permission")) {
        setPermissionAlert(true);
      }
      // Chama callback de erro se existir
      onError?.(error);
    } finally {
      // Finaliza o escaneamento
      setIsScanning(false);
      setLoading(false);
    }
  };

  // Função para parar o scanner
  const stopScanner = () => {
    setIsScanning(false);
  };

  // Renderização do componente
  return (
    <>
      {/* Botão principal para iniciar/parar o scanner */}
      <IonButton
        onClick={isScanning ? stopScanner : startScanner}
        disabled={loading}
        expand="block"
        color={isScanning ? "danger" : "success"}
      >
        <IonIcon icon={isScanning ? closeOutline : scanOutline} slot="start" />
        {isScanning ? "Cancelar Escaneamento" : "Escanear Código"}
      </IonButton>

      {/* Loading enquanto prepara o scanner */}
      <IonLoading isOpen={loading} message="Preparando scanner..." />

      {/* Alerta para quando falta permissão de câmera */}
      <IonAlert
        isOpen={permissionAlert}
        onDidDismiss={() => setPermissionAlert(false)}
        header="Permissão Necessária"
        message="Por favor, habilite as permissões de câmera nas configurações do dispositivo."
        buttons={[
          {
            text: "OK",
            role: "cancel",
          },
        ]}
      />

      {/* Overlay do scanner quando ativo */}
      {isScanning && (
        <div
          className="scanner-overlay"
          style={{ textAlign: "center", marginTop: "1rem" }}
        >
          <IonIcon icon={cameraOutline} size="large" color="light" />
          <IonText color="light">
            <h3>Aponte a câmera para o código</h3>
            <p>Posicione o código dentro da área de escaneamento</p>
          </IonText>
          <IonButton onClick={stopScanner} color="danger" fill="outline">
            <IonIcon icon={closeOutline} slot="start" />
            Cancelar
          </IonButton>
        </div>
      )}
    </>
  );
};
