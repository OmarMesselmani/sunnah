// filepath: c:\Users\GAMER1\Desktop\sunnah\sunnah-frontend\src\html-to-docx.d.ts
declare module 'html-to-docx' {
  interface Options {
    orientation?: 'portrait' | 'landscape';
    margins?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
      header?: number;
      footer?: number;
      gutter?: number;
    };
    title?: string;
    subject?: string;
    creator?: string;
    keywords?: string[];
    description?: string;
    lastModifiedBy?: string;
    revision?: number;
    createdAt?: Date;
    modifiedAt?: Date;
    headerType?: 'default' | 'first' | 'evenAndOdd';
    header?: string; // HTML string for header
    footerType?: 'default' | 'first' | 'evenAndOdd';
    footer?: string; // HTML string for footer
    font?: string;
    fontSize?: number;
    complexScriptFontSize?: number;
    table?: {
      row?: {
        cantSplit?: boolean;
      };
    };
    pageNumber?: {
      align?: 'left' | 'center' | 'right';
      format?: string; // e.g. 'Page {PAGE_NUMBER} of {TOTAL_PAGES}'
    };
    lineNumber?: boolean;
    numbering?: any; // Refer to library documentation for complex numbering
    decodeUnicode?: boolean;
  }
  const asBlob: (html: string, options?: Options) => Promise<Blob>;
  export { asBlob };
}