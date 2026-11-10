import type { AppProps } from "next/app";
import "@xyflow/react/dist/style.css";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) { return <Component {...pageProps} />; }
