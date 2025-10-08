import React from "react";
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonPage,
} from "@ionic/react";
import "../Relatorio/Relatorio.css";

const Relatorio: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Relatórios</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="card-content"> Conteúdo</div>
      </IonContent>
    </IonPage>
  );
};

export default Relatorio;
