import type * as React from "react";
import type {
  SxProps,
  Theme,
} from "@mui/material/styles" with { "resolution-mode": "require" };
import type {
  BoxProps,
  PaperProps,
  TableContainerProps,
  TableProps,
  TableRowProps,
  TableCellProps,
  TextFieldProps,
  CheckboxProps,
  AlertProps,
  LinearProgressProps,
  PaginationProps,
} from "@mui/material" with { "resolution-mode": "require" };
import type {
  Table,
  TableOptions,
  TableState,
  ColumnDef,
  Column,
  Row,
  Cell,
  Updater,
  OnChangeFn,
} from "vtanstack-react-table";
export type MRT_RowData = Record<string, any>;
export type MRT_Row<T = any> = Row<T>;
export type MRT_Cell<T = any, V = unknown> = Cell<T, V>;
export type DropdownOption = string | { label?: string; value?: string };
export type MRT_Icons = Record<string, React.ElementType>;
export type MRT_DensityState = "compact" | "comfortable" | "spacious";
type Context<T> = { table: MRT_TableInstance<T> };
type ColumnContext<T> = Context<T> & { column: MRT_Column<T> };
type RowContext<T> = Context<T> & { row: MRT_Row<T> };
type CellContext<T, V = unknown> = ColumnContext<T> &
  RowContext<T> & { cell: MRT_Cell<T, V>; renderedCellValue?: React.ReactNode };
type Props<T, P> = P | ((context: T) => P);
export interface MRT_ColumnDef<T = any, V = unknown>
  extends Omit<ColumnDef<T, V>, "header" | "footer" | "filterFn"> {
  header: string;
  Cell?:
    | React.ComponentType<CellContext<T, V>>
    | ((context: CellContext<T, V>) => React.ReactNode);
  AggregatedCell?: React.ComponentType<CellContext<T, V>>;
  filterVariant?: "text" | "select" | "multi-select";
  filterSelectOptions?: DropdownOption[];
  filterFn?:
    | string
    | ((
        row: Row<T>,
        columnId: string,
        value: any,
        addMeta: (meta: unknown) => void,
      ) => boolean);
  muiFilterTextFieldProps?: Props<ColumnContext<T>, TextFieldProps>;
  muiTableHeadCellProps?: Props<ColumnContext<T>, TableCellProps>;
  muiTableBodyCellProps?: Props<CellContext<T>, TableCellProps>;
  columnDefType?: "data" | "display";
}
export type MRT_Column<T = any, V = unknown> = Omit<
  Column<T, V>,
  "columnDef"
