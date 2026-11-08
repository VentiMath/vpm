export type RowData = object;
export type Updater<T> = T | ((previous: T) => T);
export type OnChangeFn<T> = (updater: Updater<T>) => void;
export type SortingState = { id: string; desc: boolean }[];
export type ColumnFiltersState = { id: string; value: unknown }[];
export type RowSelectionState = Record<string, boolean>;
export type VisibilityState = Record<string, boolean>;
export type ExpandedState = true | Record<string, boolean>;
export type PaginationState = { pageIndex: number; pageSize: number };
export type ColumnOrderState = string[];
export type GroupingState = string[];
export type ColumnPinningState = { left?: string[]; right?: string[] };
export type RowPinningState = { top?: string[]; bottom?: string[] };
export type ColumnSizingState = Record<string, number>;
export type ColumnPinningPosition = false | "left" | "right";
export type RowPinningPosition = false | "top" | "bottom";
export interface TableState {
  columnVisibility: VisibilityState;
  columnOrder: ColumnOrderState;
  columnPinning: ColumnPinningState;
  rowPinning: RowPinningState;
  columnFilters: ColumnFiltersState;
  globalFilter: unknown;
  sorting: SortingState;
  grouping: GroupingState;
  expanded: ExpandedState;
  pagination: PaginationState;
  rowSelection: RowSelectionState;
  columnSizing: ColumnSizingState;
  columnSizingInfo: {
    startOffset: number | null;
    startSize: number | null;
    deltaOffset: number | null;
    deltaPercentage: number | null;
    isResizingColumn: string | false;
    columnSizingStart: [string, number][];
  };
}
export interface ReadableAtom<T> {
  get(): T;
  subscribe(listener: (value: T) => void): { unsubscribe(): void };
}
export interface WritableAtom<T> extends ReadableAtom<T> {
  set(updater: Updater<T>): void;
}
export interface ReactivityBindings {
  createWritableAtom<T>(
    value: T,
    options?: { debugName?: string },
  ): WritableAtom<T>;
  createReadonlyAtom<T>(
    compute: () => T,
    options?: { debugName?: string; compare?: (a: T, b: T) => boolean },
  ): ReadableAtom<T>;
  batch<T>(fn: () => T): T;
}
export type TableFeatures = Record<string, unknown> & {
  coreReactivityFeature?: ReactivityBindings;
};
export interface FilterFn<T> {
  (
    row: Row<T>,
    columnId: string,
    value: unknown,
    addMeta: (meta: unknown) => void,
  ): boolean | undefined;
  autoRemove?: (value: unknown, column?: Column<T>) => boolean;
  resolveFilterValue?: (value: unknown, column?: Column<T>) => unknown;
}
export type SortingFn<T> = (a: Row<T>, b: Row<T>, columnId: string) => number;
export type SortFn<T> = SortingFn<T>;
export type AggregationFn<T> = (
  columnId: string,
  leafRows: Row<T>[],
  childRows: Row<T>[],
) => unknown;
export interface CellContext<T, V = unknown> {
  table: Table<T>;
  row: Row<T>;
  column: Column<T, V>;
  cell: Cell<T, V>;
  getValue: () => V;
  renderValue: () => V | null;
}
export interface HeaderContext<T, V = unknown> {
  table: Table<T>;
  column: Column<T, V>;
  header: Header<T, V>;
}
export interface ColumnDef<T, V = unknown> {
  id?: string;
  accessorKey?: (keyof T & string) | (string & {});
  accessorFn?: (row: T, index: number) => V;
  header?: string | ((context: HeaderContext<T, V>) => unknown);
  footer?: string | ((context: HeaderContext<T, V>) => unknown);
  cell?: (context: CellContext<T, V>) => unknown;
  meta?: unknown;
  size?: number;
  minSize?: number;
  maxSize?: number;
  enableHiding?: boolean;
  enablePinning?: boolean;
  enableColumnFilter?: boolean;
  enableGlobalFilter?: boolean;
  enableSorting?: boolean;
  enableMultiSort?: boolean;
  enableGrouping?: boolean;
  filterFn?: string | FilterFn<T>;
  sortingFn?: string | SortingFn<T>;
  sortFn?: string | SortingFn<T>;
  aggregationFn?: string | AggregationFn<T>;
  sortDescFirst?: boolean;
  invertSorting?: boolean;
  sortUndefined?: false | -1 | 1 | "first" | "last";
  getUniqueValues?: (row: T, index: number) => unknown[];
  getGroupingValue?: (row: T, index: number, tableRow: Row<T>) => unknown;
}
export type TableOptions<T> = {
  data: T[];
  columns: ColumnDef<T, any>[];
  features?: TableFeatures;
  defaultColumn?: Partial<ColumnDef<T, any>>;
  initialState?: Partial<TableState>;
  state?: Partial<TableState>;
  atoms?: Partial<{ [K in keyof TableState]: WritableAtom<TableState[K]> }>;
  onStateChange?: OnChangeFn<TableState>;
  getRowId?: (row: T, index: number, parent?: Row<T>) => string;
  renderFallbackValue?: unknown;
  filterFns?: Record<string, FilterFn<T>>;
  sortingFns?: Record<string, SortingFn<T>>;
  sortFns?: Record<string, SortingFn<T>>;
  aggregationFns?: Record<string, AggregationFn<T>>;
  globalFilterFn?: string | FilterFn<T>;
  getColumnCanGlobalFilter?: (column: Column<T>) => boolean;
  enableFilters?: boolean;
  enableColumnFilters?: boolean;
  enableGlobalFilter?: boolean;
  enableSorting?: boolean;
  enableMultiSort?: boolean;
  enableSortingRemoval?: boolean;
  sortDescFirst?: boolean;
  maxMultiSortColCount?: number;
  isMultiSortEvent?: (event: unknown) => boolean;
  enableGrouping?: boolean;
  groupedColumnMode?: false | "reorder" | "remove";
  enableExpanding?: boolean;
  getRowCanExpand?: (row: Row<T>) => boolean;
  getIsRowExpanded?: (row: Row<T>) => boolean;
  enableRowSelection?: boolean | ((row: Row<T>) => boolean);
  enableMultiRowSelection?: boolean | ((row: Row<T>) => boolean);
  enableSubRowSelection?: boolean | ((row: Row<T>) => boolean);
  enableRowPinning?: boolean | ((row: Row<T>) => boolean);
  keepPinnedRows?: boolean;
  enableHiding?: boolean;
  enableColumnPinning?: boolean;
  manualFiltering?: boolean;
  manualSorting?: boolean;
  manualGrouping?: boolean;
  manualExpanding?: boolean;
  manualPagination?: boolean;
  autoResetAll?: boolean;
  autoResetPageIndex?: boolean;
  autoResetExpanded?: boolean;
  paginateExpandedRows?: boolean;
  rowCount?: number;
  pageCount?: number;
} & {
  [K in keyof TableState as `on${Capitalize<K>}Change`]?: OnChangeFn<
    TableState[K]
  >;
} & Partial<
    Record<
      | `get${"Core" | "Filtered" | "Grouped" | "Sorted" | "Expanded" | "Pagination" | "Faceted"}RowModel`
      | "getFacetedUniqueValues"
      | "getFacetedMinMaxValues",
      RowModelFactory<T, any>
    >
  >;
