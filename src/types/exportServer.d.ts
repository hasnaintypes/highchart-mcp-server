declare module 'highcharts-export-server' {
  export interface ExportServerOptions {
    pool?: {
      minWorkers?: number;
      maxWorkers?: number;
    };
    logging?: {
      level?: number;
    };
    highcharts?: {
      version?: string;
      cdnURL?: string;
      cachePath?: string;
      forceFetch?: boolean;
      coreScripts?: string[];
      moduleScripts?: string[];
      indicatorScripts?: string[];
      customScripts?: string[];
    };
    puppeteer?: {
      args?: string[];
    };
    other?: {
      noLogo?: boolean;
      listenToProcessExits?: boolean;
    };
    export?: {
      type?: 'svg' | 'png' | 'pdf';
      options?: Record<string, unknown>;
      constr?: 'chart' | 'stockChart' | 'mapChart' | 'ganttChart';
      width?: number;
      height?: number;
      scale?: number;
    };
  }

  /** Merged options returned by `setOptions` and consumed by init/startExport. */
  export interface ExportSettings extends ExportServerOptions {
    export: {
      type: 'svg' | 'png' | 'pdf';
      options: Record<string, unknown>;
      constr?: 'chart' | 'stockChart' | 'mapChart' | 'ganttChart';
      width?: number;
      height?: number;
      scale?: number;
    };
  }

  /** Result payload passed to the export callback (`info.result` = base64/SVG). */
  export interface ExportInfo {
    result: string;
  }

  export type ExportCallback = (
    error: Error | false | null | undefined,
    info: ExportInfo,
  ) => void;

  function setOptions(userOptions?: ExportServerOptions, args?: unknown): ExportSettings;
  function initExport(options: ExportSettings): Promise<void>;
  function startExport(settings: ExportSettings, callback: ExportCallback): Promise<void>;
  function killPool(): Promise<void>;

  const exporter: {
    setOptions: typeof setOptions;
    initExport: typeof initExport;
    startExport: typeof startExport;
    killPool: typeof killPool;
  };
  export default exporter;
}
