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

type ImportStatus = "idle" | "processing" | "done" | "error";

const ImportacaoPage = () => {
  const [fileInfo, setFileInfo] = useState<{
    name: string;
    size: string;
  } | null>(null);

  const [status, setStatus] = useState<ImportStatus>("idle");
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showToast, setShowToast] = useState({ show: false, message: "" });

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

  // Helpers
  const formatFileSize = (bytes: number) =>
    bytes < 1024
      ? `${bytes} bytes`
      : bytes < 1048576
        ? `${(bytes / 1024).toFixed(1)} KB`
        : `${(bytes / 1048576).toFixed(1)} MB`;

  const normalizeHeader = (h: string) =>
    h
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();

  const parseCurrency = (value: string) => {
    if (!value) return 0;
    const clean = value.replace(/\./g, "").replace(",", ".");
    return parseFloat(clean) || 0;
  };

  const showToastMessage = (msg: string) => {
    setShowToast({ show: true, message: msg });
    setTimeout(() => setShowToast({ show: false, message: "" }), 3000);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const formatEstadoConservacao = (estado?: EstadoConservacao): string =>
    ESTADO_CONSERVACAO_OPTIONS.find((o) => o.value === estado)?.label ||
    "Desconhecido";

  // Carregar bens
  const carregarBens = useCallback(
    async (page = 1, aplicarFiltros = true) => {
      try {
        setCarregando(true);
        const filtrosParaBusca = aplicarFiltros ? { ...filtros } : {};
        if (busca) filtrosParaBusca.search = busca;

        const resultado = await DatabaseService.getBensFiltrados(
          filtrosParaBusca,
          { page, pageSize: paginacao.pageSize }
        );

        if (page === 1) setBensResult(resultado);
        else
          setBensResult((prev) => ({
            ...resultado,
            bens: [...prev.bens, ...resultado.bens],
          }));

        setPaginacao((prev) => ({ ...prev, page }));
      } catch (error) {
        console.error("Erro ao carregar bens:", error);
        showToastMessage("Erro ao carregar lista de bens");
        setBensResult({ bens: [], total: 0, hasMore: false });
      } finally {
        setCarregando(false);
      }
    },
    [filtros, busca, paginacao.pageSize]
  );

  useEffect(() => {
    carregarBens(1);
  }, [filtros, busca, carregarBens]);

  // Importação
  const handleFilePick = async () => {
    try {
      const result = await FilePicker.pickFiles({
        types: ["application/pdf", "text/csv"],
        readData: true,
      });
      if (!result.files.length) return;
      const file = result.files[0];
      setFileInfo({ name: file.name, size: formatFileSize(file.size) });
      setStatus("processing");
      setErrors([]);
      setParsedRows([]);
      await processFile(file);
    } catch (error) {
      console.error("Erro ao selecionar arquivo:", error);
      showToastMessage("Erro ao selecionar arquivo");
      setStatus("error");
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
      setStatus("error");
    } finally {
      setStatus("idle");
    }
  };

  const processPdfFile = async (file: any) => {
    const text = await extractTextFromPdf(file);
    const { headers, rows } = processExtractedText(text);

    const requiredHeaders = [
      "COD BEM",
      "CLASS",
      "DESCRICAO DO BEM",
      "LOCALIZACAO",
      "AQUISICAO CONS.",
      "NOTA FIS",
      "EMPENHO",
      "VALOR",
    ];

    const headersNorm = headers.map(normalizeHeader);
    const missing = requiredHeaders.filter((h) => !headersNorm.includes(h));

    if (missing.length) {
      setErrors(
        missing.map((h) => ({
          linha: 0,
          patrimonio: "",
          erros: [`Cabeçalho faltante: ${h}`],
        }))
      );
      return;
    }

    setParsedRows(rows);
    setShowConfirm(true);
  };

  const processCsvFile = async (file: any) => {
    const binaryStr = atob(file.data);
    const csvText = new TextDecoder("utf-8").decode(
      Uint8Array.from(binaryStr, (c) => c.charCodeAt(0))
    );

    const result = Papa.parse(csvText, { header: true, skipEmptyLines: true });

    if (result.errors.length > 0) {
      setErrors(
        result.errors.map((err) => ({
          linha: err.row || 0,
          patrimonio: "",
          erros: [err.message],
        }))
      );
      return;
    }

    setParsedRows(result.data);
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
    numero_patrimonio: row["COD BEM"] || row["CÓD BEM"] || "",
    descricao_bem: row["DESCRICAO DO BEM"] || row["DESCRIÇÃO DO BEM"] || "",
    ambiente_nome: row["LOCALIZACAO"] || row["LOCALIZAÇÃO"] || "",
    data_aquisicao:
      row["AQUISICAO CONS."] ||
      row["AQUISIÇÃO CONS."] ||
      new Date().toISOString().split("T")[0],
    nota_fiscal: row["NOTA FIS"] || row["nota_fiscal"] || "",
    empenho_siafi: row["EMPENHO"] || row["empenho_siafi"] || "",
    valor_aquisicao: parseCurrency(
      row["VALOR"] || row["valor_aquisicao"] || "0"
    ),
    estado_conservacao: EstadoConservacao.BOM,
    br_code: `PAT-${row["COD BEM"] || row["CÓD BEM"] || "SEM-CODIGO"}`,
    conferido: false,
    id_servidor_responsavel: 1,
    id_ambiente_atual: 1,
  });

  const startImport = async () => {
    setShowConfirm(false);
    setStatus("processing");
    try {
      const bens: IBem[] = parsedRows.map(transformToBemModel);
      await DatabaseService.importBens(bens);
      await carregarBens(1);
      setSuccessCount(bens.length);
      setStatus("done");
      showToastMessage("Importação concluída com sucesso!");
    } catch (error) {
      console.error("Erro ao importar:", error);
      showToastMessage("Erro na importação dos bens");
      setStatus("error");
    }
  };

  const carregarProximaPagina = async (event: CustomEvent<void>) => {
    if (bensResult.hasMore && !carregando)
      await carregarBens(paginacao.page + 1);
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
          <IonRow>
            <IonCol>
              <IonButton
                expand="block"
                onClick={handleFilePick}
                disabled={status === "processing"}
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
                    {parsedRows.length > 0 && (
                      <p>Itens detectados: {parsedRows.length}</p>
                    )}
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>
          )}

          {status === "processing" && (
            <IonRow>
              <IonCol>
                <IonProgressBar type="indeterminate" />
                <IonText color="medium">
                  <small>Processando arquivo...</small>
                </IonText>
              </IonCol>
            </IonRow>
          )}

          {successCount > 0 && (
            <IonRow>
              <IonCol>
                <IonText color="success">
                  <p>
                    <IonIcon icon={checkmarkCircleOutline} /> {successCount}{" "}
                    itens importados com sucesso!
                  </p>
                </IonText>
              </IonCol>
            </IonRow>
          )}

          {errors.length > 0 && (
            <IonRow>
              <IonCol>
                <ImportResult erros={errors} />
                <IonText color="danger">
                  <p>{errors.length} registros com erro</p>
                </IonText>
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
                <IonItem>
                  <IonLabel>Estado de Conservação</IonLabel>
                  <IonSelect
                    value={filtros.estado_conservacao}
                    placeholder="Selecione"
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
                </IonItem>
              </IonCol>
            </IonRow>
          )}

          {/* Lista de bens */}
          <IonRow>
            <IonCol>
              <IonList>
                {bensResult.bens.map((bem, idx) => (
                  <IonItem key={idx}>
                    <IonLabel>
                      <h2>
                        {bem.numero_patrimonio} - {bem.descricao_bem}
                      </h2>
                      <p>
                        Local: {bem.ambiente_nome} | Valor:{" "}
                        {formatCurrency(bem.valor_aquisicao)} | Estado:{" "}
                        {formatEstadoConservacao(bem.estado_conservacao)}
                      </p>
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>

              <IonInfiniteScroll
                onIonInfinite={carregarProximaPagina}
                threshold="100px"
                disabled={!bensResult.hasMore}
              >
                <IonInfiniteScrollContent
                  loadingSpinner="bubbles"
                  loadingText="Carregando mais bens..."
                />
              </IonInfiniteScroll>
            </IonCol>
          </IonRow>
        </IonGrid>

        <IonToast
          isOpen={showToast.show}
          message={showToast.message}
          duration={3000}
          onDidDismiss={() => setShowToast({ show: false, message: "" })}
        />

        <IonAlert
          isOpen={showConfirm}
          onDidDismiss={() => setShowConfirm(false)}
          header="Confirmar Importação"
          message={`Foram encontrados ${parsedRows.length} itens. Deseja importar? (mostrando até 5 abaixo)`}
          buttons={[
            { text: "Cancelar", role: "cancel" },
            { text: "Importar", handler: startImport },
          ]}
        />

        {showConfirm && parsedRows.length > 0 && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Prévia dos itens</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {parsedRows.slice(0, 5).map((row, idx) => (
                <IonItem key={idx}>
                  <IonLabel>
                    <h2>{row["COD BEM"] || row["CÓD BEM"]}</h2>
                    <p>{row["DESCRICAO DO BEM"] || row["DESCRIÇÃO DO BEM"]}</p>
                  </IonLabel>
                </IonItem>
              ))}
              {parsedRows.length > 5 && (
                <IonText color="medium">
                  ... e mais {parsedRows.length - 5} itens
                </IonText>
              )}
            </IonCardContent>
          </IonCard>
        )}
      </IonContent>
    </IonPage>
  );
};

export default ImportacaoPage;
