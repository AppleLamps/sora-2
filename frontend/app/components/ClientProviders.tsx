'use client';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from '../contexts/AuthContext';

const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#9c27b0',
        },
        secondary: {
            main: '#009688',
        },
        background: {
            default: '#121212',
            paper: '#1e1e1e',
        },
    },
    typography: {
        fontFamily: `'Inter', sans-serif`,
    },
});

export default function ClientProviders({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
    );
}
