import React from "react";
import { IonInput, IonItem, IonLabel } from "@ionic/react";

type IonInputType =
  | "text"
  | "password"
  | "email"
  | "number"
  | "search"
  | "tel"
  | "url"
  | "date"
  | "datetime-local"
  | "month"
  | "time"
  | "week";

type CampoInputProps = {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: IonInputType;
  children?: never;
};

export const CampoInput = ({
  label,
  value,
  onChange,
  type = "text",
}: CampoInputProps) => (
  <IonItem>
    <IonLabel position="stacked">{label}</IonLabel>
    <IonInput
      value={value}
      type={type}
      onIonChange={(e) => {
        onChange(e.detail.value ?? "");
      }}
      clearInput
    />
  </IonItem>
);