export interface RowModel<T> {
  rows: Row<T>[];
  flatRows: Row<T>[];
  rowsById: Record<string, Row<T>>;
}
export interface Cell<T, V = unknown> {
  id: string;
  row: Row<T>;
  column: Column<T, V>;
  getValue(): V;
  renderValue(): V | null;
  getContext(): CellContext<T, V>;
  getIsGrouped(): boolean;
  getIsPlaceholder(): boolean;
  getIsAggregated(): boolean;
}
export interface Row<T> {
  id: string;
  index: number;
  original: T;
  depth: number;
  parentId?: string;
  subRows: Row<T>[];
  groupingColumnId?: string;
  groupingValue?: unknown;
  getValue<V = unknown>(id: string): V;
  renderValue<V = unknown>(id: string): V | null;
  getUniqueValues(id: string): unknown[];
  getGroupingValue(id: string): unknown;
  getLeafRows(): Row<T>[];
  getParentRow(): Row<T> | undefined;
  getParentRows(): Row<T>[];
  getAllCells(): Cell<T>[];
  getVisibleCells(): Cell<T>[];
  getLeftVisibleCells(): Cell<T>[];
  getCenterVisibleCells(): Cell<T>[];
  getRightVisibleCells(): Cell<T>[];
  getIsGrouped(): boolean;
  getCanExpand(): boolean;
  getIsExpanded(): boolean;
  toggleExpanded(value?: boolean): void;
  getToggleExpandedHandler(): () => void;
  getIsAllParentsExpanded(): boolean;
  getCanSelect(): boolean;
  getCanMultiSelect(): boolean;
  getCanSelectSubRows(): boolean;
  getIsSelected(): boolean;
  getIsSomeSelected(): boolean;
  getIsAllSubRowsSelected(): boolean;
  toggleSelected(value?: boolean, options?: { selectChildren?: boolean }): void;
  getToggleSelectedHandler(): (event: { target: { checked: boolean } }) => void;
  getCanPin(): boolean;
  getIsPinned(): RowPinningPosition;
  getPinnedIndex(): number;
  pin(
    position: RowPinningPosition,
    includeLeaf?: boolean,
    includeParents?: boolean,
  ): void;
  columnFilters: Record<string, boolean>;
  columnFiltersMeta: Record<string, unknown>;
}
export interface Column<T, V = unknown> {
  id: string;
  index: number;
  depth: number;
  columnDef: ColumnDef<T, V>;
  columns: Column<T>[];
  parent?: Column<T>;
  accessorFn?: (row: T, index: number) => V;
  getFlatColumns(): Column<T>[];
  getLeafColumns(): Column<T>[];
  getIsVisible(): boolean;
  getCanHide(): boolean;
  toggleVisibility(value?: boolean): void;
  getToggleVisibilityHandler(): (event: {
    target: { checked: boolean };
  }) => void;
  getIndex(position?: "left" | "center" | "right"): number;
  getIsFirstColumn(position?: "left" | "center" | "right"): boolean;
  getIsLastColumn(position?: "left" | "center" | "right"): boolean;
  getCanPin(): boolean;
  getIsPinned(): ColumnPinningPosition;
  getPinnedIndex(): number;
  pin(position: ColumnPinningPosition): void;
  getSize(): number;
  getStart(position?: "left" | "center" | "right"): number;
  getAfter(position?: "left" | "center" | "right"): number;
  getCanResize(): false;
  getIsResizing(): false;
  resetSize(): void;
  getCanFilter(): boolean;
  getCanGlobalFilter(): boolean;
  getFilterIndex(): number;
  getFilterValue(): unknown;
  getAutoFilterFn(): FilterFn<T>;
  getFilterFn(): FilterFn<T> | undefined;
  setFilterValue(updater: Updater<unknown>): void;
  getCanSort(): boolean;
  getCanMultiSort(): boolean;
  getAutoSortDir(): "asc" | "desc";
  getAutoSortingFn(): SortingFn<T>;
  getAutoSortFn(): SortingFn<T>;
  getSortingFn(): SortingFn<T>;
  getSortFn(): SortingFn<T>;
  getIsSorted(): false | "asc" | "desc";
  getSortIndex(): number;
  getFirstSortDir(): "asc" | "desc";
  getNextSortingOrder(): false | "asc" | "desc";
  clearSorting(): void;
  toggleSorting(desc?: boolean, multi?: boolean): void;
  getToggleSortingHandler(): (event: {
    shiftKey?: boolean;
    persist?: () => void;
  }) => void;
  getCanGroup(): boolean;
  getIsGrouped(): boolean;
  getGroupedIndex(): number;
  toggleGrouping(): void;
  getToggleGroupingHandler(): () => void;
  getAutoAggregationFn(): AggregationFn<T> | undefined;
  getAggregationFn(): AggregationFn<T> | undefined;
  getFacetedRowModel(): RowModel<T>;
  getFacetedUniqueValues(): Map<unknown, number>;
  getFacetedMinMaxValues(): [number, number] | undefined;
}
export interface HeaderGroup<T> {
  id: string;
  depth: number;
  headers: Header<T>[];
}
export interface Header<T, V = unknown> {
  id: string;
  column: Column<T, V>;
  index: number;
  depth: number;
  isPlaceholder: boolean;
  colSpan: number;
  rowSpan: number;
  headerGroup: HeaderGroup<T>;
  subHeaders: Header<T>[];
  getSize(): number;
  getStart(): number;
  getLeafHeaders(): Header<T>[];
  getContext(): HeaderContext<T, V>;
  getResizeHandler(): () => never;
}
type StateMethods = {
  [K in keyof TableState as `set${Capitalize<K>}`]: (
    updater: Updater<TableState[K]>,
  ) => void;
} & {
  [K in keyof TableState as `reset${Capitalize<K>}`]: (
    defaults?: boolean,
  ) => void;
};
type Models<T> = Record<
  `get${"Core" | "Filtered" | "Grouped" | "Sorted" | "Expanded" | "Pagination" | "PreFiltered" | "PreGrouped" | "PreSorted" | "PreExpanded" | "PrePagination" | "Selected" | "PreSelected" | "FilteredSelected" | "GroupedSelected" | ""}RowModel`,
  () => RowModel<T>
