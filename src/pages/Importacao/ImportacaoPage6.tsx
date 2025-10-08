import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonText,
  IonProgressBar,
  IonIcon,
  IonAlert,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonToast,
  IonList,
  IonItem,
  IonLabel,
  IonChip,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonButtons,
} from "@ionic/react";
import { useState, useEffect, useCallback } from "react";
import {
  IBem,
  IBensResult,
  EstadoConservacao,
  IFiltroBens,
  IPaginacao,
} from "../../models";
import DatabaseService from "../../services/DatabaseService";
import {
  cloudUploadOutline,
  documentTextOutline,
  checkmarkCircleOutline,
  listOutline,
  filterOutline,
  refreshOutline,
} from "ionicons/icons";
import { FilePicker } from "@capawesome/capacitor-file-picker";
import * as pdfjsLib from "pdfjs-dist";
import Papa from "papaparse";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";
import { ImportResult } from "../../components/ImportResult";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const ITENS_POR_PAGINA = 20;

const ESTADO_CONSERVACAO_OPTIONS = [
  { value: EstadoConservacao.EXCELENTE, label: "Excelente" },
  { value: EstadoConservacao.BOM, label: "Bom" },
  { value: EstadoConservacao.REGULAR, label: "Regular" },
  { value: EstadoConservacao.PESSIMO, label: "Péssimo" },
];

interface ImportError {
  linha: number;
  patrimonio: string;
  erros: string[];
}

