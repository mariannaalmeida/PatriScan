import { useEffect, useState } from "react";
import { useParams, useHistory } from "react-router-dom";
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
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonLoading,
  IonToast,
  IonChip,
  IonGrid,
  IonRow,
  IonCol,
  IonAlert,
} from "@ionic/react";
import {
  arrowBackOutline,
  pencilOutline,
  qrCodeOutline,
  locationOutline,
  calendarOutline,
  cashOutline,
  documentOutline,
  refreshOutline,
} from "ionicons/icons";
import { IBem } from "../../models/bem";
import DatabaseService from "../../services/DatabaseService";

const BemDetalhePage = () => {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const [bem, setBem] = useState<IBem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  useEffect(() => {
    carregarBem();
  }, [id]);

  const carregarBem = async () => {
    try {
      setLoading(true);
      setError(null);

      const db = await DatabaseService.getDB();
      const result = await db.query(
        `SELECT b.*, 
                a.nome as ambiente_nome,
         FROM BEM b
         LEFT JOIN AMBIENTE a ON b.ambiente_id = a.id_ambiente
         WHERE b.id_bem = ? LIMIT 1`,
        [id]
      );

      const values = result.values ?? [];

      if (values.length > 0) {
        setBem(values[0]);
      } else {
        setError("Bem não encontrado");
      }
    } catch (err) {
      console.error("Erro ao carregar bem:", err);
      setError("Erro ao carregar dados do bem");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      const db = await DatabaseService.getDB();
      await db.run("DELETE FROM BEM WHERE id_bem = ?", [id]);

      setError("Bem excluído com sucesso");
      setTimeout(() => {
        history.push("/");
      }, 1500);
    } catch (err) {
      console.error("Erro ao excluir bem:", err);
      setError("Erro ao excluir bem");
    } finally {
      setLoading(false);
      setShowDeleteAlert(false);
    }
  };

  const handleEscanearNovamente = () => {
    history.push("/scanner");
  };

  const formatarData = (data: string) => {
    if (!data) return "Não informada";
    return new Date(data).toLocaleDateString("pt-BR");
  };

  const formatarValor = (valor: number) => {
    if (!valor) return "Não informado";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  if (loading && !bem) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonButton onClick={() => history.goBack()}>
                <IonIcon icon={arrowBackOutline} />
              </IonButton>
            </IonButtons>
            <IonTitle>Detalhes do Bem</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div className="ion-text-center">
            <IonLoading isOpen={true} message="Carregando..." />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (error && !bem) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonButton onClick={() => history.goBack()}>
                <IonIcon icon={arrowBackOutline} />
              </IonButton>
            </IonButtons>
            <IonTitle>Detalhes do Bem</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div className="ion-text-center">
            <IonText color="danger">
              <h2>{error}</h2>
            </IonText>
            <IonButton expand="block" onClick={() => history.goBack()}>
              Voltar
            </IonButton>
            <IonButton
              expand="block"
              fill="outline"
              onClick={carregarBem}
              className="ion-margin-top"
            >
              <IonIcon icon={refreshOutline} slot="start" />
              Tentar Novamente
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.goBack()}>
              <IonIcon icon={arrowBackOutline} />
            </IonButton>
          </IonButtons>
          <IonTitle>Detalhes do Bem</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => history.push(`/editar-bem/${id}`)}>
              <IonIcon icon={pencilOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonCard>
          <IonCardHeader>
            <div className="ion-text-center">
              <IonChip color="primary">
                <IonIcon icon={qrCodeOutline} />
                <IonLabel>{bem?.br_code}</IonLabel>
              </IonChip>
            </div>
            <IonCardTitle className="ion-text-center">
              {bem?.descricao_bem}
            </IonCardTitle>
            <IonCardSubtitle className="ion-text-center">
              Patrimônio: {bem?.numero_patrimonio || "Não informado"}
            </IonCardSubtitle>
          </IonCardHeader>

          <IonCardContent>
            <IonList lines="full">
              <IonItem>
                <IonIcon icon={documentOutline} slot="start" color="primary" />
                <IonLabel>
                  <h3>Classificação</h3>
                  <p>{bem?.classificacao || "Não informada"}</p>
                </IonLabel>
              </IonItem>

              <IonItem>
                <IonIcon
                  icon={locationOutline}
                  slot="start"
                  color="secondary"
                />
                <IonLabel>
                  <h3>Localização</h3>
                  <p>{bem?.ambiente_nome || "Não informada"}</p>
                </IonLabel>
              </IonItem>

              <IonItem>
                <IonIcon icon={calendarOutline} slot="start" color="success" />
                <IonLabel>
                  <h3>Data de Aquisição</h3>
                  <p>{formatarData(bem?.data_aquisicao || "")}</p>
                </IonLabel>
              </IonItem>

              <IonItem>
                <IonIcon icon={cashOutline} slot="start" color="warning" />
                <IonLabel>
                  <h3>Valor de Aquisição</h3>
                  <p>{formatarValor(bem?.valor_aquisicao || 0)}</p>
                </IonLabel>
              </IonItem>
            </IonList>
          </IonCardContent>
        </IonCard>

        <IonGrid>
          <IonRow>
            <IonCol>
              <IonButton
                expand="block"
                onClick={() => history.push(`/editar-bem/${id}`)}
                className="ion-margin-horizontal"
              >
                <IonIcon icon={pencilOutline} slot="start" />
                Editar Bem
              </IonButton>
            </IonCol>
            <IonCol>
              <IonButton
                expand="block"
                fill="outline"
                color="medium"
                onClick={handleEscanearNovamente}
                className="ion-margin-horizontal"
              >
                <IonIcon icon={qrCodeOutline} slot="start" />
                Escanear Novo
              </IonButton>
            </IonCol>
          </IonRow>
          <IonRow>
            <IonCol>
              <IonButton
                expand="block"
                fill="clear"
                color="danger"
                onClick={() => setShowDeleteAlert(true)}
                className="ion-margin-horizontal"
              >
                Excluir Bem
              </IonButton>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>

      <IonLoading isOpen={loading} message="Processando..." />

      <IonToast
        isOpen={!!error}
        message={error || ""}
        duration={3000}
        onDidDismiss={() => setError(null)}
        color={error?.includes("sucesso") ? "success" : "danger"}
      />

      <IonAlert
        isOpen={showDeleteAlert}
        onDidDismiss={() => setShowDeleteAlert(false)}
        header={"Confirmar Exclusão"}
        message={
          "Tem certeza que deseja excluir este bem? Esta ação não pode ser desfeita."
        }
        buttons={[
          {
            text: "Cancelar",
            role: "cancel",
          },
          {
            text: "Excluir",
            handler: handleDelete,
          },
        ]}
      />
    </IonPage>
  );
};

export default BemDetalhePage;
