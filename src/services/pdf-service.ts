import * as pdfjsLib from "pdfjs-dist";
import { Capacitor } from "@capacitor/core";

export const configurePDFJS = () => {
  if (Capacitor.isNativePlatform()) {
    // Para mobile - use worker empacotado
    return "assets/pdf.worker.min.js";
  }
  // Para web - use do CDN
  return `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
};

pdfjsLib.GlobalWorkerOptions.workerSrc = configurePDFJS();
