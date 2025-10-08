import { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import {
  IonFabButton,
  IonFab,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonBadge,
  IonChip,
  IonButtons,
  IonMenuButton,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  IonAlert,
  IonToast,
  IonGrid,
  IonRow,
  IonCol,
} from "@ionic/react";
import {
  qrCodeOutline,
  eyeOutline,
  addCircleOutline,
  refreshOutline,
} from "ionicons/icons";
import DatabaseService from "../../services/DatabaseService";
import { IBem } from "../../models";
import "./InventarioPage.css";

const InventarioPage = () => {
  const history = useHistory();
  const [bens, setBens] = useState<IBem[]>([]);
  const [filteredBens, setFilteredBens] = useState<IBem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [bemToDelete, setBemToDelete] = useState<IBem | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    carregarBens();
  }, []);

  useEffect(() => {
    filtrarBens();
  }, [searchText, bens]);

  const carregarBens = async () => {
    try {
      setLoading(true);
      const db = await DatabaseService.getDB();
      const result = await db.query(`
        SELECT b.*, 
               a.nome as ambiente_nome
        FROM BEM b
        LEFT JOIN AMBIENTE a ON b.ambiente_id = a.id_ambiente
        ORDER BY b.descricao_bem
      `);

      setBens(result.values || []);
    } catch (error) {
      console.error("Erro ao carregar bens:", error);
      setToastMessage("Erro ao carregar inventário");
    } finally {
      setLoading(false);
    }
  };

  const filtrarBens = () => {
    let resultado = bens;

    // Filtro por texto de busca
    if (searchText) {
      resultado = resultado.filter(
        (bem) =>
          bem.descricao_bem.toLowerCase().includes(searchText.toLowerCase()) ||
          bem.br_code.toLowerCase().includes(searchText.toLowerCase()) ||
          (bem.numero_patrimonio &&
            bem.numero_patrimonio
              .toLowerCase()
              .includes(searchText.toLowerCase())) ||
          (bem.ambiente_nome &&
            bem.ambiente_nome.toLowerCase().includes(searchText.toLowerCase()))
      );
    }

    setFilteredBens(resultado);
  };

  const handleRefresh = (event: CustomEvent) => {
    carregarBens().then(() => {
      (event.detail as any).complete();
    });
  };

  const confirmarExclusao = (bem: IBem) => {
    setBemToDelete(bem);
    setShowDeleteAlert(true);
  };

  const excluirBem = async () => {
    if (!bemToDelete) return;

    try {
      const db = await DatabaseService.getDB();
      await db.run("DELETE FROM BEM WHERE id_bem = ?", [bemToDelete.id_bem]);

      setToastMessage("Bem excluído com sucesso");
      carregarBens();
    } catch (error) {
      console.error("Erro ao excluir bem:", error);
      setToastMessage("Erro ao excluir bem");
    } finally {
      setShowDeleteAlert(false);
      setBemToDelete(null);
    }
  };

  const formatarData = (data: string) => {
    if (!data) return "N/I";
    return new Date(data).toLocaleDateString("pt-BR");
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Inventário</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
            <IonRefresherContent></IonRefresherContent>
          </IonRefresher>

          <div className="ion-padding">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="skeleton-item">
                <IonSkeletonText animated style={{ width: "60%" }} />
                <IonSkeletonText animated style={{ width: "40%" }} />
                <IonSkeletonText animated style={{ width: "30%" }} />
              </div>
            ))}
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
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Inventário de Bens</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={carregarBens}>
              <IonIcon icon={refreshOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>

        <IonToolbar>
          <IonSearchbar
            value={searchText}
            onIonInput={(e) => setSearchText(e.detail.value!)}
            placeholder="Buscar por descrição, código ou patrimônio"
          />

          <IonGrid>
            <IonRow>
              <IonCol size="8">
                <IonChip color="primary">
                  {filteredBens.length}{" "}
                  {filteredBens.length === 1 ? "item" : "itens"}
                </IonChip>
              </IonCol>
              <IonCol size="4" className="ion-text-end">
                <IonButton
                  fill="clear"
                  size="small"
                  onClick={() => history.push("/cadastrar-bem")}
                >
                  <IonIcon icon={addCircleOutline} slot="start" />
                  Novo
                </IonButton>
              </IonCol>
            </IonRow>
          </IonGrid>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>

        {filteredBens.length === 0 ? (
          <div className="ion-padding ion-text-center">
            <h3>Nenhum bem encontrado</h3>
            <p>
              {bens.length === 0
                ? "Você ainda não possui bens cadastrados no inventário."
                : "Tente ajustar os filtros de busca."}
            </p>
            <IonButton onClick={() => history.push("/cadastrar-bem")}>
              <IonIcon icon={addCircleOutline} slot="start" />
              Cadastrar Primeiro Bem
            </IonButton>
          </div>
        ) : (
          <IonList>
            {filteredBens.map((bem) => (
              <IonItem key={bem.id_bem}>
                <IonLabel>
                  <h2>{bem.descricao_bem}</h2>
                  <p>• {bem.br_code}</p>
                  <p>Patrimônio: {bem.numero_patrimonio || "N/I"}</p>
                  <p>Local: {bem.ambiente_nome || "Não informado"}</p>
                  <p>Aquisição: {formatarData(bem.data_aquisicao || "")}</p>
                </IonLabel>

                <div slot="end" className="item-actions">
                  <IonButton
                    fill="clear"
                    color="primary"
                    onClick={() => history.push(`/bem-detalhe/${bem.id_bem}`)}
                    title="Ver detalhes"
                  >
                    <IonIcon icon={eyeOutline} />
                  </IonButton>
                </div>
              </IonItem>
            ))}
          </IonList>
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => history.push("/scanner")}>
            <IonIcon icon={qrCodeOutline} />
          </IonFabButton>
        </IonFab>
      </IonContent>

      <IonAlert
        isOpen={showDeleteAlert}
        onDidDismiss={() => setShowDeleteAlert(false)}
        header={"Confirmar Exclusão"}
        message={`Tem certeza que deseja excluir o bem "${bemToDelete?.descricao_bem}"?`}
        buttons={[
          { text: "Cancelar", role: "cancel" },
          { text: "Excluir", handler: excluirBem },
        ]}
      />

      <IonToast
        isOpen={!!toastMessage}
        message={toastMessage}
        duration={3000}
        onDidDismiss={() => setToastMessage("")}
      />
    </IonPage>
  );
};

export default InventarioPage;
