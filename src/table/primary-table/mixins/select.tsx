import { defineComponent, VNode } from 'vue';
import get from 'lodash/get';
import { PrimaryTableCol } from '../../type';
import primaryTableProps from '../../primary-table-props';
import baseTableProps from '../../base-table-props';
import { prefix } from '../../../config';
import { filterDataByIds } from '../../util/common';
import SelectBox from '../select-box';
import { emitEvent } from '../../../utils/event';
import { Checkbox } from '../../../checkbox';

export default defineComponent({
  name: `${prefix}-primary-table-select`,
  components: { SelectBox, Checkbox },
  props: {
    columns: primaryTableProps.columns,
    data: baseTableProps.data,
    rowKey: baseTableProps.rowKey,
    selectedRowKeys: primaryTableProps.selectedRowKeys,
  },
  emits: ['select-change'],
  computed: {
    reRowKey(): string {
      return this.rowKey || 'id';
    },
    selectColumn(): any {
      return this.columns.find(({ type }) => ['multiple', 'single'].includes(type)) || {};
    },
    canSelectedRows(): Array<Record<string, any>> {
      const { selectColumn } = this;
      return this.data.filter((row, rowIndex): boolean => {
        const disabled = typeof selectColumn.disabled === 'function'
          ? selectColumn.disabled({ row, rowIndex })
          : selectColumn.disabled;
        return !disabled;
      });
    },
    isSelectedAll(): boolean {
      return !!(
        this.canSelectedRows.length
        && this.canSelectedRows.every((record) => this.selectedRowKeys.includes(get(record, this.reRowKey)))
      );
    },
    // 判断 indeterminate
    isSelectedSome(): boolean {
      return (
        !this.isSelectedAll
        && this.canSelectedRows.some((record) => this.selectedRowKeys.includes(get(record, this.reRowKey)))
      );
    },
  },
  methods: {
    // get
    getSelectColumns(columns: Array<PrimaryTableCol>): Array<PrimaryTableCol> {
      return columns.map((c: PrimaryTableCol): PrimaryTableCol => {
        const isSelection = ['multiple', 'single'].includes(c.type);
        const isMultiple = c.type === 'multiple';
        const title = isMultiple ? this.getSelectedHeader() : '';
        return {
          ...c,
          ...(isSelection
            ? {
              render: (h, slotProps: Record<string, any>): VNode => this.renderSelectCell({
                column: c,
                ...slotProps,
              }),
            }
            : {}),
          ...(isSelection ? ({ title }) : {}),
        };
      });
    },
    getSelectedHeader() {
      return () => (
        <Checkbox
          checked={this.isSelectedAll}
          indeterminate={this.isSelectedSome}
          disabled={!this.canSelectedRows.length}
          onChange={this.handleSelectAll}
        />);
    },

    // render
    renderSelectCell({ column = {}, row = {}, rowIndex }: Record<string, any>): VNode {
      const selectBoxProps = {
        checked: this.selectedRowKeys.includes(get(row, this.reRowKey)),
        ...column,
        type: column.type,
        checkProps: typeof column.checkProps === 'function' ? column.checkProps({ row, rowIndex }) : column.checkProps,
        disabled: typeof column.disabled === 'function' ? column.disabled({ row, rowIndex }) : column.disabled,
        rowIndex,
        onChange: (): void => this.handleSelectChange(row),
      };
      return <SelectBox {...selectBoxProps} />;
    },

    // handle：
    handleSelectChange(record: Record<string, any> = {}): void {
      let selectedRowKeys = [...this.selectedRowKeys] as Array<string | number>;
      const { reRowKey } = this;
      const id = get(record, reRowKey);
      const selectedRowIndex = selectedRowKeys.indexOf(id);
      const isSelected = selectedRowIndex !== -1;
      if (this.selectColumn.type === 'multiple') {
        isSelected
          ? selectedRowKeys.splice(selectedRowIndex, 1) // 删除
          : selectedRowKeys.push(id); // 增加
      }
      if (this.selectColumn.type === 'single') {
        selectedRowKeys = !isSelected ? [id] : [];
      }
      emitEvent(this, 'select-change', selectedRowKeys, {
        selectedRowData: filterDataByIds(this.data, selectedRowKeys, reRowKey),
      });
    },
    handleSelectAll(): void {
      const { selectedRowKeys, canSelectedRows, reRowKey } = this;
      const canSelectedRowKeys = canSelectedRows.map((record) => get(record, reRowKey));
      const disabledSelectedRowKeys = selectedRowKeys.filter((id) => !canSelectedRowKeys.includes(id));
      const allIds = (this.isSelectedAll
        ? [...disabledSelectedRowKeys]
        : [...disabledSelectedRowKeys, ...canSelectedRowKeys]) as Array<string | number>;
      const params = {
        selectedRowData: filterDataByIds(this.data, allIds, reRowKey),
      };
      emitEvent(this, 'select-change', allIds, params);
    },
  },
});