import { Redirect, Route } from "react-router-dom";
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { homeOutline, barcodeOutline, bookOutline } from "ionicons/icons";
import Home from "./pages/Home/HomePage2";
import Relatorio from "./pages/Relatorio/Relatorio";
import Scanner from "./pages/Scan/ScanPage2";
import CadastrarBemPage from "./pages/Bem/CadastrarBemPage";
import BemDetalhePage from "./pages/Bem/BemDetalhePage";
import ImportacaoPage from "./pages/Importacao/ImportacaoPage6";
import InventarioPage from "./pages/Inventario/InventarioPage";

/* Core CSS required for Ionic components to work properly */
import "@ionic/react/css/core.css";

/* Basic CSS for apps built with Ionic */
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

/* Optional CSS utils that can be commented out */
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import "@ionic/react/css/palettes/dark.system.css";

/* Theme variables */
import "./theme/variables.css";

setupIonicReact();

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <IonTabs>
        <IonRouterOutlet>
          <Route exact path="/home">
            <Home />
          </Route>
          <Route exact path="/scanner">
            <Scanner />
          </Route>
          <Route exact path="/cadastrar-bem">
            <CadastrarBemPage />
          </Route>
          <Route exact path="/bem-detalhe/:id">
            <BemDetalhePage />
          </Route>
          <Route path="/relatorio">
            <Relatorio />
          </Route>
          <Route path="/inventario">
            <InventarioPage />
          </Route>
          <Route path="/importacao">
            <ImportacaoPage />
          </Route>
          <Route exact path="/">
            <Redirect to="/home" />
          </Route>
          <Route exact path="/dashboard">
            <Redirect to="/dashboard" />
          </Route>
        </IonRouterOutlet>
        <IonTabBar slot="bottom">
          <IonTabButton tab="home" href="/home">
            <IonIcon aria-hidden="true" icon={homeOutline} />
            <IonLabel></IonLabel>
          </IonTabButton>
          <IonTabButton tab="scan" href="/scanner">
            <IonIcon aria-hidden="true" icon={barcodeOutline} />
            <IonLabel></IonLabel>
          </IonTabButton>
          <IonTabButton tab="relatorio" href="/relatorio">
            <IonIcon aria-hidden="true" icon={bookOutline} />
            <IonLabel></IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>
    </IonReactRouter>
  </IonApp>
);

export default App;
