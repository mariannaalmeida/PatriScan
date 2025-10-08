import React from "react";
import { IBem } from "../models";
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonList,
} from "@ionic/react";

export const BemCard = ({ bem }: { bem: IBem }) => (
  <IonCard>
    <IonCardHeader>
      <IonCardTitle>{bem.numero_patrimonio}</IonCardTitle>
    </IonCardHeader>
    <IonCardContent>
      <IonList>
        <IonItem>Descrição do bem: {bem.descricao_bem} </IonItem>
        <IonItem>
          <IonLabel>Local: {bem.ambiente_nome ?? " - "}</IonLabel>
          <IonLabel>Responsável: {bem.servidor_nome ?? " - "}</IonLabel>
        </IonItem>
        <IonItem>Conservação:{bem.estado_conservacao} </IonItem>
      </IonList>
    </IonCardContent>
  </IonCard>
);
