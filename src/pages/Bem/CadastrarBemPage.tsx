import { useState, useEffect } from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
  IonText,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonToast,
  IonLoading,
  IonAlert,
  IonChip,
  IonGrid,
  IonRow,
  IonCol,
} from "@ionic/react";
import {
  arrowBackOutline,
  saveOutline,
  qrCodeOutline,
  closeCircleOutline,
} from "ionicons/icons";
import DatabaseService from "../../services/DatabaseService";

const CadastrarBemPage = () => {
  const history = useHistory();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const br_codeFromQuery = queryParams.get("br_code");

  const [formData, setFormData] = useState({
    br_code: br_codeFromQuery || "",
    descricao: "",
    localizacao: "",
    data_aquisicao: new Date().toISOString().split("T")[0],
    status: "ATIVO",
  });

  const [loading, setLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [scannedCode, setScannedCode] = useState(br_codeFromQuery || "");

  // Atualiza o código quando recebido via query params
  useEffect(() => {
    if (br_codeFromQuery) {
      setFormData((prev) => ({ ...prev, br_code: br_codeFromQuery }));
      setScannedCode(br_codeFromQuery);
    }
  }, [br_codeFromQuery]);

  const handleInputChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const validateForm = () => {
    if (!formData.br_code.trim()) {
      setAlertMessage("Código do bem é obrigatório");
      setShowAlert(true);
      return false;
    }

    if (formData.br_code.length < 3) {
      setAlertMessage("Código do bem deve ter pelo menos 3 caracteres");
      setShowAlert(true);
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await DatabaseService.initialize();
      const db = await DatabaseService.getDB();

      // Verifica se código já existe
      const checkResult = await db.query(
        "SELECT 1 FROM BEM WHERE br_code = ? LIMIT 1",
        [formData.br_code]
      );

      if ((checkResult.values ?? []).length > 0) {
        setAlertMessage("Já existe um bem cadastrado com este código");
        setShowAlert(true);
        return;
      }

      // Insere novo bem
      await db.run(
        `INSERT INTO BEM 
        (br_code, descricao, localizacao, data_aquisicao, status)
        VALUES (?, ?, ?, ?, ?)`,
        [
          formData.br_code,
          formData.descricao,
          formData.localizacao,
          formData.data_aquisicao,
          formData.status,
        ]
      );

      setSuccess(true);
      setTimeout(() => history.push("/"), 1500);
    } catch (err) {
      console.error("Erro ao cadastrar bem:", err);
      setAlertMessage("Erro ao cadastrar bem. Tente novamente.");
      setShowAlert(true);
    } finally {
      setLoading(false);
      await DatabaseService.closeDB();
    }
  };

  const handleScanButtonClick = () => {
    // Redireciona para o scanner e retorna com o código escaneado
    history.push("/scanner?returnUrl=/cadastrar-bem");
  };

  const clearScannedCode = () => {
    setFormData({ ...formData, br_code: "" });
    setScannedCode("");
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.goBack()}>
              <IonIcon icon={arrowBackOutline} />
            </IonButton>
          </IonButtons>
          <IonTitle>Cadastrar Bem</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleSubmit} disabled={loading}>
              <IonIcon icon={saveOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonGrid>
          <IonRow>
            <IonCol>
              <h2>Informações do Bem</h2>
              <p className="ion-text-muted">
                Preencha os dados do novo bem patrimonial
              </p>
            </IonCol>
          </IonRow>
        </IonGrid>

        <IonItem className="ion-margin-bottom" lines="full">
          <IonLabel position="stacked">
            Código do Bem <IonText color="danger">*</IonText>
          </IonLabel>
          <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
            <IonInput
              value={formData.br_code}
              onIonChange={(e) => handleInputChange("br_code", e.detail.value!)}
              placeholder="Digite ou escaneie o código"
              required
              style={{ flex: 1, marginRight: "8px" }}
            />
            {formData.br_code ? (
              <IonButton
                fill="clear"
                color="medium"
                onClick={clearScannedCode}
                title="Limpar código"
              >
                <IonIcon icon={closeCircleOutline} />
              </IonButton>
            ) : (
              <IonButton
                fill="solid"
                color="primary"
                onClick={handleScanButtonClick}
                title="Escanear código"
              >
                <IonIcon icon={qrCodeOutline} />
              </IonButton>
            )}
          </div>
        </IonItem>

        {scannedCode && (
          <IonChip color="success" className="ion-margin-bottom">
            <IonIcon icon={qrCodeOutline} />
            <IonLabel>Código escaneado: {scannedCode}</IonLabel>
          </IonChip>
        )}

        <IonItem className="ion-margin-bottom">
          <IonLabel position="stacked">Descrição</IonLabel>
          <IonInput
            value={formData.descricao}
            onIonChange={(e) => handleInputChange("descricao", e.detail.value!)}
            placeholder="Descrição do bem"
          />
        </IonItem>

        <IonItem className="ion-margin-bottom">
          <IonLabel position="stacked">Localização</IonLabel>
          <IonInput
            value={formData.localizacao}
            onIonChange={(e) =>
              handleInputChange("localizacao", e.detail.value!)
            }
            placeholder="Onde o bem está localizado"
          />
        </IonItem>

        <IonItem className="ion-margin-bottom">
          <IonLabel position="stacked">Data de Aquisição</IonLabel>
          <IonInput
            type="date"
            value={formData.data_aquisicao}
            onIonChange={(e) =>
              handleInputChange("data_aquisicao", e.detail.value!)
            }
          />
        </IonItem>

        <IonButton
          expand="block"
          onClick={handleSubmit}
          className="ion-margin-top"
          disabled={loading}
        >
          <IonIcon icon={saveOutline} slot="start" />
          {loading ? "Salvando..." : "Salvar Bem"}
        </IonButton>

        <IonButton
          expand="block"
          color="light"
          onClick={handleScanButtonClick}
          className="ion-margin-top"
        >
          <IonIcon icon={qrCodeOutline} slot="start" />
          Escanear Código
        </IonButton>
      </IonContent>

      <IonLoading isOpen={loading} message="Salvando..." />

      <IonAlert
        isOpen={showAlert}
        onDidDismiss={() => setShowAlert(false)}
        header="Atenção"
        message={alertMessage}
        buttons={["OK"]}
      />

      <IonToast
        isOpen={success}
        message="Bem cadastrado com sucesso!"
        duration={1500}
        color="success"
      />
    </IonPage>
  );
};

export default CadastrarBemPage;
