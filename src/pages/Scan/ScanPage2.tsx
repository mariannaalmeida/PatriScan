import { useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonToast,
  IonButton,
  IonText,
  IonIcon,
  IonButtons,
  IonSpinner,
  IonCard,
  IonCardContent,
  useIonRouter,
} from "@ionic/react";
import {
  addCircleOutline,
  cameraOutline,
  arrowBackOutline,
} from "ionicons/icons";
import { BarcodeScannerComponent } from "../../components/BarcodeScan";
import DatabaseService from "../../services/DatabaseService";
import { IBem } from "../../models/bem";

const ScanPage2: React.FC = () => {
  const router = useIonRouter();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [codigoNaoEncontrado, setCodigoNaoEncontrado] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [scanActive, setScanActive] = useState<boolean>(true);

  const handleScan = async (brCode: string) => {
    if (!brCode) {
      setToastMessage("Código inválido.");
      return;
    }

    setIsLoading(true);
    setScanActive(false); // Pausa o scanner durante o processamento

    try {
      const bem: IBem | null = await DatabaseService.getBemByBrCode(brCode);

      if (bem) {
        await DatabaseService.addLeitura(brCode);
        router.push(`/bem-detalhe/${bem.id_bem}`, "forward");
      } else {
        setCodigoNaoEncontrado(brCode);
      }
    } catch (error) {
      console.error("Erro ao buscar código:", error);
      setToastMessage("Erro ao processar o código. Tente novamente.");
      setScanActive(true); // Reativa o scanner em caso de erro
    } finally {
      setIsLoading(false);
    }
  };

  const resetScanner = () => {
    setCodigoNaoEncontrado(null);
    setScanActive(true);
  };

  const handleCadastrarNovoBem = () => {
    if (codigoNaoEncontrado) {
      router.push(`/cadastrar-bem?br_code=${codigoNaoEncontrado}`, "forward");
    }
  };

  const handleVoltar = () => {
    router.goBack();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={handleVoltar}>
              <IonIcon slot="icon-only" icon={arrowBackOutline} />
            </IonButton>
          </IonButtons>
          <IonTitle>Leitor de Código</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={resetScanner} disabled={isLoading}>
              <IonIcon slot="icon-only" icon={cameraOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {!codigoNaoEncontrado && (
          <IonCard>
            <IonCardContent>
              <div className="ion-text-center">
                <IonIcon icon={cameraOutline} size="large" color="primary" />
                <h2>Posicione o código QR na câmera</h2>
                <IonText color="medium">
                  <p>
                    Certifique-se de que o código está bem iluminado e focado
                  </p>
                </IonText>
              </div>
            </IonCardContent>
          </IonCard>
        )}

        {isLoading ? (
          <div className="ion-text-center ion-margin-top">
            <IonSpinner name="crescent" />
            <p>Processando código...</p>
          </div>
        ) : scanActive && !codigoNaoEncontrado ? (
          <BarcodeScannerComponent
            onScan={handleScan}
            onError={(error) => {
              setToastMessage(error.message);
              setScanActive(false);
            }}
          />
        ) : null}

        {codigoNaoEncontrado && (
          <div className="ion-text-center ion-margin-top">
            <IonCard color="warning">
              <IonCardContent>
                <IonText color="dark">
                  <h3>Código não encontrado</h3>
                  <p>
                    O código <strong>{codigoNaoEncontrado}</strong> não está
                    cadastrado no sistema.
                  </p>
                </IonText>
              </IonCardContent>
            </IonCard>

            <div className="ion-margin-top">
              <IonButton
                color="success"
                expand="block"
                onClick={handleCadastrarNovoBem}
                className="ion-margin-bottom"
              >
                <IonIcon icon={addCircleOutline} slot="start" />
                Cadastrar Novo Bem
              </IonButton>

              <IonButton
                color="medium"
                expand="block"
                fill="outline"
                onClick={resetScanner}
              >
                <IonIcon icon={cameraOutline} slot="start" />
                Escanear Novamente
              </IonButton>
            </div>
          </div>
        )}

        <IonToast
          isOpen={!!toastMessage}
          message={toastMessage ?? ""}
          duration={3000}
          onDidDismiss={() => setToastMessage(null)}
          position="top"
          color="danger"
        />
      </IonContent>
    </IonPage>
  );
};

export default ScanPage2;
