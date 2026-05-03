
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { App } from "./app/App.tsx";
import "./styles/index.css";

const canonicalHost = 'ptz.juhi.studio';
const currentUrl = new URL(window.location.href);

if (currentUrl.hostname === 'www.juhi.studio' && currentUrl.pathname.startsWith('/prioritize')) {
	currentUrl.hostname = canonicalHost;
	currentUrl.pathname = currentUrl.pathname.replace(/^\/prioritize/, '') || '/';
	window.location.replace(currentUrl.toString());
}

createRoot(document.getElementById("root")!).render(
	<>
		<App />
		<Analytics />
	</>,
);
  
