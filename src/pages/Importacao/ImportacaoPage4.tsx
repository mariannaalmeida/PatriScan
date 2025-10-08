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
  IonBadge,
  IonAccordion,
  IonAccordionGroup,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonChip,
  IonNote,
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
import { ImportResult } from "../../components/ImportResult";
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

// Configuração do worker do pdf.js
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const PDF_TO_MODEL_MAP: Record<string, string> = {
  "CÓD BEM": "numero_patrimonio",
  CLASS: "classificacao",
  "DESCRIÇÃO DO BEM": "descricao_bem",
  LOCALIZAÇÃO: "ambiente_nome",
  "AQUISIÇÃO CONS.": "data_aquisicao",
  "NOTA FIS": "nota_fiscal",
  EMPENHO: "empenho_siafi",
  VALOR: "valor_aquisicao",
};

// Normalização de cabeçalhos colados ou diferentes
const normalizeHeader = (header: string): string => {
  return header
    .replace("NOTA FISCONS.", "NOTA FIS")
    .replace("VALORLOCALIZAÇÃO", "VALOR LOCALIZAÇÃO")
    .replace("AQUISIÇÃO", "AQUISIÇÃO CONS.")
    .trim();
};

// Opções de estado de conservação para o filtro
const ESTADO_CONSERVACAO_OPTIONS = [
  { value: EstadoConservacao.EXCELENTE, label: "Excelente" },
  { value: EstadoConservacao.BOM, label: "Bom" },
  { value: EstadoConservacao.REGULAR, label: "Regular" },
  { value: EstadoConservacao.PESSIMO, label: "Pessimo" },
];

const ITENS_POR_PAGINA = 20;

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

  // Estados para a listagem de bens usando IBensResult
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

  // Carregar bens importados
