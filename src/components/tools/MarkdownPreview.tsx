import { useEffect, useMemo, useState } from "react";
import { Marked } from "marked";

const markdown = new Marked({ gfm: true });

// GitHub's markdown palette, light and dark. Background stays transparent so
// the preview sits on the surrounding card.
const palette = {
    light: { fg: "#1f2328", muted: "#59636e", border: "#d1d9e0", link: "#0969da", code: "rgba(129,139,152,0.12)", pre: "#f6f8fa", alt: "#f6f8fa" },
    dark: { fg: "#e6edf3", muted: "#9198a1", border: "#3d444d", link: "#4493f8", code: "rgba(101,108,118,0.2)", pre: "#151b23", alt: "#151b23" },
};

function styles(dark: boolean) {
    const c = dark ? palette.dark : palette.light;
    return `
:root{color-scheme:${dark ? "dark" : "light"}}
body{margin:0;padding:24px 28px;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif;color:${c.fg};background:transparent;overflow-wrap:break-word}
.markdown-body>*:first-child{margin-top:0!important}
h1,h2,h3,h4,h5,h6{margin:24px 0 16px;font-weight:600;line-height:1.25}
h1{font-size:2em;padding-bottom:.3em;border-bottom:1px solid ${c.border}}
h2{font-size:1.5em;padding-bottom:.3em;border-bottom:1px solid ${c.border}}
h3{font-size:1.25em}h4{font-size:1em}h5{font-size:.875em}h6{font-size:.85em;color:${c.muted}}
p,blockquote,ul,ol,dl,table,pre,details{margin:0 0 16px}
a{color:${c.link};text-decoration:none}a:hover{text-decoration:underline}
ul,ol{padding-left:2em}li+li{margin-top:.25em}li:has(>input[type=checkbox]){list-style:none}
input[type=checkbox]{margin:0 .2em .25em -1.4em;vertical-align:middle}
code{font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;font-size:85%;padding:.2em .4em;background:${c.code};border-radius:6px}
pre{padding:16px;overflow:auto;font-size:85%;line-height:1.45;background:${c.pre};border-radius:6px}
pre code{padding:0;background:transparent;font-size:100%}
blockquote{margin-left:0;padding:0 1em;color:${c.muted};border-left:.25em solid ${c.border}}
table{border-collapse:collapse;display:block;width:max-content;max-width:100%;overflow:auto}
th,td{padding:6px 13px;border:1px solid ${c.border}}th{font-weight:600}tr:nth-child(2n){background:${c.alt}}
img{max-width:100%}
hr{height:.25em;margin:24px 0;padding:0;border:0;background:${c.border}}
`;
}

function useDarkMode() {
    const [dark, setDark] = useState(false);
    useEffect(() => {
        const root = document.documentElement;
        const sync = () => setDark(root.classList.contains("dark"));
        sync();
        const observer = new MutationObserver(sync);
        observer.observe(root, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);
    return dark;
}

// Renders inside a sandboxed iframe (no scripts, opaque origin): AI-written
// markdown may carry raw HTML, and none of it can touch the app.
export function MarkdownPreview({ content, title = "Markdown preview" }: { content: string; title?: string }) {
    const dark = useDarkMode();
    const doc = useMemo(() => {
        const html = markdown.parse(content || "", { async: false }) as string;
        return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>${styles(dark)}</style></head><body><article class="markdown-body">${html}</article></body></html>`;
    }, [content, dark]);

    return (
        <iframe
            title={title}
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            srcDoc={doc}
            className="block w-full flex-1 min-h-[400px] bg-transparent"
        />
    );
}
