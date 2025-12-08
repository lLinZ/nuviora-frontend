import { createTheme, darken } from "@mui/material/styles";

export const getThemeLight = (primaryColor: string) => createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: primaryColor,
        },
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
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundColor: '#ffffff',
                    backgroundImage: 'none',
                }
            }
        }
    }
});

export const getThemeDark = (primaryColor: string) => createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: primaryColor,
        },
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
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundColor: darken(primaryColor, 0.8),
                    backgroundImage: 'none',
                }
            }
        }
    }
});