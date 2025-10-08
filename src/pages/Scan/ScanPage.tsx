import { useState } from "react";
import { useHistory } from "react-router-dom";
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
} from "@ionic/react";
import { addCircleOutline, cameraOutline } from "ionicons/icons";
import { BarcodeScannerComponent } from "../../components/BarcodeScan";
import DatabaseService from "../../services/DatabaseService";
import { IBem } from "../../models/bem";

const ScanPage = () => {
  const history = useHistory();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [codigoNaoEncontrado, setCodigoNaoEncontrado] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleScan = async (br_code: string) => {
    setIsLoading(true);
    try {
      await DatabaseService.initialize(); //  Inicializa o banco

      const db = await DatabaseService.getDB();

      const result = await db.query(
        "SELECT * FROM BEM WHERE br_code = ? LIMIT 1",
        [br_code]
      );

      const values = result.values ?? [];

      if (values.length > 0) {
        const bem: IBem = values[0];

        await db.run(
          "INSERT INTO LEITURAS (br_code, data_leitura) VALUES (?, datetime('now'))",
          [br_code]
        );

        history.push(`/bem-detalhe/${bem.id_bem}`);
      } else {
        setCodigoNaoEncontrado(br_code);
      }
    } catch (error) {
      console.error("Erro ao buscar código:", error);
      setToastMessage("Erro ao processar o código. Tente novamente.");
    } finally {
      await DatabaseService.closeDB(); // Fecha o banco mesmo se houver erro
      setIsLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Leitor de Código</IonTitle>
          <IonButtons slot="end">
            <IonButton>
              <IonIcon slot="icon-only" icon={cameraOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <BarcodeScannerComponent
          onScan={handleScan}
          onError={(error) => setToastMessage(error.message)}
        />

        {codigoNaoEncontrado && (
          <div className="ion-text-center ion-margin-top">
            <IonText color="medium">
              <p>
                Código <strong>{codigoNaoEncontrado}</strong> não encontrado.
              </p>
              <p>Deseja cadastrar um novo bem?</p>
            </IonText>

            <IonButton
              color="success"
              expand="block"
              onClick={() =>
                history.push(`/cadastrar-bem?br_code=${codigoNaoEncontrado}`)
              }
            >
              <IonIcon icon={addCircleOutline} slot="start" />
              Cadastrar Novo Bem
            </IonButton>
          </div>
        )}

        <IonToast
          isOpen={!!toastMessage}
          message={toastMessage || ""}
          duration={3000}
          onDidDismiss={() => setToastMessage(null)}
          position="top"
        />
      </IonContent>
    </IonPage>
  );
};

export default ScanPage;
