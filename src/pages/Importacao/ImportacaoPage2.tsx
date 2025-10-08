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

  // Carregar bens
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
      if (file.mimeType === "application/pdf") await processPdfFile(file);
      else if (file.mimeType === "text/csv" || file.name.endsWith(".csv"))
        await processCsvFile(file);
      else throw new Error("Formato de arquivo não suportado");
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

    const requiredHeaders = [
      "CÓD BEM",
      "CLASS",
      "DESCRIÇÃO DO BEM",
      "LOCALIZAÇÃO",
      "AQUISIÇÃO CONS.",
      "NOTA FIS",
      "EMPENHO",
      "VALOR",
    ];
    const missing = requiredHeaders.filter((h) => !headers.includes(h));
    if (missing.length) {
      setImportStatus((prev) => ({
        ...prev,
        errors: missing.map((h) => ({
          linha: 0,
          patrimonio: "",
          erros: [`Cabeçalho faltante: ${h}`],
        })),
      }));
      return;
    }

    setParsedRows(rows);
    setImportStatus((prev) => ({ ...prev, parsedCount: rows.length }));
    setShowConfirm(true);
  };

  const parseDate = (dateStr: string): string => {
    if (!dateStr) return "";

    // Tentar diferentes formatos de data
    try {
      // Formato DD/MM/YYYY
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split("/");
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }

      // Formato DDMMYYYY
      if (/^\d{8}$/.test(dateStr)) {
        const day = dateStr.slice(0, 2);
        const month = dateStr.slice(2, 4);
        const year = dateStr.slice(4, 8);
        return `${year}-${month}-${day}`;
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

  const processCsvFile = async (file: any) => {
    try {
      const csvText = atob(file.data);

      // Primeiro detectar o delimitador
      const firstLine = csvText.split("\n")[0];
      const hasSemicolon = firstLine.includes(";");
      const delimiter = hasSemicolon ? ";" : ",";

      const result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        delimiter: delimiter,
        transformHeader: (header) => {
          // Normalizar nomes de cabeçalhos
          const headersMap: { [key: string]: string } = {
            SEQ: "SEQ",
            CLASS: "CLASS",
            "CÓD BEM": "CÓD BEM",
            "DESCRIÇÃO DO BEM": "DESCRIÇÃO DO BEM",
            "DATA AQU": "DATA AQU",
            "DATA DES": "DATA DES",
            CONSERVAÇÃO: "CONSERVAÇÃO",
            "NOTA FIS": "NOTA FIS",
            EMPENHO: "EMPENHO",
            VALOR: "VALOR",
          };
          return headersMap[header.trim()] || header.trim();
        },
      });

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

      console.log("CSV parseado:", result.data);
      setParsedRows(result.data);
      setImportStatus((prev) => ({ ...prev, parsedCount: result.data.length }));
      setShowConfirm(true);
    } catch (error) {
      console.error("Erro ao processar CSV:", error);
      showToastMessage("Erro ao processar arquivo CSV");
    }
  };

  const transformToBemModel = (row: any): IBem => {
    console.log("Transformando linha:", row);

    // Extrair data de aquisição - pode estar na descrição ou em coluna separada
    let dataAquisicao = "";
    const descricao = row["DESCRIÇÃO DO BEM"] || "";

    // Tentar encontrar data no final da descrição (padrão DD/MM/YYYY)
    const dateMatch = descricao.match(/(\d{2}\/\d{2}\/\d{4})$/);
    if (dateMatch) {
      dataAquisicao = parseDate(dateMatch[1]);
    } else if (row["DATA AQU"]) {
      dataAquisicao = parseDate(row["DATA AQU"]);
    }

    return {
      classificacao: row["CLASS"]?.toString() || "",
      numero_patrimonio: row["CÓD BEM"]?.toString() || "",
      descricao_bem: descricao,
      ambiente_nome: "SALA_201ET",
      data_aquisicao: dataAquisicao || new Date().toISOString().split("T")[0],
      nota_fiscal: row["NOTA FIS"]?.toString() || "",
      empenho_siafi: row["EMPENHO"]?.toString() || "",
      valor_aquisicao: parseCurrency(row["VALOR"]?.toString() || "0"),
      estado_conservacao: determineEstadoConservacao(
        row["CONSERVAÇÃO"] || row["ESTADO"]
      ),
      br_code: `PAT-${row["CÓD BEM"] || "SEM-CODIGO"}`,
      conferido: false,
      id_servidor_responsavel: 1,
      id_ambiente_atual: 1,
    };
  };

  const extractTextFromPdf = async (file: any) => {
    const arrayBuffer = await file.blob.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map((item: any) => item.str).join(" ") + "\n";
    }
    return fullText;
  };

  const processExtractedText = (text: string) => {
    const lines = text.split("\n").filter((l) => l.trim());
    const headers = lines[0].split(/\s{2,}/).map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      const values = line.split(/\s{2,}/);
      const row: any = {};
      headers.forEach((h, i) => (row[h] = values[i]?.trim() || ""));
      return row;
    });
    return {
      headers,
      rows: rows.filter((r) => Object.values(r).some((v) => v)),
    };
  };

  const startImport = async () => {
    setShowConfirm(false);
    setImportStatus((prev) => ({ ...prev, isImporting: true, success: 0 }));
    try {
      const bens: IBem[] = parsedRows.map(transformToBemModel);
      await DatabaseService.importBens(bens);

      // Limpa os filtros e recarrega a lista
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

  const showToastMessage = (msg: string) => {
    setShowToast({ show: true, message: msg });
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const formatEstadoConservacao = (estado: EstadoConservacao) =>
    ESTADO_CONSERVACAO_OPTIONS.find((o) => o.value === estado)?.label ||
    "Desconhecido";

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
                <IonIcon icon={cloudUploadOutline} slot="start" /> Selecionar
                Arquivo (PDF ou CSV)
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

          {/* Lista de bens*/}
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
                          <IonItem key={bem.id_bem}>
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
