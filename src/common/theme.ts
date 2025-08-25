import { createTheme } from "@mui/material/styles";

export const themeLight = createTheme({
    palette: {
        mode: 'light',
        background: {
            default: '#F7F7F7',
        },
    },
    typography: {
        allVariants: {
            fontFamily: ['Poppins', 'Geologica', 'Noto Sans Warang Citi', 'Open Sans', 'Ubuntu', 'Sans-serif'].join(','),
        },
        htmlFontSize: 16,
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    backgroundColor: "#fbfbfb",
                },
            },
        },
    }
});
export const themeDark = createTheme({
    palette: {
        mode: 'dark',
        background: {
            default: '#191919'
        },
    },
    typography: {
        allVariants: {
            fontFamily: ['Geologica', 'Noto Sans Warang Citi', 'Open Sans', 'Ubuntu', 'Sans-serif'].join(','),
        },
        htmlFontSize: 16,
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    backgroundColor: "#191919",
                },
            },
        },
    }
});