> & { columnDef: MRT_ColumnDef<T, V> };
export interface MRT_TableState<T = any> extends TableState {
  density: MRT_DensityState;
  showColumnFilters: boolean;
  showGlobalFilter: boolean;
  isFullScreen: boolean;
  isLoading: boolean;
  showProgressBars: boolean;
  showAlertBanner: boolean;
  columnFilterFns: Record<string, string>;
  draggingColumn: MRT_Column<T> | null;
}
export interface MRT_Theme {
  baseBackgroundColor: string;
  menuBackgroundColor: string;
  pinnedRowBackgroundColor?: string;
  pinnedColumnBackgroundColor: string;
}
export interface MRT_TableOptions<T = any>
  extends Omit<TableOptions<T>, "columns" | "initialState" | "state"> {
  columns: MRT_ColumnDef<T, any>[];
  initialState?: Partial<Omit<MRT_TableState<T>, "pagination">> & {
    pagination?: Partial<TableState["pagination"]>;
  };
  state?: Partial<MRT_TableState<T>>;
  onDensityChange?: OnChangeFn<MRT_DensityState>;
  onShowColumnFiltersChange?: OnChangeFn<boolean>;
  onShowGlobalFilterChange?: OnChangeFn<boolean>;
  onIsFullScreenChange?: OnChangeFn<boolean>;
  onColumnFilterFnsChange?: OnChangeFn<Record<string, string>>;
  enableGlobalFilterRankedResults?: boolean;
  /** Show pagination controls and paginate rows. Defaults to true. */
  enablePagination?: boolean;
  enableRowActions?: boolean;
  enableColumnActions?: boolean;
  enableColumnOrdering?: boolean;
  enableColumnFilterModes?: boolean;
  enableFacetedValues?: boolean;
  enableStickyHeader?: boolean;
  enableToolbarInternalActions?: boolean;
  enableTopToolbar?: boolean;
  enableBottomToolbar?: boolean;
  enableDensityToggle?: boolean;
  enableFullScreenToggle?: boolean;
  enableFilterMatchHighlighting?: boolean;
  selectAllMode?: "all" | "page";
  paginationDisplayMode?: "default" | "pages";
  positionGlobalFilter?: "left" | "right";
  positionActionsColumn?: "first" | "last";
  positionPagination?: "top" | "bottom" | "both";
  positionToolbarDropZone?: "top" | "bottom" | "both";
  positionToolbarAlertBanner?: "top" | "bottom";
  displayColumnDefOptions?: Record<string, Partial<MRT_ColumnDef<T>>>;
  icons?: Partial<MRT_Icons>;
  localization?: Record<string, string>;
  mrtTheme?: Props<Theme, Partial<MRT_Theme>>;
  renderRowActionMenuItems?: (
    ctx: RowContext<T> & { closeMenu: () => void },
  ) => React.ReactNode;
  renderRowActions?: (ctx: RowContext<T>) => React.ReactNode;
  renderTopToolbar?: Props<Context<T>, React.ReactNode>;
  renderTopToolbarCustomActions?: (ctx: Context<T>) => React.ReactNode;
  renderBottomToolbarCustomActions?: (ctx: Context<T>) => React.ReactNode;
  muiTopToolbarProps?: Props<Context<T>, BoxProps>;
  muiBottomToolbarProps?: Props<Context<T>, BoxProps>;
  muiTablePaperProps?: Props<Context<T>, PaperProps>;
  muiTableContainerProps?: Props<Context<T>, TableContainerProps>;
  muiTableProps?: Props<Context<T>, TableProps>;
  muiTableBodyProps?: Props<Context<T>, BoxProps>;
  muiTableBodyRowProps?: Props<RowContext<T>, TableRowProps>;
  muiTableHeadCellProps?: Props<ColumnContext<T>, TableCellProps>;
  muiTableBodyCellProps?: Props<CellContext<T>, TableCellProps>;
  muiSelectAllCheckboxProps?: Props<Context<T>, CheckboxProps>;
  muiSelectCheckboxProps?: Props<RowContext<T>, CheckboxProps>;
  muiSearchTextFieldProps?: Props<Context<T>, TextFieldProps>;
  muiFilterTextFieldProps?: Props<ColumnContext<T>, TextFieldProps>;
  muiPaginationProps?: Props<
    Context<T>,
    PaginationProps & {
      rowsPerPageOptions?: number[];
      showRowsPerPage?: boolean;
    }
  >;
  muiToolbarAlertBannerProps?: Props<Context<T>, AlertProps>;
  muiLinearProgressProps?: Props<
    Context<T> & { isTopToolbar?: boolean },
    LinearProgressProps
  >;
}
export type MaterialReactTableProps<T = any> = MRT_TableOptions<T>;
export type MRT_TableInstance<T = any> = Omit<
  Table<T>,
  "options" | "getState"
> & {
  options: MRT_TableOptions<T> & {
    mrtTheme: MRT_Theme;
    enablePagination: boolean;
  };
  getState(): MRT_TableState<T>;
  refs: {
    topToolbarRef: React.RefObject<HTMLDivElement | null>;
    bottomToolbarRef: React.RefObject<HTMLDivElement | null>;
    tableContainerRef: React.RefObject<HTMLDivElement | null>;
    tableHeadRef: React.RefObject<HTMLTableSectionElement | null>;
    tablePaperRef: React.RefObject<HTMLDivElement | null>;
  };
  setDensity: OnChangeFn<MRT_DensityState>;
  setShowColumnFilters: OnChangeFn<boolean>;
  setShowGlobalFilter: OnChangeFn<boolean>;
  setIsFullScreen: OnChangeFn<boolean>;
  setColumnFilterFns: OnChangeFn<Record<string, string>>;
  setDraggingColumn: OnChangeFn<MRT_Column<T> | null>;
};
export function useMaterialReactTable<T = any>(
  options: MRT_TableOptions<T>,
): MRT_TableInstance<T>;
export function MaterialReactTable<T = any>(
  props: MaterialReactTableProps<T> | { table: MRT_TableInstance<T> },
): React.ReactNode;
export function MRT_GlobalFilterTextField<T>(
  props: Context<T> & Omit<TextFieldProps, "value">,
): React.ReactNode;
export function MRT_LinearProgressBar<T>(
  props: Context<T> & LinearProgressProps & { isTopToolbar?: boolean },
): React.ReactNode;
export function MRT_TablePagination<T>(
  props: Context<T> &
    Omit<BoxProps, "position"> & { position?: "top" | "bottom" },
): React.ReactNode;
export function MRT_ToolbarAlertBanner<T>(
  props: Context<T> & AlertProps & { stackAlertBanner?: boolean },
): React.ReactNode;
export function MRT_ToolbarDropZone<T>(
  props: Context<T> & BoxProps,
): React.ReactNode;
export function MRT_ToolbarInternalButtons<T>(
  props: Context<T> & BoxProps,
): React.ReactNode;
export const MRT_FilterFns: Record<
  string,
  (
    row: Row<any>,
    id: string,
    value: any,
    addMeta?: (meta: unknown) => void,
  ) => boolean
>;
