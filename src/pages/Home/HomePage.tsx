// src/pages/HomePage.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonSearchbar,
  IonSelect,
  IonList,
  IonItem,
  IonLabel,
  IonFab,
  IonFabButton,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
} from "@ionic/react";
import { add, qrCode, cloudUpload, barcodeOutline } from "ionicons/icons";
import { useHistory } from "react-router-dom";
import DatabaseService from "../../services/DatabaseService";
import { IBem, IFiltroBens, EstadoConservacao } from "../../models";

const HomePage: React.FC = () => {
  const history = useHistory();
  const [bens, setBens] = useState<IBem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [estadoConservacao, setEstadoConservacao] = useState<string[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<EstadoConservacao | "">("");
  const [loading, setLoading] = useState(true);

  // Carregar lista de bens do banco
  const loadBens = useCallback(async () => {
    try {
      setLoading(true);
      const filtros: IFiltroBens = {
        search: searchText,
        estado_conservacao: filtroEstado || undefined,
      };

      const data = await DatabaseService.searchBens(filtros, {
        page: 1,
        pageSize: 50,
      });
      setBens(data.bens);
    } catch (error) {
      console.error("Erro ao carregar bens:", error);
    } finally {
      setLoading(false);
    }
  }, [searchText, filtroEstado]);

  // Carregar filtros dinâmicos do banco
  const loadFiltros = useCallback(async () => {
    try {
      // Usando os valores do enum diretamente
      const estadosDb = Object.values(EstadoConservacao);
      setEstadoConservacao(estadosDb);
    } catch (error) {
      console.error("Erro ao carregar filtros:", error);
    }
  }, []);

  // Função para atualizar ao puxar para recarregar
  const handleRefresh = async (event: CustomEvent) => {
    await Promise.all([loadFiltros(), loadBens()]);
    (event.detail as any).complete();
  };

  useEffect(() => {
    const initializeData = async () => {
      await loadFiltros();
      await loadBens();
    };
    initializeData();
  }, []);

  // Recarregar quando os filtros mudarem
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadBens();
    }, 300); // Debounce para evitar muitas requisições

    return () => clearTimeout(timeoutId);
  }, [searchText, filtroEstado, loadBens]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>PatriScan</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => history.push("/inventario")}>
              <IonIcon icon={barcodeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>

        {/* Busca */}
        <IonSearchbar
          placeholder="Buscar por patrimônio, descrição ou código..."
          value={searchText}
          onIonInput={(e) => setSearchText(e.detail.value!)}
          debounce={300}
        />

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <IonSpinner />
          </div>
        )}

        {/* Lista de bens */}
        {!loading && (
          <IonList>
            {bens.length === 0 ? (
              <IonItem>
                <IonLabel className="ion-text-center">
                  <h2>Nenhum bem encontrado</h2>
                  <p>Tente ajustar os filtros de busca</p>
                </IonLabel>
              </IonItem>
            ) : (
              bens.map((bem) => (
                <IonItem
                  key={bem.id_bem}
                  button
                  onClick={() => history.push(`/bem/${bem.id_bem}`)}
                >
                  <IonLabel>
                    <h2>{bem.numero_patrimonio}</h2>
                    <p>{bem.descricao_bem}</p>
                    <small>
                      {bem.classificacao} - {bem.estado_conservacao || "N/D"}
                      {bem.conferido && " ✓"}
                    </small>
                  </IonLabel>
                </IonItem>
              ))
            )}
          </IonList>
        )}

        {/* Botões flutuantes */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => history.push("/scanner")}>
            <IonIcon icon={qrCode} />
          </IonFabButton>
        </IonFab>

        <IonFab vertical="bottom" horizontal="start" slot="fixed">
          <IonFabButton onClick={() => history.push("/importacao")}>
            <IonIcon icon={cloudUpload} />
          </IonFabButton>
        </IonFab>

        <IonFab vertical="bottom" horizontal="center" slot="fixed">
          <IonFabButton onClick={() => history.push("/cadastrar-bem")}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};

export default HomePage;
