declare const database: { readonly [type: string]: database.Entry | undefined };
declare namespace database {
  interface Entry {
    readonly source?: 'iana' | 'apache' | 'nginx';
    readonly charset?: string;
    readonly compressible?: boolean;
    readonly extensions?: readonly string[];
  }
}
export = database;
