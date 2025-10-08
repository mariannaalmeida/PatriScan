import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
} from "@ionic/react";

// Interface para tipagem dos erros de importação
interface ImportError {
  linha: number; // Número da linha com erro
  patrimonio: string; // Código do patrimônio
  erros: string[]; // Lista de mensagens de erro
}

// Componente para exibir resultados de importação com erros
export const ImportResult = ({ erros }: { erros: ImportError[] }) => {
  // Se não houver erros, não renderiza nada
  if (erros.length === 0) {
    return null;
  }

  return (
    <IonCard color="danger">
      <IonCardHeader>
        {/* Título com contagem de erros */}
        <IonCardTitle>Erros de Importação ({erros.length})</IonCardTitle>
      </IonCardHeader>

      <IonCardContent>
        {/* Lista de erros usando componentes Ionic para melhor consistência visual */}
        <IonList>
          {erros.map((err, idx) => (
            <IonItem key={idx} lines="full">
              <IonLabel className="ion-text-wrap">
                {/* Cabeçalho do erro */}
                <h2>
                  Linha {err.linha} — Patrimônio: {err.patrimonio}
                </h2>

                {/* Lista de mensagens de erro */}
                <ul style={{ margin: "0.5rem 0 0 0", paddingLeft: "1rem" }}>
                  {err.erros.map((e, i) => (
                    <li key={i} style={{ marginBottom: "0.25rem" }}>
                      {e}
                    </li>
                  ))}
                </ul>
              </IonLabel>
            </IonItem>
          ))}
        </IonList>
      </IonCardContent>
    </IonCard>
  );
};