>;
export type Table<T> = StateMethods &
  Models<T> & {
    options: TableOptions<T>;
    initialState: TableState;
    store: ReadableAtom<TableState> & { readonly state: TableState };
    optionsStore: WritableAtom<TableOptions<T>>;
    atoms: Partial<{ [K in keyof TableState]: ReadableAtom<TableState[K]> }>;
    baseAtoms: Partial<{
      [K in keyof TableState]: WritableAtom<TableState[K]>;
    }>;
    getState(): TableState;
    setState(updater: Updater<TableState>): void;
    setOptions(updater: Updater<TableOptions<T>>): void;
    reset(): void;
    getColumn(id: string): Column<T> | undefined;
    getRow(id: string, searchAll?: boolean): Row<T>;
    getAllColumns(): Column<T>[];
    getAllFlatColumns(): Column<T>[];
    getAllLeafColumns(): Column<T>[];
    getVisibleLeafColumns(): Column<T>[];
    getVisibleFlatColumns(): Column<T>[];
    getIsAllColumnsVisible(): boolean;
    getIsSomeColumnsVisible(): boolean;
    toggleAllColumnsVisible(value?: boolean): void;
    getToggleAllColumnsVisibilityHandler(): (event: {
      target: { checked: boolean };
    }) => void;
    getIsSomeColumnsPinned(position?: "left" | "right"): boolean;
    getGlobalFilterFn(): FilterFn<T>;
    getGlobalAutoFilterFn(): FilterFn<T>;
    getGlobalFacetedRowModel(): RowModel<T>;
    getGlobalFacetedUniqueValues(): Map<unknown, number>;
    getGlobalFacetedMinMaxValues(): [number, number] | undefined;
    toggleAllRowsExpanded(value?: boolean): void;
    getIsSomeRowsExpanded(): boolean;
    getIsAllRowsExpanded(): boolean;
    getCanSomeRowsExpand(): boolean;
    getExpandedDepth(): number;
    getToggleAllRowsExpandedHandler(): () => void;
    getRowCount(): number;
    getPageCount(): number;
    getPageOptions(): number[];
    getCanPreviousPage(): boolean;
    getCanNextPage(): boolean;
    setPageIndex(updater: Updater<number>): void;
    setPageSize(updater: Updater<number>): void;
    resetPageIndex(defaults?: boolean): void;
    resetPageSize(defaults?: boolean): void;
    previousPage(): void;
    nextPage(): void;
    firstPage(): void;
    lastPage(): void;
    getIsAllRowsSelected(): boolean;
    getIsSomeRowsSelected(): boolean;
    getIsAllPageRowsSelected(): boolean;
    getIsSomePageRowsSelected(): boolean;
    toggleAllRowsSelected(value?: boolean): void;
    toggleAllPageRowsSelected(value?: boolean): void;
    getToggleAllRowsSelectedHandler(): (event: {
      target: { checked: boolean };
    }) => void;
    getToggleAllPageRowsSelectedHandler(): (event: {
      target: { checked: boolean };
    }) => void;
    getTopRows(): Row<T>[];
    getBottomRows(): Row<T>[];
    getCenterRows(): Row<T>[];
    getIsSomeRowsPinned(position?: "top" | "bottom"): boolean;
  } & Record<
    `get${"" | "Left" | "Center" | "Right"}${"Header" | "Footer"}Groups`,
    () => HeaderGroup<T>[]
  > &
  Record<
    `get${"" | "Left" | "Center" | "Right"}${"Flat" | "Leaf"}Headers`,
    () => Header<T>[]
  > &
  Record<`get${"" | "Left" | "Center" | "Right"}TotalSize`, () => number> &
  Record<
    `get${"Left" | "Center" | "Right"}${"" | "Visible"}LeafColumns`,
    () => Column<T>[]
  >;
