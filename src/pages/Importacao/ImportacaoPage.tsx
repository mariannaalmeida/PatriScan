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

  // Carregar bens (CORRIGIDO)
  // A função agora recebe os filtros como argumento para ser mais explícita.
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
    [paginacao.pageSize] // Depende apenas do tamanho da página
  );

  // useEffect (CORRIGIDO)
  // Agora ele constrói os filtros e os passa para `carregarBens`.
  useEffect(() => {
    const filtrosAtuais = { ...filtros };
    if (busca) {
      filtrosAtuais.search = busca;
    }
    carregarBens(1, filtrosAtuais);
  }, [filtros, busca, carregarBens]);

  // Importação de arquivo (sem alterações nesta função)
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

  const transformToBemModel = (row: any): IBem => ({
    classificacao: row["CLASS"] || row["classificacao"] || "",
    numero_patrimonio: row["CÓD BEM"] || "",
    descricao_bem: row["DESCRIÇÃO DO BEM"] || "",
    ambiente_nome: row["LOCALIZAÇÃO"] || "",
    data_aquisicao:
      row["AQUISIÇÃO CONS."] || new Date().toISOString().split("T")[0],
    nota_fiscal: row["NOTA FIS"] || row["nota_fiscal"] || "",
    empenho_siafi: row["EMPENHO"] || row["empenho_siafi"] || "",
    valor_aquisicao: parseCurrency(
      row["VALOR"] || row["valor_aquisicao"] || "0"
    ),
    estado_conservacao: EstadoConservacao.BOM,
    br_code: `PAT-${row["CÓD BEM"] || "SEM-CODIGO"}`,
    conferido: false,
    id_servidor_responsavel: 1,
    id_ambiente_atual: 1,
  });

  // startImport (CORRIGIDO)
  // Agora orquestra a sequência correta de importação, limpeza de estado e recarregamento.
  const startImport = async () => {
    setShowConfirm(false);
    setImportStatus((prev) => ({ ...prev, isImporting: true, success: 0 }));
    try {
      const bens: IBem[] = parsedRows.map(transformToBemModel);
      await DatabaseService.importBens(bens);

      // 1. Limpa os filtros na UI
      setFiltros({});
      setBusca("");

      // 2. Chama explicitamente o recarregamento com filtros vazios
      await carregarBens(1, {});

      // 3. Atualiza o status de sucesso após a lista ser recarregada
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

  // O JSX (retorno do componente) permanece o mesmo...
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
                debounce={300} // Adicionado para melhor performance
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
                          <IonItem key={bem.numero_patrimonio}>
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
                                    EstadoConservacao.EXCELENTE
                                      ? "primary"
                                      : bem.estado_conservacao ===
                                          EstadoConservacao.BOM
                                        ? "success"
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
