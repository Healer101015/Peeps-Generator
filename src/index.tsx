import React from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";

import { PeepsGenerator } from "./components/App";
import { LoginPage } from "./components/LoginPage";
import { Provider } from "./utils/contextProvider";
import { AuthProvider, useAuth } from "./utils/authContext";

import "rc-slider/assets/index.css";
import "./styles/index.css";
import "@mantine/core/styles.css";

const theme = createTheme({
    fontFamily: "Itim, sans-serif"
});

// Gate: show login if no user, otherwise show app
const AppGate: React.FC = () => {
    const { user } = useAuth();
    if (!user) return <LoginPage />;
    return (
        <Provider>
            <PeepsGenerator />
        </Provider>
    );
};

const container = document.getElementById("main");
if (!container) throw new Error("Failed to find the root element");

const root = createRoot(container);

root.render(
    <React.StrictMode>
        <MantineProvider theme={theme}>
            <AuthProvider>
                <AppGate />
            </AuthProvider>
        </MantineProvider>
    </React.StrictMode>
);
