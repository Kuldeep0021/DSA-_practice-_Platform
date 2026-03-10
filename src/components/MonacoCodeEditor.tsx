"use client";

import { useEffect, useRef } from "react";
import { getErrorMessage } from "@/src/utils/errors";

const MONACO_VERSION = "0.52.2";
const MONACO_VS_BASE = `https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/${MONACO_VERSION}/min/vs`;
const MONACO_LOADER_SRC = `${MONACO_VS_BASE}/loader.min.js`;
const MONACO_LOADER_SCRIPT_ID = "dsa-verse-monaco-loader";

export type MonacoLanguage = "javascript" | "python";

interface MonacoDisposable {
  dispose: () => void;
}

type MonacoTextModel = object;

interface MonacoEditorInstance {
  getValue: () => string;
  setValue: (value: string) => void;
  getModel: () => MonacoTextModel | null;
  onDidChangeModelContent: (listener: () => void) => MonacoDisposable;
  updateOptions: (options: { readOnly?: boolean }) => void;
  dispose: () => void;
}

interface MonacoEditorApi {
  create: (
    element: HTMLElement,
    options: {
      value: string;
      language: MonacoLanguage;
      automaticLayout: boolean;
      minimap: { enabled: boolean };
      fontSize: number;
      tabSize: number;
      theme: string;
      roundedSelection: boolean;
    }
  ) => MonacoEditorInstance;
  setTheme: (themeName: string) => void;
  setModelLanguage: (model: MonacoTextModel, language: MonacoLanguage) => void;
}

interface MonacoNamespace {
  editor: MonacoEditorApi;
}

type RequireFn = ((modules: string[], callback: (...args: unknown[]) => void) => void) & {
  config: (configuration: { paths: Record<string, string> }) => void;
};

declare global {
  interface Window {
    monaco?: MonacoNamespace;
    require?: RequireFn;
  }
}

let monacoPromise: Promise<MonacoNamespace> | null = null;

function ensureMonacoLoaded(): Promise<MonacoNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Monaco can only be loaded in the browser."));
  }

  if (window.monaco) {
    return Promise.resolve(window.monaco);
  }

  if (monacoPromise) {
    return monacoPromise;
  }

  monacoPromise = new Promise<MonacoNamespace>((resolve, reject) => {
    const initialize = () => {
      const requireFn = window.require;
      if (!requireFn || typeof requireFn.config !== "function") {
        reject(new Error("AMD loader is unavailable for Monaco."));
        return;
      }

      requireFn.config({ paths: { vs: MONACO_VS_BASE } });
      requireFn(["vs/editor/editor.main"], () => {
        if (!window.monaco) {
          reject(new Error("Monaco failed to initialize."));
          return;
        }
        resolve(window.monaco);
      });
    };

    const existingScript = document.getElementById(MONACO_LOADER_SCRIPT_ID);
    if (existingScript) {
      initialize();
      return;
    }

    const script = document.createElement("script");
    script.id = MONACO_LOADER_SCRIPT_ID;
    script.src = MONACO_LOADER_SRC;
    script.async = true;
    script.onload = initialize;
    script.onerror = () => reject(new Error("Failed to load Monaco script."));
    document.body.appendChild(script);
  });

  return monacoPromise;
}

interface MonacoCodeEditorProps {
  value: string;
  language: MonacoLanguage;
  onChange: (value: string) => void;
  height?: number;
  readOnly?: boolean;
}

export default function MonacoCodeEditor({
  value,
  language,
  onChange,
  height = 360,
  readOnly = false,
}: MonacoCodeEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const onChangeRef = useRef(onChange);
  const initialValueRef = useRef(value);
  const initialLanguageRef = useRef(language);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let isMounted = true;
    let changeSubscription: MonacoDisposable | null = null;

    const initializeEditor = async () => {
      try {
        const monaco = await ensureMonacoLoaded();
        if (!isMounted || !containerRef.current) {
          return;
        }

        monaco.editor.setTheme("vs-dark");
        const editor = monaco.editor.create(containerRef.current, {
          value: initialValueRef.current,
          language: initialLanguageRef.current,
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 14,
          tabSize: 2,
          theme: "vs-dark",
          roundedSelection: true,
        });

        changeSubscription = editor.onDidChangeModelContent(() => {
          onChangeRef.current(editor.getValue());
        });
        editorRef.current = editor;
      } catch (error: unknown) {
        console.error(getErrorMessage(error, "Failed to initialize Monaco editor."));
      }
    };

    initializeEditor();

    return () => {
      isMounted = false;
      changeSubscription?.dispose();
      editorRef.current?.dispose();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (editor.getValue() !== value) {
      editor.setValue(value);
    }
  }, [value]);

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = window.monaco;
    if (!editor || !monaco) return;

    const model = editor.getModel();
    if (!model) return;
    monaco.editor.setModelLanguage(model, language);
  }, [language]);

  useEffect(() => {
    editorRef.current?.updateOptions({ readOnly });
  }, [readOnly]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height }}
      className="rounded border border-white/10"
    />
  );
}
