import { IonItem, IonLabel, IonSelect, IonSelectOption } from "@ionic/react";
import React from "react";

type FiltroBensProps = {
  label: string;
  options: string[];
  selected: string;
  onChange: (val: string) => void;
};

export const FiltroBens = ({
  label,
  options,
  selected,
  onChange,
}: FiltroBensProps) => (
  <IonItem>
    <IonLabel> {label} </IonLabel>
    <IonSelect
      value={selected}
      placeholder="Selecione"
      onIonChange={(e) => onChange(e.detail.value)}
    >
      {options.map((opt) => (
        <IonSelectOption key={opt} value={opt}>
          {" "}
          {opt}{" "}
        </IonSelectOption>
      ))}
    </IonSelect>
  </IonItem>
);
