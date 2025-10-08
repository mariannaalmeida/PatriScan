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
  IonList,
  IonItem,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonCard,
  IonCardContent,
  IonRow,
  IonCol,
  IonGrid,
  IonAccordion,
  IonAccordionGroup,
  IonBadge,
  IonChip,
  IonProgressBar,
} from "@ionic/react";
import {
  add,
  qrCode,
  cloudUpload,
  barcodeOutline,
  calendar,
  person,
  search,
} from "ionicons/icons";
import { useHistory } from "react-router-dom";
import DatabaseService from "../../services/DatabaseService";
import { IBem, IFiltroBens, IInventario } from "../../models";

const HomePage: React.FC = () => {
  const history = useHistory();
  const [bens, setBens] = useState<IBem[]>([]);
  const [inventarios, setInventarios] = useState<
    { ano: number; inventarios: IInventario[] }[]
  >([]);
  const [filteredInventarios, setFilteredInventarios] = useState<
    { ano: number; inventarios: IInventario[] }[]
  >([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [inventariosLoading, setInventariosLoading] = useState(true);

  // Carregar lista de bens do banco
  const loadBens = useCallback(async () => {
    try {
      setLoading(true);
      const filtros: IFiltroBens = {
        search: searchText,
      };

      const data = await DatabaseService.searchBens(filtros, {
        page: 1,
        pageSize: 5, // Reduzindo ainda mais para uma visualização mais compacta
      });
      setBens(data.bens);
    } catch (error) {
      console.error("Erro ao carregar bens:", error);
    } finally {
      setLoading(false);
    }
  }, [searchText]);

  // Carregar lista de inventários
  const loadInventarios = useCallback(async () => {
    try {
      setInventariosLoading(true);
      const data = await DatabaseService.getInventarios();

      // Agrupar inventários por ano
      const inventariosPorAno = data.reduce(
        (acc: Record<number, IInventario[]>, inventario) => {
          const ano = inventario.ano;
          if (!acc[ano]) {
            acc[ano] = [];
          }
          acc[ano].push(inventario);
          return acc;
        },
        {}
      );

      // Transformar em array para renderização
      const inventariosAgrupados = Object.entries(inventariosPorAno)
        .sort(
          ([anoA], [anoB]) =>
            parseInt(anoB as string) - parseInt(anoA as string)
        )
        .map(([ano, inventarios]) => ({
          ano: parseInt(ano),
          inventarios: inventarios.sort(
            (a, b) =>
              new Date(b.data_inicio).getTime() -
              new Date(a.data_inicio).getTime()
          ),
        }));

      setInventarios(inventariosAgrupados);
      setFilteredInventarios(inventariosAgrupados);
    } catch (error) {
      console.error("Erro ao carregar inventários:", error);
    } finally {
      setInventariosLoading(false);
    }
  }, []);

  // Filtrar inventários por ano baseado no texto de busca
  useEffect(() => {
    if (!searchText) {
      setFilteredInventarios(inventarios);
    } else {
      const filtered = inventarios
        .map((grupo) => ({
          ...grupo,
          inventarios: grupo.inventarios.filter((inv) =>
            inv.ano.toString().includes(searchText)
          ),
        }))
        .filter((grupo) => grupo.inventarios.length > 0);

      setFilteredInventarios(filtered);
    }
  }, [searchText, inventarios]);

  // Função para atualizar ao puxar para recarregar
  const handleRefresh = async (event: CustomEvent) => {
    await Promise.all([loadInventarios(), loadBens()]);
    (event.detail as any).complete();
  };

  useEffect(() => {
    const initializeData = async () => {
      await loadInventarios();
      await loadBens();
    };
    initializeData();
  }, []);

  // Recarregar quando os filtros mudarem
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadBens();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchText, loadBens]);

  // Função para formatar data
  const formatarData = (dataString: string) => {
    return new Date(dataString).toLocaleDateString("pt-BR");
  };

  // Função para obter status do inventário
  const getStatusInventario = (inventario: IInventario) => {
    const hoje = new Date();
    const dataFim = inventario.data_fim ? new Date(inventario.data_fim) : null;

    if (dataFim && hoje > dataFim) {
      return { texto: "Concluído", cor: "success" };
    } else {
      return { texto: "Em Andamento", cor: "warning" };
    }
  };

  // Calcular percentual de conclusão
  const calcularPercentualConclusao = (inventario: IInventario) => {
    if (inventario.total_bens && inventario.bens_conferidos !== undefined) {
      return inventario.total_bens > 0
        ? Math.round((inventario.bens_conferidos / inventario.total_bens) * 100)
        : 0;
    }
    return 0;
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>PatriScan</IonTitle>
          <IonButtons slot="end">
            <IonButton>
              <IonIcon icon={barcodeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>

        {/* Busca por ano de inventário */}
        <div style={{ padding: "0 16px", paddingTop: "16px" }}>
          <IonSearchbar
            placeholder="Buscar inventário por ano..."
            value={searchText}
            onIonInput={(e) => setSearchText(e.detail.value!)}
            debounce={300}
          />
        </div>

        {/* Seção de Inventários por Ano */}
        <div style={{ padding: "0 16px" }}>
          <h2
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "0",
            }}
          >
            <IonIcon icon={calendar} color="primary" />
            Inventários por Ano
          </h2>

          {inventariosLoading ? (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <IonSpinner />
            </div>
          ) : filteredInventarios.length === 0 ? (
            <IonCard>
              <IonCardContent style={{ textAlign: "center" }}>
                {searchText ? (
                  <>
                    <IonIcon icon={search} size="large" color="medium" />
                    <p>Nenhum inventário encontrado para o ano {searchText}</p>
                    <IonButton fill="clear" onClick={() => setSearchText("")}>
                      Limpar busca
                    </IonButton>
                  </>
                ) : (
                  <>
                    <p>Nenhum inventário encontrado</p>
                    <IonButton onClick={() => history.push("/inventario")}>
                      Novo Inventário
                    </IonButton>
                    <IonButton onClick={() => history.push("/importacao")}>
                      Importar Dados
                    </IonButton>
                  </>
                )}
              </IonCardContent>
            </IonCard>
          ) : (
            <IonAccordionGroup>
              {filteredInventarios.map((grupo) => (
                <IonAccordion value={grupo.ano.toString()} key={grupo.ano}>
                  <IonItem slot="header" color="light">
                    <IonLabel>
                      <h2 style={{ fontWeight: "bold" }}>
                        Inventário {grupo.ano}
                      </h2>
                      <p>{grupo.inventarios.length} período(s) de inventário</p>
                    </IonLabel>
                    <IonBadge slot="end" color="primary">
                      {grupo.ano}
                    </IonBadge>
                  </IonItem>

                  <div slot="content">
                    {grupo.inventarios.map((inventario) => {
                      const status = getStatusInventario(inventario);
                      const percentualConclusao =
                        calcularPercentualConclusao(inventario);

                      return (
                        <IonCard
                          key={inventario.id_inventario}
                          button
                          onClick={() =>
                            history.push(
                              `/inventario/${inventario.id_inventario}`
                            )
                          }
                          style={{ margin: "10px 0" }}
                        >
                          <IonCardContent>
                            <h3 style={{ marginTop: "0" }}>
                              <strong>Período: </strong>
                              {formatarData(inventario.data_inicio)}
                              {inventario.data_fim &&
                                ` - ${formatarData(inventario.data_fim)}`}
                            </h3>

                            {/* Barra de progresso */}
                            {inventario.total_bens !== undefined && (
                              <div style={{ marginTop: "15px" }}>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    fontSize: "0.9rem",
                                    marginBottom: "5px",
                                  }}
                                >
                                  <span>
                                    <strong>Progresso: </strong>
                                    {percentualConclusao}%
                                  </span>
                                  <span>
                                    {inventario.bens_conferidos || 0}/
                                    {inventario.total_bens} bens
                                  </span>
                                </div>
                                <IonProgressBar
                                  value={percentualConclusao / 100}
                                  color={
                                    percentualConclusao === 100
                                      ? "success"
                                      : "primary"
                                  }
                                />
                              </div>
                            )}

                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                                marginTop: "15px",
                                flexWrap: "wrap",
                              }}
                            >
                              <IonChip color={status.cor as any}>
                                {status.texto}
                              </IonChip>

                              {inventario.id_servidor_responsavel && (
                                <IonChip color="medium">
                                  <IonIcon icon={person} />
                                  <IonLabel>Responsável</IonLabel>
                                </IonChip>
                              )}
                            </div>
                          </IonCardContent>
                        </IonCard>
                      );
                    })}
                  </div>
                </IonAccordion>
              ))}
            </IonAccordionGroup>
          )}
        </div>

        {/* Seção de Bens Recentes (apenas se não houver busca ativa) */}
        {!searchText && (
          <div style={{ padding: "16px" }}>
            <h2>Bens Recentes</h2>

            {loading ? (
              <div style={{ textAlign: "center", padding: "10px" }}>
                <IonSpinner />
              </div>
            ) : (
              <IonList style={{ borderRadius: "10px", overflow: "hidden" }}>
                {bens.length === 0 ? (
                  <IonItem>
                    <IonLabel className="ion-text-center">
                      <p>Nenhum bem recente</p>
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
                        <h3 style={{ fontWeight: "500" }}>
                          {bem.numero_patrimonio}
                        </h3>
                        <p>{bem.descricao_bem}</p>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            marginTop: "5px",
                          }}
                        >
                          <IonChip color="medium">{bem.classificacao}</IonChip>
                          {bem.conferido && (
                            <IonChip color="success">Conferido</IonChip>
                          )}
                        </div>
                      </IonLabel>
                    </IonItem>
                  ))
                )}
              </IonList>
            )}
          </div>
        )}

        {/* Cards de ação fixos na parte inferior */}
        <div
          style={{
            position: "sticky",
            bottom: 0,
            zIndex: 10,
            background: "var(--ion-background-color)",
            padding: "10px",
            borderTop: "1px solid var(--ion-border-color)",
          }}
        >
          <IonGrid>
            <IonRow className="ion-justify-content-center">
              <IonCol size="12" sizeMd="8" sizeLg="6">
                <IonRow>
                  <IonCol size="4">
                    <IonCard
                      button
                      onClick={() => history.push("/importacao")}
                      style={{ textAlign: "center", margin: 0 }}
                    >
                      <IonCardContent style={{ padding: "8px" }}>
                        <IonIcon icon={cloudUpload} size="small" />
                        <div style={{ fontSize: "0.75rem", marginTop: "3px" }}>
                          Importar
                        </div>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                  <IonCol size="4">
                    <IonCard
                      button
                      onClick={() => history.push("/cadastrar-bem")}
                      style={{ textAlign: "center", margin: 0 }}
                      color="primary"
                    >
                      <IonCardContent style={{ padding: "8px" }}>
                        <IonIcon icon={add} size="small" />
                        <div style={{ fontSize: "0.75rem", marginTop: "3px" }}>
                          Novo Bem
                        </div>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                  <IonCol size="4">
                    <IonCard
                      button
                      onClick={() => history.push("/scanner")}
                      style={{ textAlign: "center", margin: 0 }}
                    >
                      <IonCardContent style={{ padding: "8px" }}>
                        <IonIcon icon={qrCode} size="small" />
                        <div style={{ fontSize: "0.75rem", marginTop: "3px" }}>
                          Escanear
                        </div>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                </IonRow>
              </IonCol>
            </IonRow>
          </IonGrid>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default HomePage;
