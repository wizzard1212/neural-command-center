import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { ZentralePage } from "./pages/ZentralePage";
import { NewsPage } from "./pages/NewsPage";
import { SocialPage } from "./pages/SocialPage";
import { JournalPage } from "./pages/JournalPage";
import { KontenPage } from "./pages/KontenPage";
import { KalenderPage } from "./pages/KalenderPage";
import { StatistikPage } from "./pages/StatistikPage";
import { EinstellungenPage } from "./pages/EinstellungenPage";
import "./styles/global.css";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/zentrale" replace /> },
      { path: "zentrale", element: <ZentralePage /> },
      { path: "news", element: <NewsPage /> },
      { path: "social", element: <SocialPage /> },
      { path: "journal", element: <JournalPage /> },
      { path: "konten", element: <KontenPage /> },
      { path: "kalender", element: <KalenderPage /> },
      { path: "statistik", element: <StatistikPage /> },
      { path: "einstellungen", element: <EinstellungenPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