const ImportacaoPage = () => {
  const [fileInfo, setFileInfo] = useState<{
    name: string;
    size: string;
  } | null>(null);
  const [importStatus, setImportStatus] = useState({
    errors: [] as ImportError[],
    success: 0,
    isImporting: false,
    parsedCount: 0,
  });
  const [showConfirm, setShowConfirm] = useState(false);
  const [showToast, setShowToast] = useState({ show: false, message: "" });
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [bensResult, setBensResult] = useState<IBensResult>({
    bens: [],
    total: 0,
    hasMore: false,
  });
  const [filtros, setFiltros] = useState<IFiltroBens>({});
  const [paginacao, setPaginacao] = useState<IPaginacao>({
    page: 1,
    pageSize: ITENS_POR_PAGINA,
  });
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const carregarBens = useCallback(
    async (page = 1, filtrosParaBusca: IFiltroBens = {}) => {
      try {
        setCarregando(true);
        const resultado = await DatabaseService.getBensFiltrados(
          filtrosParaBusca,
          { page, pageSize: paginacao.pageSize }
        );
        if (page === 1) {
          setBensResult(resultado);
        } else {
          setBensResult((prev) => ({
            ...resultado,
            bens: [...prev.bens, ...resultado.bens],
          }));
        }
        setPaginacao((prev) => ({ ...prev, page }));
      } catch (error) {
        console.error("Erro ao carregar bens:", error);
        showToastMessage("Erro ao carregar lista de bens");
        setBensResult({ bens: [], total: 0, hasMore: false });
      } finally {
        setCarregando(false);
      }
    },
    [paginacao.pageSize]
  );

  useEffect(() => {
    const filtrosAtuais = { ...filtros };
    if (busca) {
      filtrosAtuais.search = busca;
    }
    carregarBens(1, filtrosAtuais);
  }, [filtros, busca, carregarBens]);

  const showToastMessage = (msg: string) => {
    setShowToast({ show: true, message: msg });
  };

  // --- Funções de Processamento de Arquivo ---

  const handleFilePick = async () => {
    try {
      const result = await FilePicker.pickFiles({
        types: ["application/pdf", "text/csv"],
        readData: true,
      });
      if (!result.files.length) return;
      const file = result.files[0];
      setFileInfo({ name: file.name, size: formatFileSize(file.size) });
      setImportStatus({
        errors: [],
        success: 0,
        parsedCount: 0,
        isImporting: true,
      });
      await processFile(file);
    } catch (error) {
      console.error("Erro ao selecionar arquivo:", error);
      showToastMessage("Erro ao selecionar arquivo");
    }
  };

  const processFile = async (file: any) => {
    try {
      if (file.mimeType === "text/csv" || file.name.endsWith(".csv")) {
        await processCsvFile(file);
      } else {
        throw new Error("Formato de arquivo não suportado. Use CSV.");
      }
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      showToastMessage((error as Error).message || "Erro ao processar arquivo");
    } finally {
      setImportStatus((prev) => ({ ...prev, isImporting: false }));
    }
  };

  const processCsvFile = async (file: any) => {
    try {
      const csvText = atob(file.data);
      const firstLine = csvText.split("\n")[0];
      const delimiter = firstLine.includes(";") ? ";" : ",";

      const result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        delimiter: delimiter,
        transformHeader: (header) => header.trim(),
      });

      if (result.errors.length > 0) {
        // ... (tratamento de erro)
        return;
      }

      console.log("CSV parseado:", result.data);
      setParsedRows(result.data);
      setImportStatus((prev) => ({ ...prev, parsedCount: result.data.length }));
      setShowConfirm(true);
    } catch (error) {
      console.error("Erro ao processar CSV:", error);
      showToastMessage("Erro ao processar arquivo CSV");
    }
  };

  // --- Funções de Transformação e Validação de Dados ---

  const parseDate = (dateStr: string): string => {
    if (!dateStr || typeof dateStr !== "string") return "";
    try {
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split("/");
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
    } catch (error) {
      console.warn("Erro ao parsear data:", dateStr, error);
    }
    return "";
  };

  const determineEstadoConservacao = (
    conservacao: string
  ): EstadoConservacao => {
    if (!conservacao) return EstadoConservacao.BOM;
    const lowerConservacao = conservacao.toLowerCase();
    if (lowerConservacao.includes("excelente"))
      return EstadoConservacao.EXCELENTE;
    if (lowerConservacao.includes("bom")) return EstadoConservacao.BOM;
    if (lowerConservacao.includes("regular")) return EstadoConservacao.REGULAR;
    if (
      lowerConservacao.includes("péssimo") ||
      lowerConservacao.includes("pessimo")
    )
      return EstadoConservacao.PESSIMO;
    return EstadoConservacao.BOM;
  };

  const transformToBemModel = (row: any): IBem => {
    const descricao = row["DESCRIÇÃO DO BEM"] || "";
    const dateMatch = descricao.match(/(\d{2}\/\d{2}\/\d{4})$/);
    let dataAquisicao = dateMatch
      ? parseDate(dateMatch[1])
      : parseDate(row["DATA AQU"]);

    return {
      classificacao: row["CLASS"]?.toString() || "",
      numero_patrimonio: row["CÓD BEM"]?.toString().trim() || "",
      descricao_bem: descricao.trim(),
      ambiente_nome: "INDEFINIDO",
      data_aquisicao: dataAquisicao || new Date().toISOString().split("T")[0],
      nota_fiscal: row["NOTA FIS"]?.toString() || "",
      empenho_siafi: row["EMPENHO"]?.toString() || "",
      valor_aquisicao: parseCurrency(row["VALOR"]?.toString() || "0"),
      estado_conservacao: determineEstadoConservacao(row["CONSERVAÇÃO"]),
      br_code: `PAT-${row["CÓD BEM"] || "SEM-CODIGO"}`,
      conferido: false,
      id_servidor_responsavel: 1, // IDs devem ser dinâmicos no futuro
      id_ambiente_atual: 1, // IDs devem ser dinâmicos no futuro
    };
  };

  // --- Ação de Importação ---

  const startImport = async () => {
    setShowConfirm(false);
    setImportStatus((prev) => ({ ...prev, isImporting: true, success: 0 }));
    try {
      // **1. FILTRAR DADOS INVÁLIDOS ANTES DE TRANSFORMAR**
      const validRows = parsedRows.filter(
        (row) => row["CÓD BEM"] && row["CÓD BEM"].toString().trim() !== ""
      );

      if (validRows.length !== parsedRows.length) {
        const skippedCount = parsedRows.length - validRows.length;
        showToastMessage(
          `${skippedCount} item(ns) ignorado(s) por falta de 'CÓD BEM'.`
        );
      }

      const bens: IBem[] = validRows.map(transformToBemModel);

      // **2. LOG DE DEPURAÇÃO CRÍTICO**
      console.log("Enviando para o banco de dados:", bens);

      if (bens.length > 0) {
        await DatabaseService.importBens(bens);
      }

      // 3. Limpa os filtros e recarrega a lista
      setFiltros({});
      setBusca("");
      await carregarBens(1, {});

      setImportStatus((prev) => ({
        ...prev,
        isImporting: false,
        success: bens.length,
        parsedCount: 0,
      }));
      showToastMessage("Importação concluída com sucesso!");
    } catch (error) {
      console.error("Erro ao importar:", error);
      showToastMessage("Erro na importação dos bens");
      setImportStatus((prev) => ({ ...prev, isImporting: false }));
    }
  };

  // --- Funções Auxiliares e de Paginação ---

  const carregarProximaPagina = async (event: CustomEvent<void>) => {
    if (bensResult.hasMore && !carregando) {
      const filtrosAtuais = { ...filtros };
      if (busca) {
        filtrosAtuais.search = busca;
      }
      await carregarBens(paginacao.page + 1, filtrosAtuais);
    }
    (event.target as HTMLIonInfiniteScrollElement).complete();
  };

  const aplicarFiltro = (novoFiltro: Partial<IFiltroBens>) => {
    setFiltros((prev) => ({ ...prev, ...novoFiltro }));
    setPaginacao((prev) => ({ ...prev, page: 1 }));
  };

  const limparFiltros = () => {
    setFiltros({});
    setBusca("");
    setPaginacao((prev) => ({ ...prev, page: 1 }));
  };

  const formatFileSize = (bytes: number) =>
    bytes < 1024
      ? `${bytes} bytes`
      : bytes < 1048576
        ? `${(bytes / 1024).toFixed(1)} KB`
        : `${(bytes / 1048576).toFixed(1)} MB`;

  const parseCurrency = (value: string) =>
    parseFloat(value.replace(/[^\d,.-]/g, "").replace(",", ".") || "0");

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);

  const formatEstadoConservacao = (estado: EstadoConservacao) =>
    ESTADO_CONSERVACAO_OPTIONS.find((o) => o.value === estado)?.label ||
    "Desconhecido";

  // --- JSX de Renderização ---

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton routerLink="/home">
              <IonIcon icon={listOutline} />
            </IonButton>
          </IonButtons>
          <IonTitle>Importação de Bens</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonGrid>
          <IonRow>
            <IonCol>
              <IonButton
                expand="block"
                onClick={handleFilePick}
                disabled={importStatus.isImporting}
              >
                <IonIcon icon={cloudUploadOutline} slot="start" /> Selecionar
                Arquivo (CSV)
              </IonButton>
            </IonCol>
          </IonRow>

          {/* BOTÃO DE TESTE - ADICIONE AQUI */}
          <IonRow>
            <IonCol>
              <IonButton
                expand="block"
                color="secondary"
                onClick={() => {
                  // Dados de exemplo do seu CSV para teste
                  const testData = [
                    {
                      SEQ: "1.0",
                      CLASS: "123110303.0",
                      "CÓD BEM": "3504.0",
                      "DESCRIÇÃO DO BEM":
                        'CADEIRA FIXA COR AZUL, MARCA ALLFLEX, BASE EM AÇO FORMATO "U" C04/03/2008',
                      "DATA AQU": "",
                      "DATA DES": "",
                      CONSERVAÇÃO: "Bom",
                      "NOTA FIS": "2508",
                      EMPENHO: "902188.0",
                      VALOR: "145.0",
                    },
                    {
                      SEQ: "2.0",
                      CLASS: "123110303.0",
                      "CÓD BEM": "3582.0",
                      "DESCRIÇÃO DO BEM":
                        'CADEIRA FIXA COR PRETA, MARCA ALLFLEX, BASE EM AÇO FORMATO "U0" 4/03/2008',
                      "DATA AQU": "",
                      "DATA DES": "",
                      CONSERVAÇÃO: "Bom",
                      "NOTA FIS": "2508",
                      EMPENHO: "902188.0",
                      VALOR: "145.0",
                    },
                  ];
                  setParsedRows(testData);
                  setImportStatus((prev) => ({
                    ...prev,
                    parsedCount: testData.length,
                  }));
                  setShowConfirm(true);
                }}
              >
                <IonIcon icon={documentTextOutline} slot="start" />
                Testar com Dados de Exemplo
              </IonButton>
            </IonCol>
          </IonRow>
          {fileInfo && (
            <IonRow>
              <IonCol>
                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>
                      <IonIcon icon={documentTextOutline} /> {fileInfo.name}
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <p>Tamanho: {fileInfo.size}</p>
                    {importStatus.parsedCount > 0 && (
                      <p>Itens detectados: {importStatus.parsedCount}</p>
                    )}
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>
          )}
          {importStatus.isImporting && (
            <IonRow>
              <IonCol>
                <IonProgressBar type="indeterminate" />
                <IonText color="medium">
                  <small>Processando arquivo...</small>
                </IonText>
              </IonCol>
            </IonRow>
          )}

          {importStatus.success > 0 && (
            <IonRow>
              <IonCol>
                <IonText color="success">
                  <p>
                    <IonIcon icon={checkmarkCircleOutline} />{" "}
                    {importStatus.success} itens importados com sucesso!
                  </p>
                </IonText>
              </IonCol>
            </IonRow>
          )}

          {importStatus.errors.length > 0 && (
            <IonRow>
              <IonCol>
                <ImportResult erros={importStatus.errors} />
              </IonCol>
            </IonRow>
          )}

          {/* Busca e filtros */}
          <IonRow>
            <IonCol>
              <IonSearchbar
                placeholder="Buscar bens..."
                value={busca}
                onIonInput={(e) => setBusca(e.detail.value!)}
                debounce={300}
                animated
              />
            </IonCol>
            <IonCol size="auto">
              <IonButton
                fill="clear"
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
              >
                <IonIcon icon={filterOutline} />
              </IonButton>
              <IonButton fill="clear" onClick={limparFiltros}>
                <IonIcon icon={refreshOutline} />
              </IonButton>
            </IonCol>
          </IonRow>

          {mostrarFiltros && (
            <IonRow>
              <IonCol>
                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>Filtros</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <IonSelect
                      placeholder="Estado de Conservação"
                      value={filtros.estado_conservacao}
                      onIonChange={(e) =>
                        aplicarFiltro({ estado_conservacao: e.detail.value })
                      }
                    >
                      {ESTADO_CONSERVACAO_OPTIONS.map((opt) => (
                        <IonSelectOption key={opt.value} value={opt.value}>
                          {opt.label}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>
          )}

          {/* Lista de bens */}
          <IonRow>
            <IonCol>
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>
                    <IonIcon icon={listOutline} /> Bens Importados
                  </IonCardTitle>
                  <IonText>
                    <small>Total: {bensResult.total} itens</small>
                  </IonText>
                </IonCardHeader>
                <IonCardContent>
                  {carregando && paginacao.page === 1 ? (
                    <IonProgressBar type="indeterminate" />
                  ) : bensResult.bens.length === 0 ? (
                    <IonText color="medium" className="ion-text-center">
                      <p>Nenhum bem encontrado.</p>
                    </IonText>
                  ) : (
                    <>
                      <IonList>
                        {bensResult.bens.map((bem) => (
                          <IonItem key={bem.id_bem || bem.numero_patrimonio}>
                            <IonLabel>
                              <h2>{bem.descricao_bem}</h2>
                              <p>Patrimônio: {bem.numero_patrimonio}</p>
                              <p>Local: {bem.ambiente_nome}</p>
                              <p>
                                Valor: {formatCurrency(bem.valor_aquisicao)}
                              </p>
                              {bem.estado_conservacao && (
                                <IonChip
                                  color={
                                    bem.estado_conservacao ===
                                    EstadoConservacao.EXCELENTE
                                      ? "success"
                                      : bem.estado_conservacao ===
                                          EstadoConservacao.BOM
                                        ? "primary"
                                        : bem.estado_conservacao ===
                                            EstadoConservacao.REGULAR
                                          ? "warning"
                                          : bem.estado_conservacao ===
                                              EstadoConservacao.PESSIMO
                                            ? "danger"
                                            : "medium"
                                  }
                                >
                                  {formatEstadoConservacao(
                                    bem.estado_conservacao
                                  )}
                                </IonChip>
                              )}
                            </IonLabel>
                          </IonItem>
                        ))}
                      </IonList>

                      {bensResult.hasMore && (
                        <IonInfiniteScroll
                          onIonInfinite={carregarProximaPagina}
                        >
                          <IonInfiniteScrollContent loadingText="Carregando mais bens..." />
                        </IonInfiniteScroll>
                      )}
                    </>
                  )}
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>

        <IonAlert
          isOpen={showConfirm}
          header="Confirmar Importação"
          message={`Deseja importar ${importStatus.parsedCount} itens?`}
          buttons={[
            { text: "Cancelar", role: "cancel" },
            { text: "Importar", handler: startImport },
          ]}
          onDidDismiss={() => setShowConfirm(false)}
        />
        <IonToast
          isOpen={showToast.show}
          message={showToast.message}
          duration={3000}
          onDidDismiss={() => setShowToast({ show: false, message: "" })}
        />
      </IonContent>
    </IonPage>
  );
};

export default ImportacaoPage;
