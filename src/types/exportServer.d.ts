declare module 'highcharts-export-server' {
  export interface ExportServerOptions {
    pool?: {
      minWorkers?: number;
      maxWorkers?: number;
    };
    logging?: {
      level?: number;
    };
    puppeteer?: {
      args?: string[];
    };
    listenToProcessExits?: boolean;
    noLogo?: boolean;
  }

  export interface ExportSettings {
    export: {
      type: 'svg' | 'png' | 'pdf';
      options: Record<string, unknown>;
      constr?: 'chart' | 'stockChart' | 'mapChart' | 'ganttChart';
      width?: number;
      height?: number;
      scale?: number;
    };
  }

  export interface ExportResult {
    result: string;
  }

  export type ExportCallback = (
    error: Error | false,
    result: ExportResult,
  ) => void;

  function setOptions(options: ExportServerOptions): void;
  function initExport(callback: (error?: Error) => void): void;
  function startExport(settings: ExportSettings, callback: ExportCallback): void;
  function killPool(): void;

  export default {
    setOptions,
    initExport,
    startExport,
    killPool,
  };
}