// No seu componente ImportacaoPage
const carregarBens = useCallback(async (page = 1, aplicarFiltros = true) => {
  try {
    setCarregando(true);
    
    const filtrosParaBusca = aplicarFiltros ? filtros : {};
    if (busca) {
      filtrosParaBusca.search = busca;
    }
    
    const resultado = await DatabaseService.getBensFiltrados(
      filtrosParaBusca,
      { page, pageSize: paginacao.pageSize }
    );
    
    if (page === 1) {
      setBensResult(resultado);
    } else {
      setBensResult(prev => ({
        ...resultado,
        bens: [...prev.bens, ...resultado.bens],
      }));
    }
    
    setPaginacao(prev => ({ ...prev, page }));
  } catch (error) {
    console.error("Erro ao carregar bens:", error);
    showToastMessage("Erro ao carregar lista de bens");
    // Você pode optar por setar um estado vazio em caso de erro
    setBensResult({ bens: [], total: 0, hasMore: false });
  } finally {
    setCarregando(false);
  }
}, [filtros, busca, paginacao.pageSize]);
  // Carregar bens quando os filtros ou busca mudarem
  useEffect(() => {
    carregarBens(1);
  }, [filtros, busca, carregarBens]);

  const handleFilePick = async () => {
    try {
      const result = await FilePicker.pickFiles({
        types: ["application/pdf", "text/csv"],
        readData: true,
      });

      if (result.files.length === 0) return;

      const file = result.files[0];

      setFileInfo({
        name: file.name,
        size: formatFileSize(file.size),
      });

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
      if (file.mimeType === "application/pdf") {
        await processPdfFile(file);
      } else if (file.mimeType === "text/csv" || file.name.endsWith(".csv")) {
        await processCsvFile(file);
      } else {
        throw new Error("Formato de arquivo não suportado");
      }
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      showToastMessage("Erro ao processar arquivo");
    } finally {
      setImportStatus((prev) => ({ ...prev, isImporting: false }));
    }
  };

  const processPdfFile = async (file: any) => {
    const text = await extractTextFromPdf(file);
    const { headers, rows } = processExtractedText(text);

    const headerErrors = validateHeaders(headers);
    if (headerErrors.length > 0) {
      setImportStatus((prev) => ({
        ...prev,
        errors: headerErrors.map((msg) => ({
          linha: 0,
          patrimonio: "",
          erros: [msg],
        })),
      }));
      return;
    }

    setParsedRows(rows);
    setImportStatus((prev) => ({ ...prev, parsedCount: rows.length }));
    setShowConfirm(true);
  };

  const processCsvFile = async (file: any) => {
    const csvText = atob(file.data);
    const result = Papa.parse(csvText, { header: true, skipEmptyLines: true });

    if (result.errors.length > 0) {
      setImportStatus((prev) => ({
        ...prev,
        errors: result.errors.map((err) => ({
          linha: err.row || 0,
          patrimonio: "",
          erros: [err.message],
        })),
      }));
      return;
    }

    setParsedRows(result.data);
    setImportStatus((prev) => ({ ...prev, parsedCount: result.data.length }));
    setShowConfirm(true);
  };

  const extractTextFromPdf = async (file: any): Promise<string> => {
    const arrayBuffer = await file.blob.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument(arrayBuffer);
    const pdf = await loadingTask.promise;

    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
    }
    return fullText;
  };

  const processExtractedText = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim());
    const headers = lines[0].split(/\s{2,}/).map((h) => normalizeHeader(h));

    const rows = lines.slice(1).map((line) => {
      const values = line.split(/\s{2,}/);
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || "";
      });
      return row;
    });

    return {
      headers,
      rows: rows.filter((row) => Object.values(row).some((v) => v)),
    };
  };

  const validateHeaders = (headers: string[]): string[] => {
    const requiredHeaders = Object.keys(PDF_TO_MODEL_MAP);
    return requiredHeaders
      .filter((header) => !headers.includes(header))
      .map((h) => `Cabeçalho faltante: ${h}`);
  };

  const transformToBemModel = (row: any): IBem => {
    return {
      classificacao: row["CLASS"] || row["classificacao"],
      numero_patrimonio:
        row["CÓD BEM"]?.toString() || row["numero_patrimonio"] || "",
      descricao_bem: row["DESCRIÇÃO DO BEM"] || row["descricao_bem"] || "",
      ambiente_nome: row["LOCALIZAÇÃO"] || row["ambiente_nome"] || "",
      data_aquisicao: formatDate(
        row["AQUISIÇÃO CONS."] || row["data_aquisicao"]
      ),
      nota_fiscal: row["NOTA FIS"] || row["nota_fiscal"] || "",
      empenho_siafi: row["EMPENHO"] || row["empenho_siafi"] || "",
      valor_aquisicao: parseCurrency(
        row["VALOR"] || row["valor_aquisicao"] || ""
      ),
      estado_conservacao: EstadoConservacao.BOM,
      br_code: generateBrCode(row["CÓD BEM"] || row["numero_patrimonio"]),
      conferido: false,
      id_servidor_responsavel: 1,
      id_ambiente_atual: 1,
    };
  };

  const startImport = async () => {
    setShowConfirm(false);
    setImportStatus((prev) => ({ ...prev, isImporting: true, success: 0 }));

    try {
      const bens: IBem[] = parsedRows.map(transformToBemModel);
      await DatabaseService.importBens(bens);

      // Recarregar a lista de bens
      await carregarBens(1);

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
    }
  };

  const carregarProximaPagina = async (event: CustomEvent<void>) => {
    if (bensResult.hasMore && !carregando) {
      await carregarBens(paginacao.page + 1);
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

  // Helpers
  const formatFileSize = (bytes: number): string =>
    bytes < 1024
      ? `${bytes} bytes`
      : bytes < 1048576
        ? `${(bytes / 1024).toFixed(1)} KB`
        : `${(bytes / 1048576).toFixed(1)} MB`;

  const parseCurrency = (value: string): number => {
    if (!value) return 0;
    const num = value.replace(/[^\d,.-]/g, "").replace(",", ".");
    return parseFloat(num) || 0;
  };

  const formatDate = (dateStr?: string): string =>
    dateStr ? dateStr : new Date().toISOString().split("T")[0];

  const generateBrCode = (patrimonio: string): string =>
    `PAT-${patrimonio || "SEM-CODIGO"}`;

  const showToastMessage = (message: string) => {
    setShowToast({ show: true, message });
    setTimeout(() => setShowToast({ show: false, message: "" }), 3000);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatEstadoConservacao = (estado: EstadoConservacao): string => {
    const option = ESTADO_CONSERVACAO_OPTIONS.find(
      (opt) => opt.value === estado
    );
    return option ? option.label : "Desconhecido";
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton>
              <IonIcon icon={listOutline} />
            </IonButton>
          </IonButtons>
          <IonTitle>Importação de Bens</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonGrid>
          {/* Seção de Importação */}
          <IonRow>
            <IonCol>
              <IonButton
                expand="block"
                onClick={handleFilePick}
                disabled={importStatus.isImporting}
              >
                <IonIcon icon={cloudUploadOutline} slot="start" />
                Selecionar Arquivo (PDF ou CSV)
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

          {/* Seção de Busca e Filtros */}
          <IonRow>
            <IonCol>
              <IonSearchbar
                placeholder="Buscar bens..."
                value={busca}
                onIonInput={(e) => setBusca(e.detail.value!)}
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
                    <IonGrid>
                      <IonRow>
                        <IonCol>
                          <IonSelect
                            placeholder="Estado de Conservação"
                            value={filtros.estado_conservacao}
                            onIonChange={(e) =>
                              aplicarFiltro({
                                estado_conservacao: e.detail.value,
                              })
                            }
                          >
                            {ESTADO_CONSERVACAO_OPTIONS.map((option) => (
                              <IonSelectOption
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </IonSelectOption>
                            ))}
                          </IonSelect>
                        </IonCol>
                      </IonRow>
                      <IonRow>
                        <IonCol>
                          <IonButton
                            expand="block"
                            size="small"
                            onClick={limparFiltros}
                          >
                            Limpar Filtros
                          </IonButton>
                        </IonCol>
                      </IonRow>
                    </IonGrid>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>
          )}

          {/* Lista de Bens Importados */}
          <IonRow>
            <IonCol>
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>
                    <IonIcon icon={listOutline} /> Bens Importados
                  </IonCardTitle>
                  <IonNote>Total: {bensResult.total} itens</IonNote>
                </IonCardHeader>
                <IonCardContent>
                  {carregando && paginacao.page === 1 ? (
                    <IonProgressBar type="indeterminate" />
                  ) : bensResult.bens.length === 0 ? (
                    <IonText color="medium">
                      <p>Nenhum bem encontrado.</p>
                    </IonText>
                  ) : (
                    <>
                      <IonList>
                        {bensResult.bens.map((bem, index) => (
                          <IonItem key={index}>
                            <IonLabel>
                              <h2>{bem.numero_patrimonio}</h2>
                              <h3>{bem.descricao_bem}</h3>
                              <p>Classificação: {bem.classificacao}</p>
                              <p>Local: {bem.ambiente_nome}</p>
                              <p>
                                Valor:{" "}
                                {formatCurrency(bem.valor_aquisicao || 0)}
                              </p>
                              {bem.estado_conservacao && (
                                <IonChip
                                  color={
                                    bem.estado_conservacao ===
                                    EstadoConservacao.BOM
                                      ? "success"
                                      : bem.estado_conservacao ===
                                          EstadoConservacao.REGULAR
                                        ? "warning"
                                        : bem.estado_conservacao ===
                                            EstadoConservacao.RUIM
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

interface ImportError {
  linha: number;
  patrimonio: string;
  erros: string[];
}

export default ImportacaoPage;