export function constructTable<T>(options: TableOptions<T>): Table<T>;
export function createTable<T>(options: TableOptions<T>): Table<T>;
export function tableFeatures<F extends TableFeatures>(features: F): F;
export function stockFeatures(): TableFeatures;
export function storeReactivityBindings(): ReactivityBindings;
export function functionalUpdate<T>(value: Updater<T>, previous: T): T;
export function makeStateUpdater<T, K extends keyof TableState>(
  key: K,
  table: Table<T>,
): OnChangeFn<TableState[K]>;
export function flattenBy<T>(
  items: T[],
  children: (item: T) => T[] | undefined,
): T[];
export function createColumnHelper<T>(): {
  accessor<K extends keyof T & string>(
    key: K,
    def: Omit<ColumnDef<T, T[K]>, "accessorFn" | "accessorKey">,
  ): ColumnDef<T, T[K]>;
  accessor<V>(
    fn: (row: T, index: number) => V,
    def: Omit<ColumnDef<T, V>, "accessorFn" | "accessorKey">,
  ): ColumnDef<T, V>;
  display<V = unknown>(def: ColumnDef<T, V>): ColumnDef<T, V>;
  group<V = unknown>(def: ColumnDef<T, V>): ColumnDef<T, V>;
};
export type RowModelFactory<T, R = RowModel<T>> = (
  table: Table<T>,
  columnId?: string,
) => () => R;
export const sortFn_basic: SortingFn<any>;
export const sortFn_text: SortingFn<any>;
export const sortFn_textCaseSensitive: SortingFn<any>;
export const sortFn_alphanumeric: SortingFn<any>;
export const sortFn_alphanumericCaseSensitive: SortingFn<any>;
export const sortFn_datetime: SortingFn<any>;
export const filterFn_includesString: FilterFn<any>;
export const filterFn_includesStringSensitive: FilterFn<any>;
export const filterFn_equalsString: FilterFn<any>;
export const filterFn_arrIncludes: FilterFn<any>;
export const filterFn_arrIncludesAll: FilterFn<any>;
export const filterFn_arrIncludesSome: FilterFn<any>;
export const filterFn_equals: FilterFn<any>;
export const filterFn_weakEquals: FilterFn<any>;
export const filterFn_inNumberRange: FilterFn<any>;
export const aggregationFn_sum: AggregationFn<any>;
export const aggregationFn_count: AggregationFn<any>;
export const aggregationFn_min: AggregationFn<any>;
export const aggregationFn_max: AggregationFn<any>;
export const aggregationFn_mean: AggregationFn<any>;
export const aggregationFn_median: AggregationFn<any>;
export const aggregationFn_unique: AggregationFn<any>;
export const aggregationFn_uniqueCount: AggregationFn<any>;
export const aggregationFn_extent: AggregationFn<any>;
export const columnVisibilityFeature: Readonly<{ name: string }>;
export const columnOrderingFeature: Readonly<{ name: string }>;
export const columnPinningFeature: Readonly<{ name: string }>;
export const rowPinningFeature: Readonly<{ name: string }>;
export const columnFilteringFeature: Readonly<{ name: string }>;
export const globalFilteringFeature: Readonly<{ name: string }>;
export const rowSortingFeature: Readonly<{ name: string }>;
export const columnGroupingFeature: Readonly<{ name: string }>;
export const rowExpandingFeature: Readonly<{ name: string }>;
export const rowPaginationFeature: Readonly<{ name: string }>;
export const rowSelectionFeature: Readonly<{ name: string }>;
export const columnSizingFeature: Readonly<{ name: string }>;
export const columnFacetingFeature: Readonly<{ name: string }>;
export const rowAggregationFeature: Readonly<{ name: string }>;
export function getCoreRowModel<T>(): RowModelFactory<T, RowModel<T>>;
export function createCoreRowModel<T>(): RowModelFactory<T, RowModel<T>>;
export function getFilteredRowModel<T>(): RowModelFactory<T, RowModel<T>>;
export function createFilteredRowModel<T>(): RowModelFactory<T, RowModel<T>>;
export function getGroupedRowModel<T>(): RowModelFactory<T, RowModel<T>>;
export function createGroupedRowModel<T>(): RowModelFactory<T, RowModel<T>>;
export function getSortedRowModel<T>(): RowModelFactory<T, RowModel<T>>;
export function createSortedRowModel<T>(): RowModelFactory<T, RowModel<T>>;
export function getExpandedRowModel<T>(): RowModelFactory<T, RowModel<T>>;
export function createExpandedRowModel<T>(): RowModelFactory<T, RowModel<T>>;
export function getPaginationRowModel<T>(): RowModelFactory<T, RowModel<T>>;
export function createPaginatedRowModel<T>(): RowModelFactory<T, RowModel<T>>;
export function getFacetedRowModel<T>(): RowModelFactory<T, RowModel<T>>;
export function createFacetedRowModel<T>(): RowModelFactory<T, RowModel<T>>;
export function getFacetedUniqueValues<T>(): RowModelFactory<
  T,
  Map<unknown, number>
>;
export function createFacetedUniqueValues<T>(): RowModelFactory<
  T,
  Map<unknown, number>
>;
export function getFacetedMinMaxValues<T>(): RowModelFactory<
  T,
  [number, number] | undefined
>;
export function createFacetedMinMaxValues<T>(): RowModelFactory<
  T,
  [number, number] | undefined
>;
export const sortFns: Record<string, SortingFn<any>>;
export const sortingFns: Record<string, SortingFn<any>>;
export const filterFns: Record<string, FilterFn<any>>;
export const aggregationFns: Record<string, AggregationFn<any>>;
