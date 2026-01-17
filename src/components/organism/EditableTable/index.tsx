import * as React from "react";
import {
  useCallback,
  useMemo,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from "react";
import { cn } from "@/lib/utils";

// Types
import {
  EditableTableProps,
  EditableTableRef,
  EditableColumn,
  InternalRow,
  FilterPanelConfig,
} from "./types";

// Re-export types for external use
export type {
  EditableCellType,
  EditableColumn,
  EditableTableProps,
  EditableTableRef,
  CustomExportColumn,
  CustomExportConfig,
  FilterInputType,
  FilterOperatorConfig,
  TableFilterRule,
  FilterDraft,
  NormalizedSelectOption,
  SearchableValueConfig,
  FilterPanelConfig,
  InternalRow,
} from "./types";

// Hooks
import {
  useColumnVisibility,
  useTableSort,
  useTableSelection,
  useTableFilters,
  useTableState,
  useTableExport,
  useBulkEdit,
} from "./hooks";

// Utils
import {
  getColumnById,
  getOperatorsForColumn,
  getSearchableValueConfig,
  buildUniqueValueOptions,
} from "./utils";

// Components
import {
  DeleteConfirmationDialog,
  DetailsDrawer,
  BulkEditDrawer,
  EditableTableHeader,
  EditableTableBody,
  EditableTableVertical,
  EditableTableCell,
} from "./components";

import { EditableTableFiltersPanel } from "./EditableTableFiltersPanel";
import { EditableTableCreateDrawer } from "./EditableTableCreateDrawer";

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function getActionChildren(children: React.ReactNode): {
  left: React.ReactNode[];
  right: React.ReactNode[];
} {
  const left: React.ReactNode[] = [];
  const right: React.ReactNode[] = [];

  React.Children.forEach(children, (child) => {
    if (child === null || child === undefined) {
      return;
    }

    if (
      React.isValidElement<{
        ["data-table-slot"]?: string;
        ["data-editable-table-slot"]?: string;
        slot?: string;
      }>(child)
    ) {
      const slot =
        child.props?.["data-table-slot"] ??
        child.props?.["data-editable-table-slot"] ??
        child.props?.slot;

      if (slot === "right") {
        right.push(child);
        return;
      }
      if (slot && slot !== "left") {
        return;
      }
    }

    left.push(child);
  });

  return { left, right };
}

function getChildrenForSlot(
  children: React.ReactNode,
  slotName: string
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  React.Children.forEach(children, (child) => {
    if (child === null || child === undefined) {
      return;
    }

    if (
      React.isValidElement<{
        ["data-table-slot"]?: string;
        ["data-editable-table-slot"]?: string;
        slot?: string;
      }>(child)
    ) {
      const slot =
        child.props?.["data-table-slot"] ??
        child.props?.["data-editable-table-slot"] ??
        child.props?.slot;

      if (slot === slotName) {
        nodes.push(child);
      }
    }
  });
  return nodes;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const EditableTable = forwardRef<EditableTableRef, EditableTableProps>(
  function EditableTable(props, ref) {
    const {
      columns,
      rows: propsRows,
      isModify = false,
      isVertical = false,
      addButton = false,
      tableId,
      createMode = "drawer",
      onAddClick,
      alwaysEdit = false,
      lastComponent,
      getRowId = (_row, index) => index,
      onSave,
      onDeleteSelected,
      newRowDefaults = {},
      detailsRenderer,
      detailsTitle,
      onOpenDetails,
      onBulkVerifySelected,
      bulkVerifyButtonLabel,
      isBulkVerifyLoading,
      className,
      children,
      onSelectionChange,
      showDeleteAction = true,
      exportFileName,
      customExportConfig,
    } = props;

    // ─────────────────────────────────────────────────────────────────────────
    // Hooks
    // ─────────────────────────────────────────────────────────────────────────

    const tableState = useTableState({
      rows: propsRows,
      columns,
      getRowId,
      newRowDefaults,
      onSave,
      alwaysEdit,
      createMode,
      onOpenDetails,
    });

    const filters = useTableFilters();

    const selection = useTableSelection(onSelectionChange, tableState.rows);

    const visibility = useColumnVisibility(columns, tableId);

    const sort = useTableSort();

    const bulkEdit = useBulkEdit();

    // Get filtered and sorted rows
    const filteredRows = useMemo(() => {
      const filtered = filters.getFilteredRows(tableState.rows, columns);
      return sort.sortRows(filtered, columns);
    }, [tableState.rows, columns, filters, sort]);

    const exportFn = useTableExport(
      columns,
      filteredRows,
      exportFileName,
      customExportConfig
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Computed Values
    // ─────────────────────────────────────────────────────────────────────────

    const showEditActions =
      alwaysEdit || tableState.isEditMode || tableState.hasDirtyRows;
    const hasDetails = Boolean(detailsRenderer || onOpenDetails);
    const hasLast = Boolean(lastComponent);
    const { left: leftActions, right: rightActions } =
      getActionChildren(children);

    const allSelected = useMemo(() => {
      return (
        filteredRows.length > 0 &&
        filteredRows.every((row) => Boolean(selection.selected[row.id]))
      );
    }, [filteredRows, selection.selected]);

    const selectionPayload = useMemo(() => {
      return selection.buildSelectionPayload(tableState.rows);
    }, [selection, tableState.rows]);

    // ─────────────────────────────────────────────────────────────────────────
    // Imperative Handle
    // ─────────────────────────────────────────────────────────────────────────

    useImperativeHandle(
      ref,
      () => ({
        addRows: tableState.addRows,
        prefillCreateRow: tableState.prefillCreateRow,
      }),
      [tableState.addRows, tableState.prefillCreateRow]
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Reset filters when rows change
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
      filters.resetColumnFilters();
      selection.clearSelection();
    }, [propsRows]);

    // ─────────────────────────────────────────────────────────────────────────
    // Delete Handling
    // ─────────────────────────────────────────────────────────────────────────

    const [confirmDialogOpen, setConfirmDialogOpen] = React.useState(false);

    const handleRequestDelete = useCallback(() => {
      if (selection.selectedIds.length > 0) {
        setConfirmDialogOpen(true);
      }
    }, [selection.selectedIds.length]);

    const handleDelete = useCallback(() => {
      const ids = new Set(selection.selectedIds);
      if (ids.size === 0) {
        setConfirmDialogOpen(false);
        return;
      }

      const removed = tableState.rows.filter((r) => ids.has(r.id));
      if (onDeleteSelected) {
        onDeleteSelected(removed.map((r) => r.data));
      }

      tableState.setRows((prev) => prev.filter((r) => !ids.has(r.id)));
      selection.clearSelection();
      setConfirmDialogOpen(false);
    }, [
      selection.selectedIds,
      tableState.rows,
      onDeleteSelected,
      tableState.setRows,
      selection,
    ]);

    // ─────────────────────────────────────────────────────────────────────────
    // Add Button Handling
    // ─────────────────────────────────────────────────────────────────────────

    const handleAddButtonClick = useCallback(() => {
      if (typeof onAddClick === "function") {
        onAddClick();
        return;
      }
      if (createMode === "inline") {
        tableState.addInlineRow();
        return;
      }
      tableState.openCreateDrawer();
    }, [onAddClick, createMode, tableState]);

    // ─────────────────────────────────────────────────────────────────────────
    // Bulk Edit Handling
    // ─────────────────────────────────────────────────────────────────────────

    const handleApplyBulkEdit = useCallback(() => {
      bulkEdit.applyBulkEdit(
        selection.selectedIds,
        columns,
        tableState.setRows,
        () => {}
      );
    }, [bulkEdit, selection.selectedIds, columns, tableState.setRows]);

    // ─────────────────────────────────────────────────────────────────────────
    // Filter Panel Config
    // ─────────────────────────────────────────────────────────────────────────

    const filterPanelConfig = useMemo((): FilterPanelConfig => {
      const selectedColumn = getColumnById(
        filters.filterDraft.columnId,
        columns,
        tableState.rows
      );
      const operatorOptions = getOperatorsForColumn(selectedColumn);
      const selectedOperator = operatorOptions.find(
        (op) => op.value === filters.filterDraft.operator
      );

      const columnOptions = selectedColumn?.options
        ? Array.isArray(selectedColumn.options)
          ? selectedColumn.options.map((o) =>
              typeof o === "string" ? { label: o, value: o } : o
            )
          : []
        : [];

      const shouldUseSelect = columnOptions.length > 0;
      const disableAdd =
        !filters.filterDraft.columnId ||
        !filters.filterDraft.operator ||
        !(filters.filterDraft.value && filters.filterDraft.value.trim()) ||
        (Boolean(selectedOperator?.requiresSecondValue) &&
          !(
            filters.filterDraft.secondaryValue &&
            filters.filterDraft.secondaryValue.trim()
          ));

      const inputType =
        selectedOperator?.inputType === "number"
          ? "number"
          : selectedOperator?.inputType === "date"
          ? "date"
          : "text";

      const searchableValueConfig = getSearchableValueConfig(selectedColumn);
      const showSearchableValueSelect = Boolean(searchableValueConfig);
      const searchableValueOptions = showSearchableValueSelect
        ? buildUniqueValueOptions(selectedColumn?.id, tableState.rows)
        : [];

      const systemColumns = filters.getAvailableSystemColumns(tableState.rows);

      return {
        operatorOptions: operatorOptions.map(({ value, label }) => ({
          value,
          label,
        })),
        showSecondaryValueInput: Boolean(selectedOperator?.requiresSecondValue),
        disableAdd,
        inputType,
        useValueSelect: shouldUseSelect,
        valueOptions: columnOptions,
        systemColumns,
        searchableValueOptions,
        showSearchableValueSelect,
        searchableValueConfig,
      };
    }, [filters.filterDraft, columns, tableState.rows, filters]);

    // ─────────────────────────────────────────────────────────────────────────
    // Render Input Helper (for create drawer and bulk edit)
    // ─────────────────────────────────────────────────────────────────────────

    const renderInput = useCallback(
      (
        row: InternalRow,
        col: EditableColumn,
        config?: {
          onChange?: (
            targetRow: InternalRow,
            targetColumn: EditableColumn,
            value: unknown
          ) => void;
          touchedOverride?: Record<string, boolean>;
        }
      ): React.ReactNode => {
        return (
          <EditableTableCell
            row={row}
            column={col}
            columns={columns}
            touched={
              config?.touchedOverride
                ? { [row.id]: config.touchedOverride }
                : tableState.touched
            }
            onChange={config?.onChange ?? tableState.handleCellChange}
            touchedOverride={config?.touchedOverride}
          />
        );
      },
      [columns, tableState.touched, tableState.handleCellChange]
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Create Drawer Children Enhancement
    // ─────────────────────────────────────────────────────────────────────────

    const enhancedDrawerChildren = useMemo(() => {
      const drawerChildren = getChildrenForSlot(children, "create-drawer");
      return drawerChildren.map((child, index) => {
        if (React.isValidElement(child)) {
          const element = child as React.ReactElement<{
            onCloseParentDrawer?: () => void;
            onOpenParentDrawer?: () => void;
          }>;
          const elementType = element.type;
          const isReactComponent =
            typeof elementType === "function" ||
            (typeof elementType === "object" &&
              elementType !== null &&
              "render" in elementType);

          const additionalProps = isReactComponent
            ? {
                onCloseParentDrawer: tableState.handleCreateCancel,
                onOpenParentDrawer: tableState.openCreateDrawer,
              }
            : {};

          return (
            <React.Fragment key={element.key ?? `create-drawer-child-${index}`}>
              {React.cloneElement(element, additionalProps)}
            </React.Fragment>
          );
        }
        return (
          <React.Fragment key={`create-drawer-child-${index}`}>
            {child}
          </React.Fragment>
        );
      });
    }, [children, tableState.handleCreateCancel, tableState.openCreateDrawer]);

    // ─────────────────────────────────────────────────────────────────────────
    // Vertical Layout
    // ─────────────────────────────────────────────────────────────────────────

    if (isVertical) {
      return (
        <React.Fragment>
          <EditableTableVertical
            columns={columns}
            visibleColumns={visibility.visibleColumns}
            visibleColumnIds={visibility.visibleColumnIds}
            rows={filteredRows}
            touched={tableState.touched}
            isModify={isModify}
            isEditMode={tableState.isEditMode}
            alwaysEdit={alwaysEdit}
            addButton={addButton}
            hasLast={hasLast}
            showEditActions={showEditActions}
            lastComponent={lastComponent}
            leftActions={leftActions}
            rightActions={rightActions}
            className={className}
            getRowId={getRowId}
            onExportCsv={exportFn.handleExportCsv}
            onExportExcel={exportFn.handleExportExcel}
            onColumnVisibilityChange={visibility.handleColumnVisibilityChange}
            onShowAllColumns={visibility.handleShowAllColumns}
            onShowDefaultColumns={visibility.handleShowDefaultColumns}
            onToggleEditMode={tableState.toggleEditMode}
            onCellChange={tableState.handleCellChange}
            onAddClick={handleAddButtonClick}
            onCancel={tableState.handleCancel}
            onSave={tableState.handleSave}
          />
          <EditableTableFiltersPanel
            open={filters.filterDrawerOpen}
            columns={columns}
            activeFilters={filters.activeFilters}
            filterDraft={filters.filterDraft}
            operatorOptions={filterPanelConfig.operatorOptions}
            selectedOperatorValue={filters.filterDraft.operator ?? ""}
            showSecondaryValueInput={filterPanelConfig.showSecondaryValueInput}
            disableAdd={filterPanelConfig.disableAdd}
            inputType={filterPanelConfig.inputType}
            useValueSelect={filterPanelConfig.useValueSelect}
            valueOptions={filterPanelConfig.valueOptions}
            systemColumns={filterPanelConfig.systemColumns}
            systemDateRanges={filters.systemDateRanges}
            searchableValueOptions={filterPanelConfig.searchableValueOptions}
            showSearchableValueSelect={
              filterPanelConfig.showSearchableValueSelect
            }
            searchableValueConfig={filterPanelConfig.searchableValueConfig}
            onDrawerOpenChange={filters.handleFilterDrawerChange}
            onFilterDraftChange={filters.handleFilterDraftChange}
            onAddFilter={filters.addFilter}
            onRemoveFilter={filters.removeFilter}
            onClearFilters={filters.clearFilters}
            onSystemDateRangeChange={filters.handleSystemDateRangeChange}
            formatFilterLabel={(filter) =>
              filters.formatFilterLabel(filter, columns)
            }
          />
          {addButton && (
            <EditableTableCreateDrawer
              open={tableState.createDrawerOpen}
              columns={columns}
              pendingRow={tableState.createRow}
              createTouched={tableState.createTouched}
              drawerChildren={enhancedDrawerChildren}
              disableSave={
                !tableState.createRow ||
                Object.keys(tableState.validateRowData(tableState.createRow!))
                  .length > 0
              }
              onOpenChange={tableState.handleCreateDrawerChange}
              onCancel={tableState.handleCreateCancel}
              onSave={tableState.handleCreateSave}
              onCellChange={tableState.handleCreateCellChange}
              renderInput={renderInput}
            />
          )}
        </React.Fragment>
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Horizontal Layout
    // ─────────────────────────────────────────────────────────────────────────

    const isFlexLayout = className?.includes("flex flex-col");

    return (
      <div
        data-slot="table-wrapper"
        className={cn("relative w-full rounded-lg bg-white", className)}
      >
        <DeleteConfirmationDialog
          open={confirmDialogOpen}
          onOpenChange={setConfirmDialogOpen}
          targetLabel={selection.getDeletionTargetLabel()}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDialogOpen(false)}
        />

        <EditableTableHeader
          columns={columns}
          visibleColumnIds={visibility.visibleColumnIds}
          showEditActions={showEditActions}
          anySelected={selection.anySelected}
          selectedCount={selection.selectedCount}
          isModify={isModify}
          alwaysEdit={alwaysEdit}
          isEditMode={tableState.isEditMode}
          hasErrors={tableState.hasErrors}
          addButton={addButton}
          showDeleteAction={showDeleteAction}
          isBulkVerifyLoading={isBulkVerifyLoading}
          bulkVerifyButtonLabel={bulkVerifyButtonLabel}
          onBulkVerifySelected={onBulkVerifySelected}
          selectionPayload={selectionPayload}
          leftActions={leftActions}
          rightActions={rightActions}
          onExportCsv={exportFn.handleExportCsv}
          onExportExcel={exportFn.handleExportExcel}
          onColumnVisibilityChange={visibility.handleColumnVisibilityChange}
          onShowAllColumns={visibility.handleShowAllColumns}
          onShowDefaultColumns={visibility.handleShowDefaultColumns}
          onDeselectAll={() => selection.toggleSelectAll(false, filteredRows)}
          onToggleEditMode={tableState.toggleEditMode}
          onAddClick={handleAddButtonClick}
          onOpenBulkEdit={bulkEdit.openBulkEditDrawer}
          onRequestDelete={handleRequestDelete}
          onCancel={tableState.handleCancel}
          onSave={tableState.handleSave}
        />

        <div
          className={cn(
            "w-full overflow-auto",
            isFlexLayout ? "flex-1 min-h-0" : "max-h-[calc(100vh-300px)]"
          )}
        >
          <table
            data-slot="table"
            className={cn("w-full caption-bottom text-sm relative")}
          >
            <EditableTableBody
              columns={columns}
              visibleColumns={visibility.visibleColumns}
              rows={filteredRows}
              allRows={tableState.rows}
              selected={selection.selected}
              touched={tableState.touched}
              isModify={isModify}
              isEditMode={tableState.isEditMode}
              hasDetails={hasDetails}
              hasLast={hasLast}
              lastComponent={lastComponent}
              allSelected={allSelected}
              sortColumn={sort.sortColumn}
              sortDirection={sort.sortDirection}
              columnFilterOpen={filters.columnFilterOpen}
              columnFilterSelectedValues={filters.columnFilterSelectedValues}
              columnFilterSearchQueries={filters.columnFilterSearchQueries}
              columnFilterDateRanges={filters.columnFilterDateRanges}
              columnFilterSelectedDates={filters.columnFilterSelectedDates}
              onToggleSelectAll={(value) =>
                selection.toggleSelectAll(value, filteredRows)
              }
              onToggleRowSelection={selection.toggleRowSelection}
              onCellChange={tableState.handleCellChange}
              onOpenDetails={tableState.openDetails}
              onSort={sort.handleSort}
              onColumnFilterOpenChange={filters.handleColumnFilterOpenChange}
              onColumnFilterSearchChange={
                filters.handleColumnFilterSearchChange
              }
              onColumnFilterValueToggle={filters.handleColumnFilterValueToggle}
              onColumnFilterDateRangeChange={
                filters.handleColumnFilterDateRangeChange
              }
              onColumnFilterDateChange={filters.handleColumnFilterDateChange}
              onColumnFilterClear={filters.handleColumnFilterClear}
            />
          </table>
        </div>

        <DetailsDrawer
          open={tableState.drawerOpen}
          onOpenChange={tableState.closeDetails}
          row={tableState.drawerRow}
          title={detailsTitle}
          detailsRenderer={detailsRenderer}
        />

        <EditableTableFiltersPanel
          open={filters.filterDrawerOpen}
          columns={columns}
          activeFilters={filters.activeFilters}
          filterDraft={filters.filterDraft}
          operatorOptions={filterPanelConfig.operatorOptions}
          selectedOperatorValue={filters.filterDraft.operator ?? ""}
          showSecondaryValueInput={filterPanelConfig.showSecondaryValueInput}
          disableAdd={filterPanelConfig.disableAdd}
          inputType={filterPanelConfig.inputType}
          useValueSelect={filterPanelConfig.useValueSelect}
          valueOptions={filterPanelConfig.valueOptions}
          systemColumns={filterPanelConfig.systemColumns}
          systemDateRanges={filters.systemDateRanges}
          searchableValueOptions={filterPanelConfig.searchableValueOptions}
          showSearchableValueSelect={
            filterPanelConfig.showSearchableValueSelect
          }
          searchableValueConfig={filterPanelConfig.searchableValueConfig}
          onDrawerOpenChange={filters.handleFilterDrawerChange}
          onFilterDraftChange={filters.handleFilterDraftChange}
          onAddFilter={filters.addFilter}
          onRemoveFilter={filters.removeFilter}
          onClearFilters={filters.clearFilters}
          onSystemDateRangeChange={filters.handleSystemDateRangeChange}
          formatFilterLabel={(filter) =>
            filters.formatFilterLabel(filter, columns)
          }
        />

        {addButton && (
          <EditableTableCreateDrawer
            open={tableState.createDrawerOpen}
            columns={columns}
            pendingRow={tableState.createRow}
            createTouched={tableState.createTouched}
            drawerChildren={enhancedDrawerChildren}
            disableSave={
              !tableState.createRow ||
              Object.keys(tableState.validateRowData(tableState.createRow!))
                .length > 0
            }
            onOpenChange={tableState.handleCreateDrawerChange}
            onCancel={tableState.handleCreateCancel}
            onSave={tableState.handleCreateSave}
            onCellChange={tableState.handleCreateCellChange}
            renderInput={renderInput}
          />
        )}

        <BulkEditDrawer
          open={bulkEdit.bulkEditDrawerOpen}
          onOpenChange={bulkEdit.handleBulkEditDrawerOpenChange}
          selectionCount={selection.selectedCount}
          editableColumns={bulkEdit.getEditableColumns(columns)}
          bulkEditValues={bulkEdit.bulkEditValues}
          onValueChange={bulkEdit.handleBulkEditValueChange}
          onApply={handleApplyBulkEdit}
          onCancel={bulkEdit.closeBulkEditDrawer}
          renderInput={renderInput}
        />
      </div>
    );
  }
);

// Default export for backwards compatibility
export default EditableTable;
